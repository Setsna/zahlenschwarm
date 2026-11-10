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

  /* Geteilt (Etappe 4b): Umkehrung von a · b = c, also c : b = a. Gehört zur Reihe "durch b".
     Nie ein Rest, nie eine 0, Dividend höchstens 100. */
  function geteilt(a, b) {
    const c = a * b;
    return { id: `geteilt:${c}:${b}`, art: 'geteilt', a, b, c, reihe: b, text: `${c} ${GETEILT} ${b}`, loesung: a };
  }

  /* Alle Aufgaben einer Reihe, z. B. reihe(2) = 1 · 2 bis 10 · 2, reihe(2, 'geteilt') = 2 : 2 bis 20 : 2 */
  function reihe(b, art = 'mal') {
    const { min, max } = C.faktoren;
    const liste = [];
    for (let a = min; a <= max; a++) liste.push(art === 'geteilt' ? geteilt(a, b) : mal(a, b));
    return liste;
  }

  function ausId(id) {
    const { min, max } = C.faktoren;
    const imBereich = (a, b) => a >= min && a <= max && b >= min && b <= max;
    let m = /^mal:(\d+):(\d+)$/.exec(String(id));
    if (m) { const a = Number(m[1]), b = Number(m[2]); return imBereich(a, b) ? mal(a, b) : null; }
    m = /^geteilt:(\d+):(\d+)$/.exec(String(id));
    if (m) {
      const c = Number(m[1]), b = Number(m[2]);
      if (!b || c % b) return null;
      return imBereich(c / b, b) ? geteilt(c / b, b) : null;
    }
    return null;
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
  /* Jede Erklärung besteht aus Blöcken, jeder Block aus Zeilen. Jeder Gedankenschritt steht
     in einer eigenen Zeile, ohne Punkt am Ende (Ingo, 10.11.2026):
       8 · 2 heißt:
       8 und noch einmal 8
       8 + 8 = 16
     Rechenweg über Kernaufgaben (mal 1, 2, 5, 10). Der Test rechnet jede Rechnung nach. */
  function kernweg(a, b) {
    const p = a * b;
    switch (a) {
      case 1: return [`1 ${MAL} ${b} = ${b}`, 'Mal 1 bleibt die Zahl gleich'];
      case 2: return [`2 ${MAL} ${b} heißt:`, `${b} und noch einmal ${b}`, `${b} + ${b} = ${p}`];
      case 3: return [`2 ${MAL} ${b} = ${2 * b}`, `Noch einmal ${b} dazu:`, `${2 * b} + ${b} = ${p}`];
      case 4: return [`2 ${MAL} ${b} = ${2 * b}`, 'Das Doppelte davon:', `${2 * b} + ${2 * b} = ${p}`];
      case 5: return [`10 ${MAL} ${b} = ${10 * b}`, 'Die Hälfte davon:', `${10 * b} ${GETEILT} 2 = ${p}`];
      case 6: return [`5 ${MAL} ${b} = ${5 * b}`, `Noch einmal ${b} dazu:`, `${5 * b} + ${b} = ${p}`];
      case 7: return [`5 ${MAL} ${b} = ${5 * b}`, `2 ${MAL} ${b} = ${2 * b}`, 'Zusammen:', `${5 * b} + ${2 * b} = ${p}`];
      case 8: return [`10 ${MAL} ${b} = ${10 * b}`, `2 ${MAL} ${b} = ${2 * b}`, `Nimm 2 ${MAL} ${b} weg:`, `${10 * b} ${MINUS} ${2 * b} = ${p}`];
      case 9: return [`10 ${MAL} ${b} = ${10 * b}`, `Einmal ${b} weniger:`, `${10 * b} ${MINUS} ${b} = ${p}`];
      case 10: return [`10 ${MAL} ${b} heißt:`, `${b} Zehner`, `Das sind ${p}`];
      default: return [`${a} ${MAL} ${b} = ${p}`];
    }
  }

  /* Leitweg der Reihe b (Mini-Spec Etappe 4, freigegeben von Ingo):
     4er = 2er verdoppeln, 8er = 4er verdoppeln, 5er = Hälfte von mal 10, 10er = Null anhängen,
     9er = mal 10 und einmal weg, 3er = mal 2 und noch einmal, 6er = mal 5 und noch einmal, 7er = mal 5 und mal 2 */
  function leitweg(a, b) {
    const p = a * b;
    switch (b) {
      case 1: return [`${a} ${MAL} 1 = ${a}`, 'Mal 1 bleibt die Zahl gleich'];
      case 2: return [`${a} ${MAL} 2 heißt:`, `${a} und noch einmal ${a}`, `${a} + ${a} = ${p}`];
      case 3: return [`Erst ${a} ${MAL} 2 = ${2 * a}`, `Noch einmal ${a} dazu:`, `${2 * a} + ${a} = ${p}`];
      case 4: return [`Erst ${a} ${MAL} 2 = ${2 * a}`, 'Dann verdoppeln:', `${2 * a} + ${2 * a} = ${p}`];
      case 5: return [`Erst ${a} ${MAL} 10 = ${10 * a}`, 'Davon die Hälfte:', `${10 * a} ${GETEILT} 2 = ${p}`];
      case 6: return [`Erst ${a} ${MAL} 5 = ${5 * a}`, `Noch einmal ${a} dazu:`, `${5 * a} + ${a} = ${p}`];
      case 7: return [`${a} ${MAL} 5 = ${5 * a}`, `${a} ${MAL} 2 = ${2 * a}`, 'Zusammen:', `${5 * a} + ${2 * a} = ${p}`];
      case 8: return [`Erst ${a} ${MAL} 4 = ${4 * a}`, 'Dann verdoppeln:', `${4 * a} + ${4 * a} = ${p}`];
      case 9: return [`Erst ${a} ${MAL} 10 = ${10 * a}`, `Dann einmal ${a} weg:`, `${10 * a} ${MINUS} ${a} = ${p}`];
      case 10: return [`${a} ${MAL} 10 heißt:`, `an die ${a} eine Null anhängen`, `Das sind ${p}`];
      default: return [`${a} ${MAL} ${b} = ${p}`];
    }
  }
  const letzteZahl = zeilen => (zeilen[zeilen.length - 1].match(/\d+/g) || []).join(',');

  /* Gibt die Blöcke der Erklärung zurück. Der erste Block ist immer der Leitweg der Reihe. */
  function erklaerung(aufgabe) {
    if (aufgabe.art === 'geteilt') return erklaerungGeteilt(aufgabe);
    if (aufgabe.art === 'plus' || aufgabe.art === 'minus') return erklaerungPlusMinus(aufgabe);
    const { a, b, loesung: p } = aufgabe;
    const bloecke = [];
    if (a === 1 && b !== 2) {
      bloecke.push([`1 ${MAL} ${b} heißt:`, `einmal die ${b}`, `Das sind ${b}`]);
    } else if ((a === 2 || a === 10) && b !== 2 && b !== a) {
      /* "2 mal" = verdoppeln, "10 mal" = Zehner: einfacher als jeder Leitweg der Reihe */
      bloecke.push(kernweg(a, b));
    } else if (b === 2) {
      bloecke.push(leitweg(a, 2));
      /* 4 · 2 über die Nachbaraufgabe 5 · 2, sonst wäre das "Oder" nur noch einmal Verdoppeln */
      if (a === 4) bloecke.push(['Oder:', `5 ${MAL} 2 = 10`, 'Einmal 2 weniger:', `10 ${MINUS} 2 = ${p}`]);
      else if ([6, 7, 8, 9].includes(a)) bloecke.push(['Oder:', ...kernweg(a, b)]);
    } else {
      const erster = leitweg(a, b);
      bloecke.push(erster);
      /* "Oder:" über den ersten Faktor, wenn er etwas Neues zeigt (nicht bei 1er- und 10er-Reihe) */
      if (![1, 2, 5].includes(a) && ![1, 10].includes(b)) {
        const oder = kernweg(a, b);
        if (letzteZahl(oder) !== letzteZahl(erster)) bloecke.push(['Oder:', ...oder]);
      }
    }
    if (a !== b) bloecke.push(['Tauschaufgabe:', `${b} ${MAL} ${a} = ${p}`]);
    return bloecke;
  }

  /* Geteilt, Beispiel 56 : 8 (Mini-Spec Etappe 4, freigegeben):
       56 : 8 heißt:
       Wie oft passt die 8 in die 56?
       Denk an die Malaufgabe:
       7 · 8 = 56
       Also: 56 : 8 = 7 */
  function erklaerungGeteilt({ a, b, c }) {
    return [[`${c} ${GETEILT} ${b} heißt:`, `Wie oft passt die ${b} in die ${c}?`, 'Denk an die Malaufgabe:',
      `${a} ${MAL} ${b} = ${c}`, `Also: ${c} ${GETEILT} ${b} = ${a}`]];
  }

  /* Eine Erklärung als Fließtext (für Screenreader-Ansage) */
  const erklaerungText = bloecke => bloecke.map(z => z.join(' ')).join('. ');

  /* ---------- Tipps von Tupfi (gestuft, ohne Lösung) ---------- */
  const schwarmText = (a, b) => `${a} ${a === 1 ? 'Schwarm' : 'Schwärme'} mit je ${b} ${b === 1 ? 'Fisch' : 'Fischen'}.`;

  /* Tipp 1: Strategie nach dem Leitweg der Reihe */
  function strategie(a, b) {
    if (b === 2) return `Rechne das Doppelte von ${a}.`;
    if (a === 1) return `Einmal die ${b}. Wie viel ist das?`;
    if (a === 2) return `Rechne das Doppelte von ${b}.`;
    if (a === 10) return `Mal 10: Hänge an die ${b} eine Null an.`;
    switch (b) {
      case 1: return 'Mal 1 ändert die Zahl nicht.';
      case 3: return `Rechne ${a} ${MAL} 2 und noch einmal ${a} dazu.`;
      case 4: return `Rechne ${a} ${MAL} 2 und verdopple das.`;
      case 5: return `Rechne ${a} ${MAL} 10 und nimm davon die Hälfte.`;
      case 6: return `Rechne ${a} ${MAL} 5 und noch einmal ${a} dazu.`;
      case 7: return `Rechne ${a} ${MAL} 5 und ${a} ${MAL} 2. Zähle beides zusammen.`;
      case 8: return `Rechne ${a} ${MAL} 4 und verdopple das.`;
      case 9: return `Rechne ${a} ${MAL} 10 und nimm einmal ${a} weg.`;
      case 10: return `Mal 10: Hänge an die ${a} eine Null an.`;
      default: return 'Denk an eine Aufgabe, die du schon kennst.';
    }
  }

  /* Tipp 3: erster Schritt des Leitwegs vorgerechnet, ohne Lösung */
  function hilfsaufgabe(a, b) {
    /* 5 · 2: "10 · 2 = 20" würde die Lösung 10 zeigen, deshalb Zweierschritte */
    if (a === 5 && b === 2) return 'Zähle in Zweierschritten: 2, 4, 6 … bis du fünf Zweien hast.';
    if (a === 1) return 'Mal 1 bleibt die Zahl gleich.';
    if (a === 2) return `${b} und noch einmal ${b}.`;
    if (a === 10) return `Wie viel sind ${b} Zehner?`;
    switch (b) {
      case 1: return 'Mal 1 bleibt die Zahl gleich.';
      case 3: return `${a} ${MAL} 2 = ${2 * a}. Noch einmal ${a} kommt dazu.`;
      case 4: return `${a} ${MAL} 2 = ${2 * a}. Verdopple das.`;
      case 5: return `${a} ${MAL} 10 = ${10 * a}. Die Hälfte davon.`;
      case 6: return `${a} ${MAL} 5 = ${5 * a}. Noch einmal ${a} kommt dazu.`;
      case 7: return `${a} ${MAL} 5 = ${5 * a}. Dazu kommt noch ${a} ${MAL} 2.`;
      case 8: return `${a} ${MAL} 4 = ${4 * a}. Verdopple das.`;
      case 9: return `${a} ${MAL} 10 = ${10 * a}. Einmal ${a} geht weg.`;
      case 10: return `Wie viel sind ${a} Zehner?`;
    }
    /* 2er-Reihe: Kernaufgabe zum ersten Faktor (wie freigegeben) */
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
  /* Geteilt, Tipp 3: eine Kernaufgabe der Reihe in der Nähe (mal 1, 2, 5 oder 10, nie die gesuchte)
     und wie weit es von dort noch ist. Bei 5 ist 10 · b mit der Hälfte der kürzeste Weg. */
  function naheKernaufgabe(a, b, c) {
    if (a === 5) return `10 ${MAL} ${b} = ${10 * b}. ${c} ist die Hälfte davon.`;
    const k = [1, 2, 5, 10].filter(x => x !== a).sort((x, y) => Math.abs(x - a) - Math.abs(y - a) || x - y)[0];
    const kb = k * b;
    return kb < c ? `${k} ${MAL} ${b} = ${kb}. Bis ${c} fehlen noch ${c - kb}.` : `${k} ${MAL} ${b} = ${kb}. Das sind ${kb - c} zu viel.`;
  }

  function tippsGeteilt({ a, b, c }) {
    return [
      { stufe: 1, text: `Welche Malaufgabe mit ${b} ergibt ${c}?` },
      { stufe: 2, text: `${c} Fische, in Schwärme zu je ${b} sortiert. Wie viele Schwärme sind es?`,
        bild: { schwaerme: a, je: b, label: `${c} Fische in Schwärmen zu je ${b}` } },
      { stufe: 3, text: naheKernaufgabe(a, b, c) }
    ];
  }

  function tipps(aufgabe) {
    if (aufgabe.art === 'geteilt') return tippsGeteilt(aufgabe);
    if (aufgabe.art === 'plus' || aufgabe.art === 'minus') return tippsPlusMinus(aufgabe);
    const { a, b } = aufgabe;
    return [
      { stufe: 1, text: strategie(a, b) },
      { stufe: 2, text: `So sieht ${a} ${MAL} ${b} aus: ${schwarmText(a, b)}`, bild: { schwaerme: a, je: b } },
      { stufe: 3, text: hilfsaufgabe(a, b) }
    ];
  }

  /* ---------- Plus und Minus im Kopf bis 1000 (Etappe 4c) ---------- */
  /* Hunderttausende Aufgaben möglich, deshalb Lernstand je Format (Mini-Spec Etappe 4, freigegeben):
       1 Einer ohne Übergang      345 + 3     348 − 3
       2 Einer mit Übergang       347 + 5     342 − 5
       3 reine Zehner             345 + 30    375 − 30   (auch mit Hunderterübergang)
       4 reine Hunderter          345 + 200   545 − 200
       5 Zehner und Einer, ohne   345 + 23    368 − 23
       6 Zehner und Einer, mit    347 + 25    372 − 25
     Die erste Zahl ist immer dreistellig (100 bis 999), die zweite nie dreistellig außer bei reinen Hundertern.
     Kein Ergebnis unter 1 oder über 1000. Kein Schritt in einer Erklärung rechnet "+ 0" oder "− 0". */
  const FORMATE = [1, 2, 3, 4, 5, 6];
  const FORMAT_NAME = {
    1: 'Einer, ohne Übergang', 2: 'Einer, mit Übergang', 3: 'reine Zehner',
    4: 'reine Hunderter', 5: 'Zehner und Einer, ohne Übergang', 6: 'Zehner und Einer, mit Übergang'
  };
  const OP = { plus: '+', minus: MINUS };
  const E = n => n % 10, Z = n => Math.floor(n / 10) % 10, H = n => Math.floor(n / 100);
  const sind = n => n === 1 ? 'ist' : 'sind';
  const rechne = (op, x, y) => op === 'plus' ? x + y : x - y;
  const zahl = (von, bis, zufall) => von + Math.floor(zufall() * (bis - von + 1));

  /* Platzhalter eines Formats: trägt den Lernstand, die echte Aufgabe erzeugt konkret() */
  function format(op, f) {
    return { id: `${op}:${f}`, art: op, format: f, reihe: f, platzhalter: true, name: FORMAT_NAME[f] };
  }
  const formate = op => FORMATE.map(f => format(op, f));

  /* Passt das Paar x, y zum Format? (Auch der Test nutzt eine eigene, unabhängige Prüfung.) */
  function passt(op, f, x, y) {
    const r = rechne(op, x, y);
    if (x < 100 || x > 999 || r < 1 || r > 1000) return false;
    const plus = op === 'plus';
    const zehnerUeber = plus ? E(x) + E(y) >= 10 : E(x) < E(y);
    const hundertUeber = H(x) !== H(r);
    switch (f) {
      case 1: return y >= 1 && y <= 9 && !zehnerUeber;
      /* echter Übergang mit zwei Schritten: 347 + 5 (nicht 347 + 3), 342 − 5 (nicht 340 − 5) */
      case 2: return y >= 1 && y <= 9 && (plus ? E(x) + y > 10 : E(x) >= 1 && E(x) < y);
      case 3: {
        if (y < 10 || y > 90 || E(y) !== 0) return false;
        /* Bei glatten Zehnern mit Hunderterübergang zwei echte Schritte: 380 + 30, 310 − 30 */
        if (hundertUeber && E(x) === 0) return plus ? Z(x) + Z(y) > 10 : Z(x) >= 1 && Z(x) < Z(y);
        return true;
      }
      /* Ergebnis behält mindestens einen Hunderter: 545 − 200, nicht 545 − 500 */
      case 4: return y >= 100 && y <= 900 && y % 100 === 0 && (plus || H(x) > H(y));
      case 5: return y >= 11 && y <= 99 && E(y) !== 0 && !zehnerUeber && !hundertUeber;
      case 6: return y >= 11 && y <= 99 && E(y) !== 0 && (zehnerUeber || hundertUeber);
    }
    return false;
  }

  /* Zufallszahlen je Format; wiederholen, bis das Paar passt (endet sicher, siehe Test) */
  function ziehe(f, zufall) {
    switch (f) {
      case 1: case 2: return zahl(1, 9, zufall);
      case 3: return zahl(1, 9, zufall) * 10;
      case 4: return zahl(1, 9, zufall) * 100;
      default: return zahl(1, 9, zufall) * 10 + zahl(1, 9, zufall);
    }
  }
  function plusMinus(op, f, x, y) {
    const r = rechne(op, x, y);
    const uebergang = f === 2 || f === 6 || (f === 3 && H(x) !== H(r));
    return { id: `${op}:${f}`, art: op, format: f, reihe: f, x, y, uebergang, text: `${x} ${OP[op]} ${y}`, loesung: r };
  }
  function erzeuge(op, f, zufall = Math.random) {
    for (let i = 0; i < 10000; i++) {
      const x = zahl(100, 999, zufall), y = ziehe(f, zufall);
      if (!passt(op, f, x, y)) continue;
      /* Selten nennt ein Tipp zufällig das Ergebnis (187 − 97 = 90: "Zerlege die 97 in 90 und 7"). Solche Aufgaben fallen weg. */
      const a = plusMinus(op, f, x, y);
      if (a.loesung !== y && tippsPlusMinus(a).some(t => (t.text.match(/\d+/g) || []).map(Number).includes(a.loesung))) continue;
      return a;
    }
    throw new Error(`Keine Aufgabe für ${op} Format ${f}`);
  }
  /* Aus einem Platzhalter eine echte Aufgabe machen; echte Aufgaben bleiben, wie sie sind */
  const konkret = (a, zufall = Math.random) => a && a.platzhalter ? erzeuge(a.art, a.format, zufall) : a;

  /* Einer-Schritt, bei Übergang in zwei Schritten über den vollen Zehner */
  function einerSchritte(op, start, e, kopf) {
    const o = OP[op], ende = rechne(op, start, e);
    const k = op === 'plus' ? 10 - E(start) : E(start);
    const zwei = op === 'plus' ? E(start) + e > 10 : E(start) >= 1 && E(start) < e;
    if (!zwei) return [...(kopf ? [kopf.einfach] : []), `${start} ${o} ${e} = ${ende}`];
    const voll = rechne(op, start, k);
    return [...(kopf ? [kopf.zwei] : []), `${start} ${o} ${k} = ${voll}`, ...(kopf ? [] : ['Dann der Rest:']), `${voll} ${o} ${e - k} = ${ende}`];
  }

  function erklaerungPlusMinus(a) {
    const { art: op, format: f, x, y, loesung: r } = a;
    const o = OP[op], plus = op === 'plus', und = plus ? 'und' : 'minus';
    const also = `Also: ${x} ${o} ${y} = ${r}`;
    switch (f) {
      case 1: return [['Nur die Einer ändern sich:', `${E(x)} ${o} ${y} = ${E(r)}`, also]];
      case 2: return [['Erst bis zum vollen Zehner:', ...einerSchritte(op, x, y)]];
      case 3: {
        if (H(x) === H(r)) return [['Nur die Zehner ändern sich:', `${Z(x)} Zehner ${und} ${Z(y)} Zehner ${sind(Z(r))} ${Z(r)} Zehner`, also]];
        if (E(x) !== 0) {
          const ohne = x - E(x), zwischen = rechne(op, ohne, y);
          return [['Lass die Einer erst weg:', `${ohne} ${o} ${y} = ${zwischen}`, 'Dann kommen die Einer dazu:', `${zwischen} + ${E(x)} = ${r}`]];
        }
        const k = plus ? 100 - (x % 100) : x % 100, voll = rechne(op, x, k);
        return [['Erst bis zum vollen Hunderter:', `${x} ${o} ${k} = ${voll}`, 'Dann der Rest:', `${voll} ${o} ${y - k} = ${r}`]];
      }
      case 4: return [['Nur die Hunderter ändern sich:', `${H(x)} Hunderter ${und} ${H(y)} Hunderter ${sind(H(r))} ${H(r)} Hunderter`, also]];
      default: {
        const zehner = y - E(y), zwischen = rechne(op, x, zehner);
        return [['Erst die Zehner:', `${x} ${o} ${zehner} = ${zwischen}`,
          ...einerSchritte(op, zwischen, E(y), { einfach: 'Dann die Einer:', zwei: 'Dann die Einer, über den vollen Zehner:' })]];
      }
    }
  }

  function tippsPlusMinus(a) {
    const { art: op, format: f, x, y, loesung: r } = a;
    const o = OP[op], plus = op === 'plus';
    const dazu = (n, wort) => plus ? `Dazu ${n === 1 ? 'kommt' : 'kommen'} ${n} ${wort}.` : `Davon ${n === 1 ? 'geht' : 'gehen'} ${n} ${wort} weg.`;
    let t1, t2, t3;
    switch (f) {
      case 1:
        t1 = 'Schau nur auf die Einer.';
        t2 = `${x} hat ${E(x)} Einer. ${dazu(y, 'Einer')}`;
        t3 = `${E(x)} ${o} ${y} = ${E(r)}. Die Zehner und Hunderter bleiben gleich.`;
        break;
      case 2: {
        const k = plus ? 10 - E(x) : E(x);
        t1 = plus ? 'Rechne erst bis zum vollen Zehner.' : 'Rechne erst zurück bis zum vollen Zehner.';
        t2 = `Zerlege die ${y} in ${k} und ${y - k}.`;
        t3 = `${x} ${o} ${k} = ${rechne(op, x, k)}. ${plus ? 'Jetzt kommt noch der Rest dazu.' : 'Jetzt geht noch der Rest weg.'}`;
        break;
      }
      case 3:
        if (H(x) === H(r)) {
          t1 = 'Schau nur auf die Zehner.';
          t2 = `${x} hat ${Z(x)} Zehner. ${dazu(Z(y), 'Zehner')}`;
          t3 = `${Z(x)} Zehner ${plus ? 'und' : 'minus'} ${Z(y)} Zehner ${sind(Z(r))} ${Z(r)} Zehner.`;
        } else if (E(x) !== 0) {
          const ohne = x - E(x);
          t1 = 'Lass die Einer erst weg und rechne mit den Zehnern.';
          t2 = `Zerlege die ${x} in ${ohne} und ${E(x)}.`;
          t3 = `${ohne} ${o} ${y} = ${rechne(op, ohne, y)}. Jetzt kommen die Einer wieder dazu.`;
        } else {
          const k = plus ? 100 - (x % 100) : x % 100;
          t1 = plus ? 'Rechne erst bis zum vollen Hunderter.' : 'Rechne erst zurück bis zum vollen Hunderter.';
          t2 = `Zerlege die ${y}: Erst ${k} bis zum vollen Hunderter, dann der Rest.`;
          t3 = `${x} ${o} ${k} = ${rechne(op, x, k)}. ${plus ? 'Jetzt kommt noch der Rest dazu.' : 'Jetzt geht noch der Rest weg.'}`;
        }
        break;
      case 4:
        t1 = 'Schau nur auf die Hunderter.';
        t2 = `${x} hat ${H(x)} Hunderter. ${dazu(H(y), 'Hunderter')}`;
        t3 = `${H(x)} Hunderter ${plus ? 'und' : 'minus'} ${H(y)} Hunderter ${sind(H(r))} ${H(r)} Hunderter.`;
        break;
      default: {
        const zehner = y - E(y);
        t1 = 'Rechne erst die Zehner, dann die Einer.';
        t2 = `Zerlege die ${y} in ${zehner} und ${E(y)}.`;
        t3 = `${x} ${o} ${zehner} = ${rechne(op, x, zehner)}. ${plus ? 'Jetzt kommen noch die Einer dazu.' : 'Jetzt gehen noch die Einer weg.'}`;
      }
    }
    return [{ stufe: 1, text: t1 }, { stufe: 2, text: t2 }, { stufe: 3, text: t3 }];
  }

  /* ---------- Antwort prüfen ---------- */
  /* Eingabe ist der Text aus dem Ziffernfeld. Leere Eingabe zählt nicht als Antwort. */
  /* Höchstens so viele Ziffern, wie die Lösung haben kann: Einmaleins und Geteilt 3, Plus und Minus 4 (bis 1000) */
  const ziffern = aufgabe => C.eingabeZiffern[aufgabe.art] || 3;
  function pruefen(aufgabe, eingabe) {
    const t = String(eingabe || '').trim();
    if (!new RegExp(`^\\d{1,${ziffern(aufgabe)}}$`).test(t)) return null;
    return Number(t) === aufgabe.loesung;
  }

  ZS.aufgaben = { MAL, GETEILT, MINUS, FORMATE, FORMAT_NAME, format, formate, passt, erzeuge, konkret, ziffern, mal, geteilt, reihe, ausId, mischen, runde, erklaerung, erklaerungText, tipps, pruefen };
})();
