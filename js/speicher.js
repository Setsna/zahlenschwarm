/* Zahlenschwarm: Speicher im Browser.
   - Je Code ein eigener Eintrag in localStorage: zahlenschwarm-v2.<code>.
     So sieht auf einem geteilten Gerät kein Kind den Stand eines anderen.
   - Mit welchem Code in diesem Tab geübt wird, steht in sessionStorage.
   - zahlenschwarm-v2.<code>.abgleich hält den Stand, den dieses Gerät zuletzt mit der
     Datenbank abgeglichen hat (js/cloud.js, js/mische.js). Er liegt nur auf dem Gerät.
   - Der alte Stand zahlenschwarm-v1 (Liste aller Kinder) wird nicht gelesen und nicht verändert.
   - ?vorschau=N zeigt einen Beispielstand mit N sicheren Aufgaben und speichert nichts. */
(() => {
  'use strict';
  const C = ZS.config;
  const BASIS = `${C.speicher.schluessel}-v${C.speicher.schema}`;
  const WER = C.speicher.werSchluessel;
  const schluesselFuer = code => `${BASIS}.${code}`;

  const abgleichSchluessel = code => `${schluesselFuer(code)}.abgleich`;

  /* Code wie beim Perlentaucher: feste Länge, nur die Zeichen aus config.js (ohne 0, 1, I, L, O).
     Gibt den Code zurück oder null. */
  function codePruefen(roh) {
    const code = String(roh || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    return code.length === C.speicher.codeLaenge && [...code].every(z => C.speicher.codeZeichen.includes(z)) ? code : null;
  }

  const istObjekt = x => x !== null && typeof x === 'object' && !Array.isArray(x);

  /* Der Stand eines Kindes */
  const klasseOk = n => C.klassen.includes(Number(n)) ? Number(n) : C.klasseStandard;
  const leeresKind = (name, klasse = C.klasseStandard) => ({ name, klasse: klasseOk(klasse), angelegt: Date.now(), aufgaben: {}, stempel: {}, zeit: {}, schwarm: {}, geaendert: Date.now() });
  const normalisiere = k => ({
    name: String(k.name).trim().slice(0, C.nameMaxLaenge),
    klasse: klasseOk(k.klasse),
    angelegt: Number(k.angelegt) || Date.now(),
    aufgaben: istObjekt(k.aufgaben) ? k.aufgaben : {},
    stempel: istObjekt(k.stempel) ? k.stempel : {},
    zeit: istObjekt(k.zeit) ? k.zeit : {},
    schwarm: istObjekt(k.schwarm) ? k.schwarm : {},
    geaendert: Number(k.geaendert) || Number(k.angelegt) || Date.now()
  });
  const kindGueltig = k => istObjekt(k) && typeof k.name === 'string' && k.name.trim();

  let kind = null;
  let aktivCode = null;
  /* Konnte ein vorhandener Stand nicht gelesen werden, wird er nicht geöffnet
     und nicht überschrieben. */
  let ladeFehler = false;
  let letzterFehler = null;
  let persistGefragt = false;
  /* Zählt jede Änderung des Stands. Daran erkennt der Abgleich, ob währenddessen weitergeübt wurde. */
  let fassung = 0;
  const lauscher = [];

  /* ---------- Vorschau ---------- */
  const vorschauWert = new URLSearchParams(location.search).get('vorschau');
  const istVorschau = vorschauWert !== null && /^\d{1,3}$/.test(vorschauWert);
  /* ?vorschau=N&klasse=4 zeigt den Stand eines Kindes aus Klasse 4 */
  const vorschauKlasse = new URLSearchParams(location.search).get('klasse');

  function vorschauKind(n) {
    const k = leeresKind('Vorschau', vorschauKlasse);
    const { min, max } = C.faktoren;
    let zaehler = 0;
    for (const reihe of C.reihenFolge) {
      for (let f = min; f <= max && zaehler < n; f++, zaehler++) {
        /* Vorläufiges Format, wird in Etappe 2/3 festgelegt. */
        k.aufgaben[`mal:${f}:${reihe}`] = { box: 4, faelligTag: ZS.lernstand.tagNr() + 7, richtig: 3, falsch: 0 };
        k.schwarm[`mal:${f}:${reihe}`] = Date.now();
      }
    }
    return k;
  }

  /* ---------- Lesen ---------- */
  /* Liest den Stand zu einem Code. Ergebnis: { kind } (null = noch kein Stand) oder { fehler }. */
  function lesen(code) {
    let roh = null;
    try { roh = localStorage.getItem(schluesselFuer(code)); } catch (e) { return { fehler: e }; }
    if (roh === null) return { kind: null };
    try {
      const daten = JSON.parse(roh);
      if (!kindGueltig(daten)) throw new Error('Aufbau unbekannt');
      return { kind: normalisiere(daten) };
    } catch (e) { return { fehler: e }; }
  }

  /* Gibt es auf diesem Gerät schon einen Stand zu dem Code (auch einen unlesbaren)? */
  function vorhanden(roh) {
    const code = codePruefen(roh);
    if (!code || istVorschau) return false;
    try { return localStorage.getItem(schluesselFuer(code)) !== null; } catch (e) { return false; }
  }

  function merkeWer(code) {
    try { code ? sessionStorage.setItem(WER, code) : sessionStorage.removeItem(WER); } catch (e) { /* nur dieser Tab */ }
  }

  function laden() {
    if (istVorschau) {
      const n = Math.min(Number(vorschauWert), (C.faktoren.max - C.faktoren.min + 1) * C.reihenFolge.length);
      kind = vorschauKind(n);
      aktivCode = 'VORSCHAU';
      return;
    }
    let gewaehlt = null;
    try { gewaehlt = sessionStorage.getItem(WER); } catch (e) { /* dann fragt die Seite nach dem Code */ }
    const code = codePruefen(gewaehlt);
    if (!code) return;
    const r = lesen(code);
    if (r.fehler) { ladeFehler = true; letzterFehler = r.fehler; return; }
    if (r.kind) { kind = r.kind; aktivCode = code; } else merkeWer(null);
  }

  /* ---------- Speichern ---------- */
  /* Gibt true zurück, wenn gespeichert wurde (oder in der Vorschau nichts zu tun ist). */
  function ablegen() {
    try {
      localStorage.setItem(schluesselFuer(aktivCode), JSON.stringify({ schema: C.speicher.schema, ...kind }));
    } catch (e) {
      letzterFehler = e;
      return false;
    }
    letzterFehler = null;
    return true;
  }

  function speichern() {
    if (istVorschau) return true;
    if (!kind || !aktivCode) return false;
    kind.geaendert = Date.now();
    fassung++;
    if (!ablegen()) return false;
    /* Das Cloud-Modul hört hier mit und schreibt nach einer kurzen Pause in die Datenbank. */
    for (const f of lauscher.slice()) { try { f(); } catch (e) { /* Speichern auf dem Gerät hat geklappt */ } }
    if (!persistGefragt) {
      persistGefragt = true;
      /* Bittet den Browser, die Daten zu behalten. Ob er zustimmt, entscheidet er selbst. */
      try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {}); } catch (e) { /* Normalfall bleibt */ }
    }
    return true;
  }

  /* ---------- Öffnen und Abmelden ---------- */
  /* Prüft einen Vornamen. Gibt null zurück, wenn er passt, sonst einen Hinweis für das Kind. */
  function namePruefen(name) {
    const n = String(name || '').trim();
    if (!n) return 'Schreib bitte deinen Vornamen.';
    if (n.length > C.nameMaxLaenge) return `Der Name ist zu lang. Höchstens ${C.nameMaxLaenge} Zeichen.`;
    return null;
  }

  /* Öffnet den Stand zu einem Code.
     - Gibt es ihn schon, wird er geladen. Ein mitgegebener Name ersetzt den gespeicherten
       (ab der Anmeldung kommt der Name aus dem Konto).
     - Gibt es ihn noch nicht, wird er mit Name und Klasse neu angelegt.
     Ergebnis: { ok, kind, neu } oder { ok: false, grund, feld }. ok = false mit kind heißt:
     geöffnet, aber das Speichern hat nicht geklappt. */
  function oeffnen(roh, konto = {}) {
    if (istVorschau) return { ok: false, grund: 'In der Vorschau kann man sich nicht anmelden.' };
    const code = codePruefen(roh);
    if (!code) return { ok: false, grund: `Dein Code hat ${C.speicher.codeLaenge} Zeichen. Schau noch einmal nach.`, feld: 'code' };
    const r = lesen(code);
    if (r.fehler) { ladeFehler = true; letzterFehler = r.fehler; return { ok: false, grund: 'unlesbar', feld: 'code' }; }
    ladeFehler = false;
    let k = r.kind;
    const neu = !k;
    let schreiben = neu;
    if (neu) {
      const grund = namePruefen(konto.name);
      if (grund) return { ok: false, grund, feld: 'name' };
      if (!C.klassen.includes(Number(konto.klasse))) return { ok: false, grund: 'Tippe bitte auf deine Klasse.', feld: 'klasse' };
      k = leeresKind(String(konto.name).trim(), konto.klasse);
    } else if (konto.name && !namePruefen(konto.name) && String(konto.name).trim() !== k.name) {
      k.name = String(konto.name).trim();
      schreiben = true;
    }
    kind = k;
    aktivCode = code;
    merkeWer(code);
    return { ok: schreiben ? speichern() : true, kind: k, neu };
  }

  /* Der Stand bleibt auf dem Gerät liegen, nur dieser Tab vergisst den Code. */
  function abmelden() {
    kind = null;
    aktivCode = null;
    if (!istVorschau) merkeWer(null);
  }

  /* ---------- Lernstand je Aufgabe ---------- */
  /* Merkt eine Antwort: Stufe und Fälligkeit (js/lernstand.js), wie oft richtig/falsch, wann zuletzt,
     letzte Denkzeit, ob ein Tipp genommen wurde. Gibt zurück, ob gespeichert wurde. */
  function antwortMerken(id, { richtig, zuegig, denkSek, tipp }) {
    const k = aktiv();
    if (!k) return false;
    const L = ZS.lernstand, heute = L.tagNr();
    const e = L.eintrag(k, id, heute);
    const n = L.bewerten(e, { richtig, zuegig, tipp }, heute);
    n.richtig = e.richtig + (richtig ? 1 : 0);
    n.falsch = e.falsch + (richtig ? 0 : 1);
    n.zuletzt = Date.now();
    n.denkSek = denkSek;
    n.tipp = !!tipp;
    k.aufgaben[id] = n;
    /* Neue Fische und Stempel (js/tauchbuch.js). Die Üben-Ansicht zeigt sie nach der Antwort. */
    const neu = ZS.tauchbuch ? ZS.tauchbuch.nachtragen(k) : { fische: [], stempel: [] };
    return { ok: speichern(), ...neu };
  }

  /* Fische und Stempel für Stände von vor Etappe 5 (und für die Vorschau) nachtragen */
  function nachtragen() {
    const k = aktiv();
    if (!k || !ZS.tauchbuch) return;
    const neu = ZS.tauchbuch.nachtragen(k);
    if (neu.fische.length || neu.stempel.length) speichern();
  }

  /* Lernzeit je Bereich (mal, geteilt, plusminus) und für heute. Sekunden. */
  function zeitMerken(bereich, sek) {
    const k = aktiv();
    if (!k || !(sek > 0)) return false;
    const heute = ZS.lernstand.tagNr();
    k.zeit[bereich] = (Number(k.zeit[bereich]) || 0) + sek;
    if (k.zeit.tag !== heute) { k.zeit.tag = heute; k.zeit.heute = 0; }
    k.zeit.heute = (Number(k.zeit.heute) || 0) + sek;
    return speichern();
  }
  const heuteSek = k => k.zeit.tag === ZS.lernstand.tagNr() ? Number(k.zeit.heute) || 0 : 0;

  /* Selbsteinschätzung zu einem Stempel: leicht, gut oder wackelig */
  function gefuehlMerken(key, wert) {
    const k = aktiv();
    if (!k || !k.stempel[key] || !['leicht', 'gut', 'wackelig'].includes(wert)) return false;
    k.stempel[key] = { ...k.stempel[key], gefuehl: wert };
    return speichern();
  }

  /* Klasse wechseln (nur im Tauchbuch). Lernstand, Fische und Stempel bleiben. */
  function klasseSetzen(n) {
    const k = aktiv();
    if (!k || istVorschau || !C.klassen.includes(Number(n))) return false;
    k.klasse = Number(n);
    return speichern();
  }

  /* ---------- Abgleich mit der Datenbank (js/cloud.js) ---------- */
  const kopie = x => JSON.parse(JSON.stringify(x));
  /* Der Stand ohne Vornamen, so wie er in die Datenbank geht, mit der Nummer der Fassung */
  function schnappschuss() {
    if (!kind) return null;
    const stand = kopie(kind);
    delete stand.name;
    return { stand, fassung };
  }

  /* Der Stand, den dieses Gerät zuletzt abgeglichen hat (null: noch nie) */
  function abgleichsBasis() {
    if (!aktivCode || istVorschau) return null;
    try {
      const d = JSON.parse(localStorage.getItem(abgleichSchluessel(aktivCode)) || 'null');
      return istObjekt(d) ? d : null;
    } catch (e) { return null; }
  }

  /* Ergebnis eines Abgleichs übernehmen. zusammen: der zusammengeführte Stand, der jetzt in der Datenbank steht.
     vorher: der Schnappschuss, mit dem zusammengeführt wurde. Wurde seitdem weitergeübt, kommt das obendrauf
     (der Schnappschuss ist dann die Basis). Das Kind-Objekt bleibt dasselbe, nur sein Inhalt wird ersetzt.
     Gibt zurück, ob auf dem Gerät noch etwas steht, das die Datenbank nicht kennt. */
  function abgleichUebernehmen(zusammen, vorher = null) {
    if (!kind || !aktivCode || istVorschau) return false;
    const weitergeuebt = !!vorher && vorher.fassung !== fassung;
    const neu = weitergeuebt ? ZS.mische.stand(vorher.stand, schnappschuss().stand, zusammen) : zusammen;
    Object.assign(kind, normalisiere({ ...kopie(neu), name: kind.name }));
    ablegen();
    try { localStorage.setItem(abgleichSchluessel(aktivCode), JSON.stringify(zusammen)); } catch (e) { letzterFehler = e; }
    return weitergeuebt;
  }

  /* f wird nach jedem Speichern auf dem Gerät aufgerufen */
  function beiAenderung(f) { if (!lauscher.includes(f)) lauscher.push(f); }

  function aktiv() { return kind; }

  laden();

  ZS.speicher = {
    BASIS,
    schluesselFuer,
    istVorschau,
    get ladeFehler() { return ladeFehler; },
    get letzterFehler() { return letzterFehler; },
    aktiv,
    code: () => aktivCode,
    codePruefen,
    vorhanden,
    namePruefen,
    oeffnen,
    abmelden,
    speichern,
    antwortMerken,
    nachtragen,
    zeitMerken,
    heuteSek,
    gefuehlMerken,
    klasseSetzen,
    schnappschuss,
    abgleichsBasis,
    abgleichUebernehmen,
    beiAenderung
  };
})();
