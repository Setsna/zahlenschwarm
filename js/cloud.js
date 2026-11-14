/* Zahlenschwarm: Anmeldung und Abgleich mit Firebase (Konto-Umbau, Etappe 2b).
   Vorbild ist js/cloud.js des Perlentauchers. Beide Seiten nutzen dieselben Konten.

   Ablauf:
   1. Das Kind gibt seinen Code ein oder scannt den Aufkleber (die Adresse endet dann auf #c=CODE, siehe js/app.js).
   2. Die Seite meldet es unsichtbar bei Firebase an, genau wie der Perlentaucher:
      Benutzername <code>@<authDomain>, Passwort = Code.
   3. Nur Codes, die die Lehrkraft angelegt hat (kinder/<code>), kommen hinein.
      Von dort kommt auch der Vorname.
   4. Der Stand liegt unter zs_stand/<code>. Er wird nie blind überschrieben, sondern mit
      dem Stand auf dem Gerät zusammengeführt (js/mische.js).
   5. Geübt wird immer gegen den Stand auf dem Gerät (js/speicher.js). In die Datenbank geht
      es gebündelt, kurz nach der letzten Änderung, nicht bei jeder Antwort.

   Ohne Netz oder wenn Firebase nicht geladen wurde: Ein Code, den dieses Gerät schon kennt,
   öffnet den Stand auf dem Gerät. Abgeglichen wird, sobald es wieder geht.

   Diese Datei zeigt nichts an. Was das Kind sieht, macht js/app.js. */
(() => {
  'use strict';
  const C = ZS.config, S = ZS.speicher, M = ZS.mische;

  /* Texte für das Kind */
  const TEXT = {
    code: 'Dieser Code sieht nicht richtig aus. Schau noch einmal nach.',
    gesperrt: 'Dieser Code ist noch nicht freigeschaltet. Bitte sag deiner Lehrkraft Bescheid.',
    netz: 'Gerade gibt es kein Internet. Versuch es später noch einmal.',
    oft: 'Das waren zu viele Versuche. Warte kurz und versuch es dann noch einmal.',
    sonst: 'Die Anmeldung hat nicht geklappt. Bitte sag deiner Lehrkraft Bescheid.',
    unlesbar: 'Dein gespeicherter Stand konnte nicht gelesen werden. Bitte sag deiner Lehrkraft Bescheid.'
  };

  let auth = null, db = null;
  let aktiv = false;            /* Firebase ist geladen und eingerichtet */
  let kind = null;              /* { code, name }: bei Firebase angemeldet und freigeschaltet */
  let bereit = false;           /* der Stand ist geöffnet, es darf geschrieben werden */
  let wartend = null;           /* { code, name, fern }: angemeldet, aber die Klasse fehlt noch */
  let nachholen = null;         /* Code, der ohne Netz nur auf dem Gerät geöffnet wurde */
  let timer = null;
  let laeuft = null;            /* das Schreiben, das gerade unterwegs ist */

  /* Auf dem eigenen Rechner (localhost) spricht die Seite nie mit dem echten Firebase, nur mit der
     Attrappe der Tests. So legt ein Versuch beim Entwickeln kein echtes Konto an. */
  const LOKAL = ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname);
  const vorhanden = () => typeof firebase !== 'undefined' && !!C.firebase.apiKey && (!LOKAL || !!window.ATTRAPPE);

  /* Die Firebase-Skripte stehen in index.html hinter den eigenen Skripten, damit die Seite nicht auf sie warten
     muss. Hier wird gewartet, bis sie da sind (oder feststeht, dass sie nicht kommen). */
  let geladen = null;
  function ladenAbwarten() {
    if (typeof firebase !== 'undefined' || document.readyState === 'complete') return Promise.resolve();
    if (!geladen) geladen = new Promise(ok => { window.addEventListener('load', ok, { once: true }); setTimeout(ok, C.cloud.ladeWarteMs); });
    return geladen;
  }
  const mailVon = code => `${code.toLowerCase()}@${C.firebase.authDomain}`;
  const idVon = code => code.toLowerCase();
  const NETZ_CODES = ['unavailable', 'deadline-exceeded', 'failed-precondition', 'aborted', 'auth/network-request-failed'];
  const istNetzFehler = e => !!e && NETZ_CODES.includes(e.code);

  /* ---------- Zustand des Abgleichs ---------- */
  /* ok: alles in der Datenbank · wartet: Schreiben unterwegs oder ohne Netz zurückgestellt ·
     lokal: ohne Anmeldung nur auf dem Gerät · fehler: die Datenbank hat abgelehnt */
  let zustand = { art: 'ok', meldung: null };
  const zuhoerer = [];
  function melden(art, meldung = null) {
    if (zustand.art === art && zustand.meldung === meldung) return;
    zustand = { art, meldung };
    for (const f of zuhoerer.slice()) { try { f(zustand); } catch (e) { /* Anzeige darf den Abgleich nicht stören */ } }
  }
  function fehlerText(e) {
    const c = e && e.code;
    if (c === 'permission-denied') return 'Die Datenbank hat das Speichern abgelehnt.';
    if (c === 'resource-exhausted') return 'Die Datenbank ist für heute ausgelastet.';
    return 'Das Speichern in der Datenbank hat nicht geklappt.';
  }

  /* ---------- Start ---------- */
  /* Richtet Firebase ein und stellt eine Anmeldung wieder her, die auf dem Gerät noch liegt.
     Ergebnis wie bei anmelden(), oder { ok: false } ohne Text, wenn niemand angemeldet ist. */
  let eingerichtet = false;
  function einrichten() {
    if (eingerichtet) return aktiv;
    eingerichtet = true;
    if (S.istVorschau || !vorhanden()) return false;
    try {
      firebase.initializeApp(C.firebase);
      auth = firebase.auth();
      db = firebase.firestore();
      /* Zwischenspeicher für Zeiten ohne Netz. Geht das nicht (z. B. privater Modus), läuft es ohne. */
      db.enablePersistence({ synchronizeTabs: true }).catch(() => {});
      aktiv = true;
    } catch (e) {
      aktiv = false;
    }
    return aktiv;
  }

  function start() {
    return ladenAbwarten().then(() => einrichten() ? gemerkteAnmeldung() : { ok: false });
  }
  function gemerkteAnmeldung() {
    return new Promise(fertig => {
      /* Firebase meldet den Anmeldezustand mehrfach. Nur die erste Meldung zählt hier. */
      let erledigt = false;
      auth.onAuthStateChanged(user => {
        if (erledigt) return;
        erledigt = true;
        const code = user && user.email ? S.codePruefen(user.email.split('@')[0]) : null;
        if (!code) { fertig({ ok: false }); return; }
        nachAnmeldung(code).then(fertig, e => fertig(ohneNetz(code, e)));
      });
    });
  }

  /* ---------- Anmelden ---------- */
  /* Ergebnis: { ok: true, name, brauchtKlasse, ohneNetz, gespeichert } oder { ok: false, grund }.
     gespeichert = false: geöffnet, aber der Speicher des Geräts hat abgelehnt.
     brauchtKlasse: Es gibt noch nirgends einen Stand. Die Seite fragt nach der Klasse und ruft dann klasseWaehlen(). */
  function anmelden(roh) {
    const code = S.codePruefen(roh);
    if (!code) return Promise.resolve({ ok: false, grund: TEXT.code });
    if (S.istVorschau) return Promise.resolve({ ok: false, grund: TEXT.sonst });
    return ladenAbwarten().then(() => einrichten() ? beiFirebaseAnmelden(code) : ohneNetz(code, null));
  }
  function beiFirebaseAnmelden(code) {
    const mail = mailVon(code);
    return auth.signInWithEmailAndPassword(mail, code)
      .catch(e => {
        /* Beim allerersten Anmelden gibt es das Konto noch nicht. */
        if (e && (e.code === 'auth/user-not-found' || e.code === 'auth/invalid-credential')) return auth.createUserWithEmailAndPassword(mail, code);
        throw e;
      })
      .then(() => nachAnmeldung(code))
      .catch(e => ohneNetz(code, e));
  }

  /* Wenn die Anmeldung scheitert: Liegt es am Netz und kennt das Gerät den Code, geht es auf dem Gerät weiter. */
  function ohneNetz(code, e) {
    /* Nicht halb angemeldet zurückbleiben */
    if (e && auth && (e.kindText || !istNetzFehler(e))) auth.signOut().catch(() => {});
    if (e && e.kindText) return { ok: false, grund: e.kindText };
    if (e && !istNetzFehler(e)) {
      const c = e.code;
      return { ok: false, grund: c === 'auth/too-many-requests' ? TEXT.oft : c === 'auth/wrong-password' || c === 'auth/email-already-in-use' ? TEXT.code : TEXT.sonst };
    }
    if (!S.vorhanden(code)) return { ok: false, grund: TEXT.netz };
    const r = S.oeffnen(code);
    if (!r.kind) return { ok: false, grund: TEXT.unlesbar };
    nachholen = aktiv ? code : null;
    melden('lokal');
    return { ok: true, name: r.kind.name, brauchtKlasse: false, ohneNetz: true, gespeichert: r.ok };
  }

  /* Nach der Anmeldung bei Firebase: Konto prüfen, Stand holen, auf dem Gerät öffnen. */
  function nachAnmeldung(code) {
    const id = idVon(code);
    return db.collection(C.cloud.kinder).doc(id).get().then(snap => {
      if (!snap.exists) {
        return auth.signOut().catch(() => {}).then(() => { throw { kindText: TEXT.gesperrt }; });
      }
      const name = String((snap.data() || {}).vorname || '').trim().slice(0, C.nameMaxLaenge) || 'Taucher';
      return db.collection(C.cloud.stand).doc(id).get().then(st => {
        const fern = st.exists ? st.data() : null;
        if (!fern && !S.vorhanden(code)) {
          /* Ganz neu: Erst die Klasse, dann wird der Stand angelegt. */
          wartend = { code, name };
          return { ok: true, name, brauchtKlasse: true, ohneNetz: false };
        }
        return oeffnen(code, name, fern, fern ? fern.klasse : null);
      });
    });
  }

  function oeffnen(code, name, fern, klasse) {
    const r = S.oeffnen(code, { name, klasse: C.klassen.includes(Number(klasse)) ? Number(klasse) : C.klasseStandard });
    if (!r.kind) throw { kindText: TEXT.unlesbar };
    kind = { code, name };
    wartend = null;
    nachholen = null;
    bereit = true;
    /* Den fernen Stand sofort einrechnen, damit das Kind auf einem neuen Gerät gleich alles sieht.
       Das Zurückschreiben läuft nebenher. */
    if (fern) vorab(fern);
    melden('ok');
    schreiben().catch(() => {});
    return { ok: true, name, brauchtKlasse: false, ohneNetz: false, gespeichert: r.ok };
  }

  /* Ferner Stand in den Stand auf dem Gerät einrechnen, ohne die Abgleichsbasis zu ändern:
     Die Basis ändert sich erst, wenn das Ergebnis wirklich in der Datenbank steht. */
  function vorab(fern) {
    const vorher = S.schnappschuss();
    const zusammen = M.stand(S.abgleichsBasis(), vorher.stand, fern);
    const k = S.aktiv();
    k.klasse = zusammen.klasse;
    k.aufgaben = zusammen.aufgaben;
    k.schwarm = zusammen.schwarm;
    k.stempel = zusammen.stempel;
    /* Die Lernzeit bleibt bis zum echten Abgleich, sonst würde der eigene Zuwachs doppelt gezählt. */
  }

  /* Die Klasse eines ganz neuen Kindes. Danach ist der Stand angelegt. */
  function klasseWaehlen(klasse) {
    if (!wartend) return { ok: false, grund: TEXT.sonst };
    if (!C.klassen.includes(Number(klasse))) return { ok: false, grund: 'Tippe bitte auf deine Klasse.' };
    try { return oeffnen(wartend.code, wartend.name, null, klasse); }
    catch (e) { return { ok: false, grund: (e && e.kindText) || TEXT.sonst }; }
  }

  /* ---------- Schreiben = Zusammenführen ---------- */
  function spaeter(ms = C.cloud.schreibPauseMs) {
    if (!bereit) return;
    clearTimeout(timer);
    timer = setTimeout(() => { schreiben().catch(() => {}); }, ms);
  }

  /* Liest in einer Transaktion den fernen Stand, führt zusammen und schreibt nur, wenn sich etwas ändert.
     Läuft schon ein Schreiben, wird danach noch einmal geschrieben. */
  function schreiben() {
    if (!bereit || !kind || S.code() !== kind.code) return Promise.resolve(false);
    clearTimeout(timer);
    if (laeuft) return laeuft.then(() => schreiben());
    const ref = db.collection(C.cloud.stand).doc(idVon(kind.code));
    const vorher = S.schnappschuss();
    const basis = S.abgleichsBasis();
    const fuer = kind.code;
    let zusammen = null;
    melden('wartet');
    laeuft = db.runTransaction(t => t.get(ref).then(snap => {
      const fern = snap.exists ? snap.data() : null;
      zusammen = M.stand(basis, vorher.stand, fern);
      if (!fern || !M.gleich(zusammen, fern)) t.set(ref, zusammen);
    })).then(() => {
      laeuft = null;
      /* Inzwischen abgemeldet oder ein anderes Kind? Dann nichts mehr anfassen. */
      if (!bereit || !kind || kind.code !== fuer || S.code() !== fuer) return false;
      const nochmal = S.abgleichUebernehmen(zusammen, vorher);
      melden('ok');
      if (nochmal) spaeter();
      return true;
    }, e => {
      laeuft = null;
      if (istNetzFehler(e) || !e || !e.code) {
        /* Ohne Netz kommt keine Transaktion zustande. Der Stand liegt sicher auf dem Gerät. */
        spaeter(C.cloud.nochmalMs);
        return false;
      }
      melden('fehler', fehlerText(e));
      return false;
    });
    return laeuft;
  }

  /* Wieder Netz: Wer nur auf dem Gerät geöffnet war, wird jetzt still angemeldet. */
  function wiederNetz() {
    if (bereit) { spaeter(500); return Promise.resolve(); }
    if (!nachholen || !aktiv) return Promise.resolve();
    const code = nachholen;
    if (S.code() !== code) { nachholen = null; return Promise.resolve(); }
    const mail = mailVon(code);
    return auth.signInWithEmailAndPassword(mail, code)
      .catch(e => {
        if (e && (e.code === 'auth/user-not-found' || e.code === 'auth/invalid-credential')) return auth.createUserWithEmailAndPassword(mail, code);
        throw e;
      })
      .then(() => { if (S.code() === code) return nachAnmeldung(code); })
      .catch(() => { /* beim nächsten Mal wieder */ });
  }

  /* ---------- Abmelden ---------- */
  /* Schreibt vorher noch einmal. Der Stand bleibt auf dem Gerät liegen (für Zeiten ohne Netz). */
  function abmelden() {
    clearTimeout(timer);
    const fertig = () => {
      bereit = false; kind = null; wartend = null; nachholen = null;
      S.abmelden();
      melden('ok');
      return auth ? auth.signOut().catch(() => {}) : undefined;
    };
    return (bereit ? schreiben().catch(() => {}) : Promise.resolve()).then(fertig);
  }

  S.beiAenderung(() => spaeter());
  /* Beim Verlassen der Seite noch schnell schreiben */
  window.addEventListener('pagehide', () => { schreiben().catch(() => {}); });
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') schreiben().catch(() => {}); });
  window.addEventListener('online', () => { wiederNetz(); });

  ZS.cloud = {
    TEXT,
    start,
    anmelden,
    klasseWaehlen,
    abmelden,
    schreiben,
    wiederNetz,
    aktiv: () => aktiv,
    angemeldet: () => bereit,
    kind: () => kind,
    zustand: () => zustand,
    beiZustand(f) { if (!zuhoerer.includes(f)) zuhoerer.push(f); f(zustand); }
  };
})();
