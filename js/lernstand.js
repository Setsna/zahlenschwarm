/* Zahlenschwarm: Lernlogik (Etappe 3).
   Jede Aufgabe hat eine Stufe (Leitner):
     0 neu · 1 und 2 "übe ich noch" · 3 und 4 "sicher".
   Regeln (Mini-Spec Etappe 3, Entscheidung Ingo: nur hochstufen, wenn fällig):
     - richtig, zügig, ohne Tipp: eine Stufe hoch, aber nur, wenn die Aufgabe fällig war (neu zählt als fällig)
     - richtig, aber langsam oder mit Tipp: Stufe bleibt (neu wird Stufe 1)
     - falsch: Stufe 1
   Fällig: Stufe 1 immer, Stufe 2–4 ab dem Tag "faelligTag". Abstände in config.js (leitner.abstandTage).
   "Tag" ist der Kalendertag auf dem Gerät.
   Alles ohne Seiteneffekte, damit tools/lernlogik-test.html es mit erfundenen Tagen prüfen kann. */
(() => {
  'use strict';
  const C = ZS.config;
  const MAX = C.leitner.boxen - 1;          /* höchste Stufe, 4 */
  const SICHER_AB = 3;

  /* Kalendertag auf dem Gerät als fortlaufende Zahl (Ortszeit) */
  function tagNr(ms = Date.now()) {
    const d = new Date(ms);
    return Math.round(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000);
  }

  const istObjekt = x => x !== null && typeof x === 'object' && !Array.isArray(x);

  /* Eintrag einer Aufgabe lesen. Ältere Stände (Etappe 2, ohne Stufe) werden übernommen:
     wer die Aufgabe schon einmal gerechnet hat, steht auf Stufe 1 und ist fällig. */
  function eintrag(kind, id, heute = tagNr()) {
    const e = istObjekt(kind.aufgaben[id]) ? kind.aufgaben[id] : {};
    const geuebt = (Number(e.richtig) || 0) + (Number(e.falsch) || 0) > 0;
    let box = Number.isInteger(e.box) && e.box >= 0 && e.box <= MAX ? e.box : (geuebt ? 1 : 0);
    const faelligTag = Number.isInteger(e.faelligTag) ? e.faelligTag : heute;
    return { ...e, box, faelligTag, richtig: Number(e.richtig) || 0, falsch: Number(e.falsch) || 0 };
  }

  function istFaellig(e, heute = tagNr()) {
    if (e.box === 0) return false;           /* neu ist nicht "fällig", sondern "neu" */
    if (e.box === 1) return true;
    return e.faelligTag <= heute;
  }

  const status = e => e.box === 0 ? 'neu' : e.box >= SICHER_AB ? 'sicher' : 'uebt';

  /* Neue Stufe nach einer Antwort. antwort = { richtig, zuegig, tipp } */
  function bewerten(e, antwort, heute = tagNr()) {
    const n = { ...e };
    const abstand = b => C.leitner.abstandTage[b] || 0;
    if (!antwort.richtig) {
      n.box = 1;
      n.faelligTag = heute;
      /* Fehler am selben Tag zählen (ab 3 zeigt die App von selbst Tipp 2) */
      n.fehlerHeute = (e.fehlerTag === heute ? (Number(e.fehlerHeute) || 0) : 0) + 1;
      n.fehlerTag = heute;
    } else if (antwort.zuegig && !antwort.tipp && (e.box === 0 || istFaellig(e, heute))) {
      n.box = Math.min(MAX, e.box + 1);
      n.faelligTag = heute + abstand(n.box);
    } else if (e.box === 0) {
      n.box = 1;
      n.faelligTag = heute;
    }
    /* sonst bleibt alles, wie es ist */
    return n;
  }

  /* Wählt die nächste Aufgabe.
     kandidaten: Aufgaben (aus ZS.aufgaben), kind: Spielstand, verlauf: [{ id, neu }] zuletzt gezeigt (neueste am Ende).
     Reihenfolge: fällige (niedrigste Stufe zuerst) – neue (höchstens 3 in den letzten 10) – Kontrolle (am längsten nicht dran).
     Bremse (Ingo, 10.11.2026): keine der letzten drei Aufgaben, also höchstens jede 4. Aufgabe dieselbe.
     Die gezielte Wiederholung nach einem Fehler macht ueben.js selbst (nach zwei anderen). */
  function naechste({ kandidaten, kind, verlauf = [], heute = tagNr(), zufall = Math.random, neuInReihenfolge = false }) {
    const zuletzt = new Set(verlauf.slice(-C.leitner.mindestAbstand).map(v => v.id));
    let pool = kandidaten.filter(a => !zuletzt.has(a.id));
    if (!pool.length) pool = kandidaten.slice();
    const mit = pool.map(a => ({ a, e: eintrag(kind, a.id, heute) }));
    const zufaellig = liste => liste[Math.floor(zufall() * liste.length)];
    /* Plus/Minus: neue Formate der Reihe nach (erst 1, dann 2 …), beim Einmaleins zufällig */
    const neueWahl = () => neuInReihenfolge ? neue[0] : zufaellig(neue);

    const faellige = mit.filter(x => istFaellig(x.e, heute));
    const neue = mit.filter(x => x.e.box === 0);
    const neuInLetzten10 = verlauf.slice(-10).filter(v => v.neu).length;
    const neuErlaubt = neue.length > 0 && neuInLetzten10 < C.runde.neueHoechstens;

    let wahl = null;
    if (faellige.length && !(neuErlaubt && zufall() < 0.35)) {
      const minBox = Math.min(...faellige.map(x => x.e.box));
      wahl = zufaellig(faellige.filter(x => x.e.box === minBox));
    } else if (neuErlaubt) {
      wahl = neueWahl();
    } else if (faellige.length) {
      wahl = zufaellig(faellige);
    } else {
      /* Kontrolle: nichts fällig, keine neuen erlaubt. Am längsten nicht geübt zuerst. */
      const alt = mit.filter(x => x.e.box > 0).sort((p, q) => (p.e.zuletzt || 0) - (q.e.zuletzt || 0));
      /* Randfall in der Anlaufphase: alle geübten Aufgaben sind unter den letzten drei, übrig sind nur neue.
         Die Bremse hat Vorrang, dann kommt ausnahmsweise noch eine neue Aufgabe. (Ein Kind mit vielen
         Fehlern hat genug fällige Aufgaben, bei ihm tritt der Fall nicht auf.) */
      wahl = alt.length ? alt[0] : (neue.length ? neueWahl() : zufaellig(mit));
    }
    return { aufgabe: wahl.a, neu: wahl.e.box === 0 };
  }

  /* Stand einer Reihe für die Tupfen auf der Kachel */
  function reiheStand(kind, aufgaben, heute = tagNr()) {
    const st = { neu: 0, uebt: 0, sicher: 0, faellig: 0, gesamt: aufgaben.length };
    for (const a of aufgaben) {
      const e = eintrag(kind, a.id, heute);
      st[status(e)]++;
      if (istFaellig(e, heute)) st.faellig++;
    }
    st.gemeistert = st.sicher === st.gesamt;
    return st;
  }

  /* "Heute bereit für dich": was empfiehlt die Startseite?
     reihen: [{ nr, aufgaben }] der offenen Reihen in der Reihenfolge aus config.js */
  function empfehlung(kind, reihen, heute = tagNr()) {
    const staende = reihen.map(r => ({ nr: r.nr, st: reiheStand(kind, r.aufgaben, heute) }));
    const mitFaelligen = staende.filter(x => x.st.faellig > 0).sort((p, q) => q.st.faellig - p.st.faellig);
    if (mitFaelligen.length) return { art: 'faellig', reihe: mitFaelligen[0].nr };
    /* Reihe "fast sicher" (mind. 8 von 10): nächste noch nicht begonnene Reihe empfehlen */
    const begonnen = staende.filter(x => x.st.neu < x.st.gesamt);
    const offenNeu = staende.find(x => x.st.neu === x.st.gesamt);
    const fastFertig = begonnen.length && begonnen.every(x => x.st.sicher >= Math.ceil(x.st.gesamt * 0.8));
    if (offenNeu && (!begonnen.length || fastFertig)) return { art: 'neu', reihe: offenNeu.nr };
    const mitNeuen = staende.find(x => x.st.neu > 0);
    if (mitNeuen) return { art: 'weiter', reihe: mitNeuen.nr };
    return { art: 'fertig', reihe: staende.length ? staende[0].nr : null };
  }

  /* Wie oft wurde die Aufgabe heute schon falsch gerechnet? */
  const fehlerHeute = (e, heute = tagNr()) => e.fehlerTag === heute ? (Number(e.fehlerHeute) || 0) : 0;

  ZS.lernstand = { fehlerHeute, tagNr, eintrag, istFaellig, status, bewerten, naechste, reiheStand, empfehlung, SICHER_AB };
})();
