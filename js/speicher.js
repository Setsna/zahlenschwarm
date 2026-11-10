/* Zahlenschwarm: Speicher im Browser.
   - Alles bleibt in localStorage dieses Browsers, je Kind ein Eintrag.
   - Welches Kind in diesem Tab übt, steht in sessionStorage.
   - ?vorschau=N zeigt einen Beispielstand mit N sicheren Aufgaben und speichert nichts. */
(() => {
  'use strict';
  const C = ZS.config;
  const KEY = `${C.speicher.schluessel}-v${C.speicher.schema}`;
  const WER = C.speicher.werSchluessel;

  const neueId = () => 'k' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const istObjekt = x => x !== null && typeof x === 'object' && !Array.isArray(x);

  /* Ein Kind. Die Felder für Aufgaben, Stempel usw. werden ab Etappe 2 gefüllt. */
  const leeresKind = name => ({ id: neueId(), name, angelegt: Date.now(), aufgaben: {}, stempel: {}, zeit: {}, schwarm: {} });
  const normalisiere = k => ({
    id: String(k.id),
    name: String(k.name).trim().slice(0, C.nameMaxLaenge),
    angelegt: Number(k.angelegt) || Date.now(),
    aufgaben: istObjekt(k.aufgaben) ? k.aufgaben : {},
    stempel: istObjekt(k.stempel) ? k.stempel : {},
    zeit: istObjekt(k.zeit) ? k.zeit : {},
    schwarm: istObjekt(k.schwarm) ? k.schwarm : {}
  });
  const kindGueltig = k => istObjekt(k) && typeof k.id === 'string' && k.id && typeof k.name === 'string' && k.name.trim();

  let kinder = [];
  let aktivId = null;
  /* Konnte ein vorhandener Stand nicht gelesen werden, speichert die Seite nichts,
     damit der alte Stand nicht überschrieben wird. */
  let ladeFehler = false;
  let letzterFehler = null;
  let persistGefragt = false;

  /* ---------- Vorschau ---------- */
  const vorschauWert = new URLSearchParams(location.search).get('vorschau');
  const istVorschau = vorschauWert !== null && /^\d{1,3}$/.test(vorschauWert);

  function vorschauKind(n) {
    const k = leeresKind('Vorschau');
    k.id = 'vorschau';
    const { min, max } = C.faktoren;
    let zaehler = 0;
    for (const reihe of C.reihenFolge) {
      for (let f = min; f <= max && zaehler < n; f++, zaehler++) {
        /* Vorläufiges Format, wird in Etappe 2/3 festgelegt. */
        k.aufgaben[`mal:${f}:${reihe}`] = { box: 4, richtig: 3, falsch: 0 };
        k.schwarm[`mal:${f}:${reihe}`] = Date.now();
      }
    }
    return k;
  }

  /* ---------- Laden ---------- */
  function laden() {
    if (istVorschau) {
      const n = Math.min(Number(vorschauWert), (C.faktoren.max - C.faktoren.min + 1) * C.reihenFolge.length);
      kinder = [vorschauKind(n)];
      aktivId = 'vorschau';
      return;
    }
    let roh = null;
    try { roh = localStorage.getItem(KEY); } catch (e) { letzterFehler = e; return; }
    if (roh === null) return;
    try {
      const daten = JSON.parse(roh);
      if (!istObjekt(daten) || !Array.isArray(daten.kinder)) throw new Error('Aufbau unbekannt');
      kinder = daten.kinder.filter(kindGueltig).map(normalisiere);
    } catch (e) {
      ladeFehler = true;
      letzterFehler = e;
      return;
    }
    let gewaehlt = null;
    try { gewaehlt = sessionStorage.getItem(WER); } catch (e) { /* dann fragt die Seite nach */ }
    const k = kinder.length === 1 ? kinder[0] : kinder.find(x => x.id === gewaehlt);
    if (k) aktivId = k.id;
  }

  /* ---------- Speichern ---------- */
  /* Gibt true zurück, wenn gespeichert wurde (oder in der Vorschau nichts zu tun ist). */
  function speichern() {
    if (istVorschau) return true;
    if (ladeFehler) return false;
    try {
      localStorage.setItem(KEY, JSON.stringify({ schema: C.speicher.schema, kinder }));
    } catch (e) {
      letzterFehler = e;
      return false;
    }
    letzterFehler = null;
    if (!persistGefragt) {
      persistGefragt = true;
      /* Bittet den Browser, die Daten zu behalten. Ob er zustimmt, entscheidet er selbst. */
      try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {}); } catch (e) { /* Normalfall bleibt */ }
    }
    return true;
  }

  /* ---------- Kinder ---------- */
  const gleicherName = (a, b) => a.trim().toLocaleLowerCase('de') === b.trim().toLocaleLowerCase('de');

  /* Prüft einen Vornamen. Gibt null zurück, wenn er passt, sonst einen Hinweis für das Kind. */
  function namePruefen(name, ausserId = null) {
    const n = String(name || '').trim();
    if (!n) return 'Schreib bitte deinen Vornamen.';
    if (n.length > C.nameMaxLaenge) return `Der Name ist zu lang. Höchstens ${C.nameMaxLaenge} Zeichen.`;
    if (kinder.some(k => k.id !== ausserId && gleicherName(k.name, n))) return 'Diesen Namen gibt es hier schon. Nimm zum Beispiel noch den ersten Buchstaben vom Nachnamen dazu.';
    return null;
  }

  function anlegen(name) {
    if (istVorschau) return { ok: false, grund: 'In der Vorschau kann man keine Kinder anlegen.' };
    const grund = namePruefen(name);
    if (grund) return { ok: false, grund };
    const k = leeresKind(String(name).trim());
    kinder.push(k);
    waehlen(k.id);
    return { ok: speichern(), kind: k };
  }

  function waehlen(id) {
    if (!kinder.some(k => k.id === id)) return false;
    aktivId = id;
    if (!istVorschau) { try { sessionStorage.setItem(WER, id); } catch (e) { /* nur dieser Tab */ } }
    return true;
  }

  function abmelden() {
    aktivId = null;
    try { sessionStorage.removeItem(WER); } catch (e) { /* egal */ }
  }

  function aktiv() { return kinder.find(k => k.id === aktivId) || null; }

  laden();

  ZS.speicher = {
    KEY,
    istVorschau,
    get ladeFehler() { return ladeFehler; },
    get letzterFehler() { return letzterFehler; },
    kinder: () => kinder.slice(),
    aktiv,
    namePruefen,
    anlegen,
    waehlen,
    abmelden,
    speichern
  };
})();
