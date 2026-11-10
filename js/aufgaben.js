/* Zahlenschwarm: Aufgaben, Lösungen, Erklärungen und Tipps.
   Alles wird erzeugt und berechnet, nichts steht als feste Liste im Quelltext.
   Geprüft wird alles mit tools/aufgaben-test.html.

   Eine Malaufgabe a · b gehört zur Reihe b (7 · 2 gehört zur 2er-Reihe).
   Die Tauschaufgabe b · a ist eine eigene Aufgabe der Reihe a.
   So gibt es beim Einmaleins 1–10 genau 100 Aufgaben. */
(() => {
  'use strict';
  const C = ZS.config;
  const MAL = '·', MINUS = '−', GETEILT = ':';

  /* ---------- Aufgaben ---------- */
  function mal(a, b) {
    return { id: `mal:${a}:${b}`, art: 'mal', a, b, reihe: b, text: `${a} ${MAL} ${b}`, loesung: a * b };
  }

  /* Alle Aufgaben einer Reihe, z. B. reihe(2) = 1 · 2 bis 10 · 2 */
  function reihe(b) {
    const { min, max } = C.faktoren;
    const liste = [];
    for (let a = min; a <= max; a++) liste.push(mal(a, b));
    return liste;
  }

  function ausId(id) {
    const m = /^mal:(\d+):(\d+)$/.exec(String(id));
    if (!m) return null;
    const a = Number(m[1]), b = Number(m[2]), { min, max } = C.faktoren;
    return a >= min && a <= max && b >= min && b <= max ? mal(a, b) : null;
  }

  /* Zufällige Reihenfolge (Fisher-Yates). zufall ist austauschbar für Tests. */
  function mischen(liste, zufall = Math.random) {
    const l = liste.slice();
    for (let i = l.length - 1; i > 0; i--) {
      const j = Math.floor(zufall() * (i + 1));
      [l[i], l[j]] = [l[j], l[i]];
    }
    return l;
  }

  /* Runde für Etappe 2: alle Aufgaben der Reihe gemischt, höchstens C.runde.aufgaben.
     Die Auswahl nach Lernstand kommt in Etappe 3. */
  function runde(b, zufall = Math.random) {
    return mischen(reihe(b), zufall).slice(0, C.runde.aufgaben);
  }

  /* ---------- Erklärungen (nach einer falschen oder langsamen Antwort) ---------- */
  /* Rechenweg über Kernaufgaben (mal 1, 2, 5, 10). Jede Zeile enthält nur Rechnungen,
     die der Test nachrechnet. */
  function kernweg(a, b) {
    const p = a * b;
    switch (a) {
      case 1: return `1 ${MAL} ${b} = ${b}. Mal 1 bleibt die Zahl gleich.`;
      case 2: return `2 ${MAL} ${b} heißt: ${b} und noch einmal ${b}. ${b} + ${b} = ${p}.`;
      case 3: return `2 ${MAL} ${b} = ${2 * b}. Noch einmal ${b} dazu: ${2 * b} + ${b} = ${p}.`;
      case 4: return `2 ${MAL} ${b} = ${2 * b}. Das Doppelte davon: ${2 * b} + ${2 * b} = ${p}.`;
      case 5: return `10 ${MAL} ${b} = ${10 * b}. Die Hälfte davon: ${10 * b} ${GETEILT} 2 = ${p}.`;
      case 6: return `5 ${MAL} ${b} = ${5 * b}. Noch einmal ${b} dazu: ${5 * b} + ${b} = ${p}.`;
      case 7: return `5 ${MAL} ${b} = ${5 * b} und 2 ${MAL} ${b} = ${2 * b}. Zusammen: ${5 * b} + ${2 * b} = ${p}.`;
      case 8: return `10 ${MAL} ${b} = ${10 * b} und 2 ${MAL} ${b} = ${2 * b}. Nimm 2 ${MAL} ${b} weg: ${10 * b} ${MINUS} ${2 * b} = ${p}.`;
      case 9: return `10 ${MAL} ${b} = ${10 * b}. Einmal ${b} weniger: ${10 * b} ${MINUS} ${b} = ${p}.`;
      case 10: return `10 ${MAL} ${b} heißt: ${b} Zehner. Das sind ${p}.`;
      default: return `${a} ${MAL} ${b} = ${p}.`;
    }
  }

  /* Gibt die Zeilen der Erklärung zurück. Die erste Zeile ist immer der wichtigste Weg. */
  function erklaerung(aufgabe) {
    const { a, b, loesung: p } = aufgabe;
    const zeilen = [];
    if (b === 2 && a !== 2) {
      /* 2er-Reihe: Verdoppeln ist der leichteste Weg */
      zeilen.push(`${a} ${MAL} 2 heißt: ${a} und noch einmal ${a}. ${a} + ${a} = ${p}.`);
      /* 4 · 2 über die Nachbaraufgabe 5 · 2, sonst wäre das "Oder" nur noch einmal Verdoppeln */
      if (a === 4) zeilen.push(`Oder: 5 ${MAL} 2 = 10. Einmal 2 weniger: 10 ${MINUS} 2 = ${p}.`);
      else if ([6, 7, 8, 9].includes(a)) zeilen.push(`Oder: ${kernweg(a, b)}`);
    } else {
      zeilen.push(kernweg(a, b));
    }
    if (a !== b) zeilen.push(`Tauschaufgabe: ${b} ${MAL} ${a} = ${p}.`);
    return zeilen;
  }

  /* ---------- Tipps von Tupfi (gestuft, ohne Lösung) ---------- */
  const schwarmText = (a, b) => `${a} ${a === 1 ? 'Schwarm' : 'Schwärme'} mit je ${b} ${b === 1 ? 'Fisch' : 'Fischen'}.`;

  function strategie(a, b) {
    if (b === 2) return `Rechne das Doppelte von ${a}.`;
    if (a === 2) return `Rechne das Doppelte von ${b}.`;
    switch (a) {
      case 1: return 'Mal 1 ändert die Zahl nicht.';
      case 3: return `Rechne 2 ${MAL} ${b} und noch einmal ${b} dazu.`;
      case 4: return `Verdopple ${b}. Dann verdopple noch einmal.`;
      case 5: return `Rechne erst 10 ${MAL} ${b}. Nimm davon die Hälfte.`;
      case 6: return `Rechne 5 ${MAL} ${b} und noch einmal ${b} dazu.`;
      case 7: return `Rechne 5 ${MAL} ${b} und 2 ${MAL} ${b}. Zähle beides zusammen.`;
      case 8: return `Rechne 10 ${MAL} ${b} und nimm 2 ${MAL} ${b} weg.`;
      case 9: return `Rechne 10 ${MAL} ${b} und nimm einmal ${b} weg.`;
      case 10: return `Mal 10: Hänge an die ${b} eine Null an.`;
      default: return `Denk an eine Aufgabe, die du schon kennst.`;
    }
  }

  function hilfsaufgabe(a, b) {
    /* 5 · 2: "10 · 2 = 20" würde die Lösung 10 zeigen, deshalb Zweierschritte */
    if (a === 5 && b === 2) return 'Zähle in Zweierschritten: 2, 4, 6 … bis du fünf Zweien hast.';
    switch (a) {
      case 1: return 'Mal 1 bleibt die Zahl gleich.';
      case 2: return `${b} und noch einmal ${b}.`;
      case 3: return `2 ${MAL} ${b} = ${2 * b}. Noch einmal ${b} kommt dazu.`;
      case 4: return `2 ${MAL} ${b} = ${2 * b}. Verdopple das.`;
      case 5: return `10 ${MAL} ${b} = ${10 * b}. Die Hälfte davon.`;
      case 6: return `5 ${MAL} ${b} = ${5 * b}. Noch einmal ${b} kommt dazu.`;
      case 7: return `5 ${MAL} ${b} = ${5 * b}. Dazu kommt noch 2 ${MAL} ${b}.`;
      case 8: return `10 ${MAL} ${b} = ${10 * b}. Davon geht 2 ${MAL} ${b} weg.`;
      case 9: return `10 ${MAL} ${b} = ${10 * b}. Einmal ${b} geht weg.`;
      case 10: return `Wie viel sind ${b} Zehner?`;
      default: return '';
    }
  }

  /* Drei Stufen: 1 Strategie, 2 Bild (Schwärme als Punktefeld), 3 Hilfsaufgabe.
     Bei 2er-Aufgaben ist die Hilfsaufgabe die Kernaufgabe zu a. */
  function tipps(aufgabe) {
    const { a, b } = aufgabe;
    return [
      { stufe: 1, text: strategie(a, b) },
      { stufe: 2, text: `So sieht ${a} ${MAL} ${b} aus: ${schwarmText(a, b)}`, bild: { schwaerme: a, je: b } },
      { stufe: 3, text: hilfsaufgabe(a, b) }
    ];
  }

  /* ---------- Antwort prüfen ---------- */
  /* Eingabe ist der Text aus dem Ziffernfeld. Leere Eingabe zählt nicht als Antwort. */
  function pruefen(aufgabe, eingabe) {
    const t = String(eingabe || '').trim();
    if (!/^\d{1,3}$/.test(t)) return null;
    return Number(t) === aufgabe.loesung;
  }

  ZS.aufgaben = { MAL, mal, reihe, ausId, mischen, runde, erklaerung, tipps, pruefen };
})();
