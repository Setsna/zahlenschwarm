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
    schluessel: 'zahlenschwarm',      /* localStorage: zahlenschwarm-v<schema>.<code>, je Code ein Eintrag */
    schema: 2,                        /* 1 = Liste aller Kinder unter einem Schlüssel (bis v=26), wird nicht übernommen */
    codeLaenge: 8,                    /* wie beim Perlentaucher */
    codeZeichen: '23456789ABCDEFGHJKMNPQRSTUVWXYZ', /* ohne 0, 1, I, L und O (leicht zu verwechseln) */
    werSchluessel: 'zahlenschwarm-wer' /* sessionStorage: mit welchem Code in diesem Tab geübt wird */
  },
  nameMaxLaenge: 20,

  /* Gemeinsames Konto (Konto-Umbau): das Firebase-Projekt des Perlentauchers.
     Diese Angaben sind keine Geheimnisse, sie stehen bei jeder Firebase-Seite im Quelltext.
     Geschützt werden die Daten durch die Regeln in der Firebase-Konsole. */
  firebase: {
    apiKey: 'AIzaSyBX3MUJq69uFyejbEiJimGeAtHMER3OCdE',
    authDomain: 'lernplattform-44aa1.firebaseapp.com',
    projectId: 'lernplattform-44aa1',
    storageBucket: 'lernplattform-44aa1.firebasestorage.app',
    messagingSenderId: '213839225177',
    appId: '1:213839225177:web:4cf676269e50c708466c48'
  },
  cloud: {
    kinder: 'kinder',            /* kinder/<code>: Vorname, von der Lehrkraft angelegt (nur lesen) */
    stand: 'zs_stand',           /* zs_stand/<code>: der Stand dieses Kindes im Zahlenschwarm */
    schreibPauseMs: 2500,        /* so lange nach der letzten Änderung warten, dann gebündelt schreiben */
    nochmalMs: 8000,             /* ohne Netz: so lange bis zum nächsten Versuch */
    ladeWarteMs: 8000            /* so lange höchstens auf die Firebase-Skripte warten, dann geht es ohne weiter */
  },
  /* Klassen, die ein Kind beim Anlegen wählt (Etappe 7a). Fehlt die Angabe bei einem alten Stand, gilt Klasse 3. */
  klassen: [3, 4],
  klasseStandard: 3,

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
  /* Klasse 4: stufenmal bis 81 000 (5 Ziffern), stufengeteilt bis 3 000 (4 Ziffern) */
  eingabeZiffern: { mal: 3, geteilt: 3, plus: 4, minus: 4, stufenmal: 5, stufengeteilt: 4, plusgross: 7, minusgross: 6 },
  /* "zügig" = Zeit von der Anzeige der Aufgabe bis zur ersten getippten Ziffer, in Sekunden */
  zuegig: { mal: 5, geteilt: 8, plus: 8, minus: 8, mitUebergang: 10, stufenmal: 8, stufengeteilt: 10, plusgross: 10, minusgross: 10 },
  /* Klasse 4, Stufenzahlen: so oft (0 bis 1) steckt eine Einmaleins-Aufgabe dahinter, die das Kind schon sicher kann */
  stufenSichereKernaufgabe: 0.7,
  /* Lernstufen: Abstand in Tagen je Stufe 0–4; mindestAbstand: dieselbe Aufgabe höchstens jede 4. Aufgabe;
     autoTippAbFehlern: nach so vielen Fehlern am selben Tag erscheint Tipp 2 von selbst */
  leitner: { boxen: 5, abstandTage: [0, 0, 1, 3, 7], mindestAbstand: 3, autoTippAbFehlern: 3 },

  /* Lernzeit: eine Sitzung zählt höchstens 30 Minuten, unter 3 Sekunden gar nicht */
  lernzeit: { hoechstensSek: 1800, mindestensSek: 3 }
};
