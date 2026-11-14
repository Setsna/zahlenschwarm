/* Zahlenschwarm: zwei Stände eines Kindes zusammenführen (Konto-Umbau, Etappe 2a).
   Übt ein Kind auf zwei Geräten, darf beim Abgleich nichts verloren gehen.

   stand(basis, lokal, fern) liefert den gemeinsamen Stand:
     lokal  der Stand auf diesem Gerät
     fern   der Stand aus der Datenbank (null, wenn es noch keinen gibt)
     basis  der Stand, den dieses Gerät zuletzt abgeglichen hat (null beim ersten Mal).
            Nur daraus lässt sich sagen, was dieses Gerät seitdem selbst dazugewonnen hat.

   Regeln:
     aufgaben  je Aufgabe gewinnt der ganze Eintrag mit dem späteren "zuletzt"
     schwarm   Vereinigung, es gilt das frühere Datum. Ein Fisch geht nie verloren.
     stempel   Vereinigung, es gilt das frühere Datum. Die Selbsteinschätzung dieses Geräts
               gilt, wenn sie seit dem letzten Abgleich hier geändert wurde, sonst die ferne.
     zeit      ferne Lernzeit plus der eigene Zuwachs seit dem letzten Abgleich
     klasse    die Klasse dieses Geräts, wenn sie seit dem letzten Abgleich hier geändert wurde, sonst die ferne
     angelegt  das frühere Datum
     geaendert das spätere Datum

   Zurücksetzen durch die Lehrkraft (abgleich): Sie löscht den Stand in der Datenbank. Ein Gerät, das schon
   einmal abgeglichen hat, erkennt das daran, dass es das Dokument nicht mehr gibt oder dass ein neues mit
   späterem "angelegt" dasteht. Dann verwirft es seinen Stand und fängt mit dem aus der Datenbank an
   (oder leer). So kommt ein gelöschter Stand nicht von den Geräten der Kinder zurück.

   Der Vorname gehört nicht zum Stand in der Datenbank (er steht im Konto) und kommt hier nicht vor.
   Alles ohne Seiteneffekte: Die drei Eingaben werden nicht verändert. Geprüft in tools/mische-test.html. */
(() => {
  'use strict';
  const C = ZS.config;
  const BEREICHE = ['mal', 'geteilt', 'plusminus'];
  const GEFUEHLE = ['leicht', 'gut', 'wackelig'];

  const istObjekt = x => x !== null && typeof x === 'object' && !Array.isArray(x);
  const karte = x => istObjekt(x) ? x : {};
  const zahl = x => (typeof x === 'number' && isFinite(x) && x > 0) ? x : 0;
  const kopie = x => JSON.parse(JSON.stringify(x));
  const klasseOk = n => C.klassen.includes(Number(n)) ? Number(n) : null;
  /* frühester gültiger Zeitpunkt, 0 wenn keiner gültig ist */
  const frueher = (a, b) => { const x = zahl(a), y = zahl(b); return x && y ? Math.min(x, y) : x || y; };

  /* ---------- Aufgaben ---------- */
  const geuebt = e => zahl(e.richtig) + zahl(e.falsch);
  function aufgaben(lokal, fern) {
    const aus = {};
    for (const id of new Set([...Object.keys(lokal), ...Object.keys(fern)])) {
      const l = istObjekt(lokal[id]) ? lokal[id] : null, f = istObjekt(fern[id]) ? fern[id] : null;
      if (!l || !f) { if (l || f) aus[id] = kopie(l || f); continue; }
      const zl = zahl(l.zuletzt), zf = zahl(f.zuletzt);
      /* Gleichstand: der Eintrag mit mehr Übung; sonst bleibt der ferne (dann ändert der Abgleich nichts) */
      const lokalGewinnt = zl !== zf ? zl > zf : geuebt(l) > geuebt(f);
      aus[id] = kopie(lokalGewinnt ? l : f);
    }
    return aus;
  }

  /* ---------- Schwarm ---------- */
  function schwarm(lokal, fern) {
    const aus = {};
    for (const id of new Set([...Object.keys(lokal), ...Object.keys(fern)])) {
      const t = frueher(lokal[id], fern[id]);
      if (t) aus[id] = t;
    }
    return aus;
  }

  /* ---------- Stempel ---------- */
  const gefuehlVon = e => istObjekt(e) && GEFUEHLE.includes(e.gefuehl) ? e.gefuehl : null;
  function stempel(basis, lokal, fern) {
    const aus = {};
    for (const key of new Set([...Object.keys(lokal), ...Object.keys(fern)])) {
      const l = istObjekt(lokal[key]) ? lokal[key] : null, f = istObjekt(fern[key]) ? fern[key] : null;
      const t = frueher(l && l.t, f && f.t);
      if (!t) continue;
      const gl = gefuehlVon(l), gf = gefuehlVon(f), gb = gefuehlVon(basis[key]);
      const gefuehl = (gl && gl !== gb) ? gl : (gf || gl);
      aus[key] = gefuehl ? { t, gefuehl } : { t };
    }
    return aus;
  }

  /* ---------- Lernzeit ---------- */
  const tagVon = z => Number.isInteger(z.tag) ? z.tag : 0;
  function zeit(basis, lokal, fern) {
    const aus = {};
    for (const b of BEREICHE) {
      const sek = zahl(fern[b]) + Math.max(0, zahl(lokal[b]) - zahl(basis[b]));
      if (sek) aus[b] = sek;
    }
    /* "Heute": zählt nur für den jüngeren Kalendertag. Am selben Tag wie oben: fern plus eigener Zuwachs. */
    const tl = tagVon(lokal), tf = tagVon(fern);
    if (tl || tf) {
      if (tl > tf) { aus.tag = tl; aus.heute = zahl(lokal.heute); }
      else if (tf > tl) { aus.tag = tf; aus.heute = zahl(fern.heute); }
      else {
        const basisHeute = tagVon(basis) === tl ? zahl(basis.heute) : 0;
        aus.tag = tl;
        aus.heute = zahl(fern.heute) + Math.max(0, zahl(lokal.heute) - basisHeute);
      }
    }
    return aus;
  }

  /* ---------- Der ganze Stand ---------- */
  function stand(basis, lokal, fern) {
    const b = karte(basis), l = karte(lokal), f = karte(fern);
    const kl = klasseOk(l.klasse), kf = klasseOk(f.klasse), kb = klasseOk(b.klasse);
    const hierGeaendert = kl && kb && kl !== kb;
    const aus = {
      klasse: (hierGeaendert ? kl : (kf || kl)) || C.klasseStandard,
      aufgaben: aufgaben(karte(l.aufgaben), karte(f.aufgaben)),
      schwarm: schwarm(karte(l.schwarm), karte(f.schwarm)),
      stempel: stempel(karte(b.stempel), karte(l.stempel), karte(f.stempel)),
      zeit: zeit(karte(b.zeit), karte(l.zeit), karte(f.zeit)),
      geaendert: Math.max(zahl(l.geaendert), zahl(f.geaendert))
    };
    const angelegt = frueher(l.angelegt, f.angelegt);
    if (angelegt) aus.angelegt = angelegt;
    return aus;
  }

  /* ---------- Zurücksetzen erkennen ---------- */
  /* Hat die Lehrkraft den Stand gelöscht, seit dieses Gerät zuletzt abgeglichen hat?
     - Es gab einen Abgleich (basis), aber das Dokument ist weg.
     - Oder es steht ein Dokument da, das später angelegt wurde als das zuletzt abgeglichene:
       Ein anderes Gerät hat nach dem Löschen schon neu angefangen.
     Ohne basis (noch nie abgeglichen) lässt sich das nicht erkennen, dann wird normal zusammengeführt. */
  function zurueckgesetzt(basis, fern) {
    if (!istObjekt(basis)) return false;
    if (!istObjekt(fern)) return true;
    const b = zahl(basis.angelegt), f = zahl(fern.angelegt);
    return b > 0 && f > b;
  }

  /* Ein leerer Stand. Die Klasse bleibt. */
  function neuanfang(klasse, jetzt) {
    return { klasse: klasseOk(klasse) || C.klasseStandard, angelegt: jetzt, aufgaben: {}, schwarm: {}, stempel: {}, zeit: {}, geaendert: jetzt };
  }

  /* Ein Abgleich: entweder zusammenführen oder, nach dem Zurücksetzen, den Stand des Geräts verwerfen.
     Ergebnis: { stand, zurueckgesetzt }. jetzt: Zeitpunkt für einen leeren Neuanfang. */
  function abgleich(basis, lokal, fern, jetzt) {
    if (!zurueckgesetzt(basis, fern)) return { stand: stand(basis, lokal, fern), zurueckgesetzt: false };
    const neu = istObjekt(fern) ? stand(null, null, fern) : neuanfang(karte(lokal).klasse, jetzt);
    return { stand: neu, zurueckgesetzt: true };
  }

  /* ---------- Vergleich ---------- */
  /* Gleicher Inhalt, egal in welcher Reihenfolge die Schlüssel stehen? Damit lässt sich ein
     Schreibvorgang sparen, wenn der Abgleich nichts ändert. */
  function sortiert(x) {
    if (Array.isArray(x)) return x.map(sortiert);
    if (!istObjekt(x)) return x;
    const aus = {};
    for (const k of Object.keys(x).sort()) aus[k] = sortiert(x[k]);
    return aus;
  }
  const gleich = (a, b) => JSON.stringify(sortiert(a)) === JSON.stringify(sortiert(b));

  ZS.mische = { stand, abgleich, zurueckgesetzt, neuanfang, gleich, FELDER: ['klasse', 'angelegt', 'aufgaben', 'schwarm', 'stempel', 'zeit', 'geaendert'] };
})();
