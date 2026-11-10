/* Zahlenschwarm: alle Einstellungen an einer Stelle.
   Diese Datei wird als erste geladen. */
'use strict';

/* Skriptfehler sammeln, damit der Rauchtest sie sieht. */
window.FEHLER = [];
window.addEventListener('error', e => window.FEHLER.push(String(e.message || e)));
window.addEventListener('unhandledrejection', e => window.FEHLER.push(String(e.reason)));

window.ZS = window.ZS || {};

ZS.config = {
  name: 'Zahlenschwarm',

  /* Speicher im Browser. Ändert sich der Aufbau der Daten, schema hochzählen
     und in js/speicher.js eine Umwandlung vom alten Stand ergänzen. */
  speicher: {
    schluessel: 'zahlenschwarm',      /* localStorage: zahlenschwarm-v<schema> */
    schema: 1,
    werSchluessel: 'zahlenschwarm-wer' /* sessionStorage: welches Kind in diesem Tab übt */
  },
  nameMaxLaenge: 20,

  /* Versionsnummer der Bilder, getrennt von ?v=N für js und css. */
  bildStand: 3,

  /* Inhalte Klasse 3 (Festlegung Ingo, 10.11.2026; der Lehrplan nennt für Kl. 3 nichts eigenes) */
  faktoren: { min: 1, max: 10 },          /* keine Aufgaben mit 0 */
  reihenFolge: [2, 5, 10, 4, 8, 3, 6, 9, 7, 1],
  zahlenraumPlusMinus: 1000,

  /* Ab Etappe 2/3 genutzt */
  runde: { aufgaben: 10, neueHoechstens: 3 },
  bedenkzeit: { aktiv: true, sekundenVorPruefen: 1.5 },
  /* So lange bleibt "Richtig!" stehen, bevor die nächste Aufgabe kommt (Ingo: 1,5 s) */
  pauseNachRichtigSek: 1.5,
  /* Richtig, aber langsam: so lange bleibt "So geht es noch schneller" stehen, dann geht es von selbst weiter */
  pauseNachLangsamSek: 4,
  eingabeZiffern: { mal: 3, geteilt: 3, plus: 4, minus: 4 },
  /* "zügig" = Zeit von der Anzeige der Aufgabe bis zur ersten getippten Ziffer, in Sekunden */
  zuegig: { mal: 5, geteilt: 8, plus: 8, minus: 8, mitUebergang: 10 },
  /* Lernstufen: Abstand in Tagen je Stufe 0–4; mindestAbstand: dieselbe Aufgabe höchstens jede 4. Aufgabe;
     autoTippAbFehlern: nach so vielen Fehlern am selben Tag erscheint Tipp 2 von selbst */
  leitner: { boxen: 5, abstandTage: [0, 0, 1, 3, 7], mindestAbstand: 3, autoTippAbFehlern: 3 },

  /* Lernzeit: eine Sitzung zählt höchstens 30 Minuten, unter 3 Sekunden gar nicht */
  lernzeit: { hoechstensSek: 1800, mindestensSek: 3 }
};
