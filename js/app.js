/* Zahlenschwarm: Ansichten und Bedienung (Stand Etappe 1). */
(() => {
  'use strict';
  const S = ZS.speicher;
  const app = document.getElementById('app');
  const meldung = document.getElementById('meldung');
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /* Sichtbare Meldung oben, wird von Screenreadern angesagt (role=status). */
  function melden(text) {
    meldung.textContent = '';
    if (text) setTimeout(() => { meldung.textContent = text; }, 30);
  }
  const SPEICHER_FEHLT = 'Dein Stand konnte gerade nicht gespeichert werden. Vielleicht ist der Speicher voll oder ausgeschaltet. Bitte sag deiner Lehrkraft Bescheid.';

  /* ---------- Ansichten ---------- */
  function zeigen(html, titel) {
    app.innerHTML = html;
    document.title = titel ? `${titel} – Zahlenschwarm` : 'Zahlenschwarm';
    const h1 = app.querySelector('h1');
    if (h1 && !ersterAufruf) { h1.tabIndex = -1; h1.focus({ preventScroll: true }); }
    ersterAufruf = false;
  }
  let ersterAufruf = true;

  /* Kopf jeder Ansicht: Wortmarke, Zierlinie (drei Tupfen wie bei Tupfi), große Überschrift */
  const ZIER = `<svg class="zier" viewBox="0 0 60 16" aria-hidden="true" focusable="false"><path d="M2 8H18M42 8H58" stroke="#2d6f98" stroke-width="1.6" stroke-linecap="round"/><circle cx="23" cy="8" r="2.6" fill="#2d6f98"/><circle cx="30" cy="8" r="2.6" fill="#2d6f98"/><circle cx="37" cy="8" r="2.6" fill="#2d6f98"/></svg>`;
  const TUPFI = `<img class="tupfi" src="bilder/tupfi.png?b=${ZS.config.bildStand}" alt="" width="256" height="256">`;
  function kopf(titel, text = '', mitTupfi = true) {
    return `<header class="kopf">
        <a class="wortmarke" href="./">Zahlenschwarm${ZIER}</a>
        <h1 class="frage">${titel}</h1>
        ${mitTupfi ? TUPFI : ''}
        ${text ? `<p class="einleitung hof">${text}</p>` : ''}
      </header>`;
  }

  function ansichtNeu() {
    const andere = S.kinder().length > 0;
    zeigen(`
      ${kopf(andere ? 'Neues Kind' : 'Willkommen!', 'Ich bin Tupfi. Mit mir übst du das Einmaleins und das Rechnen im Kopf. In deinem Tempo.')}
      <section class="fenster mitte" aria-labelledby="h-neu">
        <h2 id="h-neu">Wie heißt du?</h2>
        <form id="neu-form" novalidate>
          <label for="name">Dein Vorname</label>
          <input type="text" id="name" name="name" autocomplete="off" autocapitalize="words" spellcheck="false" maxlength="${ZS.config.nameMaxLaenge}" aria-describedby="name-hinweis name-info">
          <p id="name-hinweis" class="hinweis-feld" aria-live="polite"></p>
          <p class="knopfreihe">
            <button type="submit" class="knopf haupt">Los geht's</button>
            ${andere ? '<button type="button" class="knopf leise-knopf" data-aktion="wer">Zurück</button>' : ''}
          </p>
        </form>
        <p id="name-info" class="leise">Dein Name bleibt nur auf diesem Gerät.</p>
      </section>
      ${andere ? '' : erwachsene()}`, andere ? 'Neues Kind' : '');
    app.querySelector('#neu-form').addEventListener('submit', e => {
      e.preventDefault();
      const feld = app.querySelector('#name');
      const r = S.anlegen(feld.value);
      if (!r.kind) { app.querySelector('#name-hinweis').textContent = r.grund; feld.focus(); return; }
      if (!r.ok) melden(SPEICHER_FEHLT);
      ansichtStart();
    });
  }

  function ansichtWer() {
    const liste = S.kinder().map(k => `<li><button type="button" class="knopf" data-aktion="waehlen" data-id="${esc(k.id)}">${esc(k.name)}</button></li>`).join('');
    zeigen(`
      ${kopf('Wer übt heute?', 'Tippe auf deinen Namen.')}
      <section class="fenster mitte" aria-label="Namen">
        <ul class="kinder-liste">${liste}</ul>
        <p><button type="button" class="knopf leise-knopf" data-aktion="neu">Ich bin neu hier</button></p>
      </section>
      ${erwachsene()}`, 'Wer übt heute?');
  }

  /* Die drei Bereiche. "bald": noch nicht gebaut (Etappe 2 bis 4). */
  const BEREICHE = [
    { id: 'mal', titel: 'Einmaleins', text: 'Reihe für Reihe oder gemischt', bald: false },
    { id: 'geteilt', titel: 'Geteilt', text: 'Die Umkehraufgaben', bald: true },
    { id: 'plusminus', titel: 'Plus und Minus', text: 'Rechnen im Kopf bis 1000', bald: true }
  ];
  function bereichKarte(b) {
    const inhalt = `<span class="bereich__titel">${esc(b.titel)}</span><span class="bereich__text">${esc(b.text)}</span>${b.bald ? '<span class="bereich__status">Bald</span>' : ''}`;
    return b.bald
      ? `<li><div class="fenster bereich bereich--bald">${inhalt}<span class="nurvorlesen">, kommt bald</span></div></li>`
      : `<li><button type="button" class="fenster bereich" data-aktion="bereich" data-id="${b.id}">${inhalt}</button></li>`;
  }

  function ansichtStart() {
    const k = S.aktiv();
    const mehrere = S.kinder().length > 1;
    zeigen(`
      ${kopf(`Hallo, ${esc(k.name)}!`, 'Ich bin Tupfi. Was möchtest du heute üben?')}
      ${S.istVorschau ? `<p class="einleitung hof">Vorschau: ${Object.keys(k.schwarm).length} sichere Aufgaben.</p>` : ''}
      ${heuteKarte()}
      <section class="bereiche-block" aria-labelledby="h-bereiche">
        <h2 id="h-bereiche" class="abschnitt hof">Wohin schwimmst du heute?</h2>
        <ul class="bereiche">${BEREICHE.map(bereichKarte).join('')}</ul>
        <p class="einleitung hof">Geteilt und Plus und Minus kommen bald.</p>
      </section>
      ${S.istVorschau ? '' : `<p class="knopfreihe">
        ${mehrere ? '<button type="button" class="knopf leise-knopf" data-aktion="wer">Kind wechseln</button>' : ''}
        <button type="button" class="knopf leise-knopf" data-aktion="neu">Neues Kind anlegen</button>
      </p>`}
      ${erwachsene()}`, `Hallo, ${k.name}`);
  }

  /* ---------- Einmaleins: Reihen-Auswahl ---------- */
  /* Etappe 4a: alle Reihen offen, das Kind wählt selbst, "Heute bereit für dich" empfiehlt */
  const OFFENE_REIHEN = ZS.config.reihenFolge.slice();
  /* Begonnene Reihen: mindestens eine Aufgabe schon geübt */
  const begonneneReihen = () => OFFENE_REIHEN.filter(r => ZS.aufgaben.reihe(r).some(a => ZS.lernstand.eintrag(S.aktiv(), a.id).box > 0));
  /* 10 Tupfen je Reihe: gefüllt = sicher, halb = übe ich noch, leer = neu */
  function reihenTupfen(r) {
    const k = S.aktiv(), aufgaben = ZS.aufgaben.reihe(r);
    const st = ZS.lernstand.reiheStand(k, aufgaben);
    const punkte = aufgaben.map(a => `<i class="rt rt--${ZS.lernstand.status(ZS.lernstand.eintrag(k, a.id))}"></i>`).join('');
    return `<span class="reihen-tupfen" aria-hidden="true">${punkte}</span><span class="nurvorlesen">, ${st.sicher} von ${st.gesamt} sicher</span>`;
  }

  function ansichtReihen() {
    const kacheln = ZS.config.reihenFolge.map(r => OFFENE_REIHEN.includes(r)
      ? `<li><button type="button" class="fenster bereich reihe reihe--offen" data-aktion="reihe" data-r="${r}"><span class="reihe__zahl">${r}er</span><span class="bereich__text">Reihe</span>${reihenTupfen(r)}</button></li>`
      : `<li><div class="fenster bereich reihe bereich--bald"><span class="reihe__zahl">${r}er</span><span class="bereich__text">Reihe</span><span class="bereich__status">Bald</span><span class="nurvorlesen">, kommt bald</span></div></li>`).join('');
    /* Gemischt: Aufgaben aus allen begonnenen Reihen */
    const begonnen = begonneneReihen();
    const gemischt = begonnen.length
      ? `<button type="button" class="fenster bereich gemischt" data-aktion="gemischt"><span class="bereich__titel">Gemischt</span><span class="bereich__text">Aufgaben aus deinen Reihen: ${begonnen.map(r => `${r}er`).join(', ')}</span></button>`
      : `<div class="fenster bereich gemischt bereich--bald"><span class="bereich__titel">Gemischt</span><span class="bereich__text">Geht los, sobald du eine Reihe geübt hast.</span></div>`;
    zeigen(`
      ${kopf('Einmaleins', 'Welche Reihe übst du heute?', false)}
      <section class="bereiche-block" aria-label="Reihen">
        <ul class="bereiche reihen">${kacheln}</ul>
        ${gemischt}
      </section>
      <p class="knopfreihe"><button type="button" class="knopf leise-knopf" data-aktion="start">Zurück</button></p>`, 'Einmaleins');
  }

  /* Endlos üben (Ingo: kein Rundenende), Auswahl nach Lernstand. "Zurück" führt zurück. */
  function rundeStarten(r, zurueck = ansichtReihen, kandidaten = ZS.aufgaben.reihe(r)) {
    ZS.ueben.starte({
      waehler: verlauf => ZS.lernstand.naechste({ kandidaten, kind: S.aktiv(), verlauf }).aufgabe,
      fertig: () => zurueck()
    });
  }

  /* ---------- Heute bereit für dich ---------- */
  /* Keine Zahlen, damit kein Druck entsteht */
  function heuteKarte() {
    const reihen = OFFENE_REIHEN.map(nr => ({ nr, aufgaben: ZS.aufgaben.reihe(nr) }));
    const e = ZS.lernstand.empfehlung(S.aktiv(), reihen);
    if (!e.reihe) return '';
    const text = {
      faellig: `${e.reihe}er-Reihe: Ein paar Aufgaben warten auf dich.`,
      neu: `Neu für dich: die ${e.reihe}er-Reihe.`,
      weiter: `${e.reihe}er-Reihe: Es gibt noch neue Aufgaben für dich.`,
      fertig: 'Heute ist alles geschafft. Du kannst trotzdem weiterüben.'
    }[e.art];
    const knopf = e.art === 'fertig' ? 'Weiterüben' : "Los geht's";
    return `
      <section class="fenster heute" aria-labelledby="h-heute">
        <h2 id="h-heute">Heute bereit für dich</h2>
        <p>${esc(text)}</p>
        <p><button type="button" class="knopf haupt" data-aktion="heute" data-r="${e.reihe}">${knopf}</button></p>
      </section>`;
  }

  /* ---------- Für Lehrkräfte und Eltern (aufklappbar, am Ende jeder Startansicht) ---------- */
  function erwachsene() {
    return `
      <details class="fenster erwachsene">
        <summary><h2 id="h-erw">Für Lehrkräfte und Eltern</h2></summary>
        <div class="erwachsene__inhalt">
          <p>Der Zahlenschwarm ist ein Trainer für das Einmaleins, das Geteilt-Rechnen und das Rechnen im Kopf bis 1000 für die Klassen 3 und 4. Er wird gerade gebaut; die Übungen kommen Schritt für Schritt dazu.</p>

          <h3>So ist das Üben gedacht</h3>
          <p>Jede Aufgabe hat ihren eigenen Lernstand. Was ein Kind noch nicht sicher kann, kommt öfter und auch an späteren Tagen wieder. Was es sicher kann, kommt seltener. Bei einem Fehler zeigt die Seite einen Rechenweg, zum Beispiel über eine leichte Kernaufgabe, statt nur die Lösung. Eine Uhr gibt es nicht. Die Seite merkt sich nur, wie lange ein Kind bis zur ersten getippten Ziffer überlegt. So erkennt sie, ob eine Aufgabe schon auswendig sitzt oder noch abgeleitet wird.</p>

          <div class="tabelle-rahmen">
            <table>
              <caption class="nurvorlesen">Prinzip und Umsetzung</caption>
              <thead><tr><th scope="col">Prinzip</th><th scope="col">Umsetzung im Zahlenschwarm</th></tr></thead>
              <tbody>
                <tr><th scope="row">Üben nach Lernstand</th><td>Jede Aufgabe wandert durch fünf Stufen. Unsichere Aufgaben kommen in derselben Runde und an den nächsten Tagen wieder.</td></tr>
                <tr><th scope="row">Verstehen vor Auswendiglernen</th><td>Fehler werden mit Kernaufgaben (mal 2, mal 5, mal 10), Tausch- und Umkehraufgaben erklärt.</td></tr>
                <tr><th scope="row">Kein Zeitdruck</th><td>Keine sichtbare Uhr, kein Countdown. Kurze Runden mit zehn Aufgaben.</td></tr>
                <tr><th scope="row">Erfolg sichtbar machen</th><td>Der eigene Fischschwarm wächst mit jeder sicheren Aufgabe. Fische gehen nie verloren.</td></tr>
                <tr><th scope="row">Keine Vergleiche</th><td>Keine Punkte, keine Rangliste, kein Wettbewerb zwischen Kindern.</td></tr>
                <tr><th scope="row">Lehrplan</th><td>Lehrplan Thüringen Mathematik Grundschule 2026, Leitidee Zahl und Operation: Grundaufgaben aus Kernaufgaben ableiten und gedächtnismäßig wiedergeben.</td></tr>
              </tbody>
            </table>
          </div>

          <h3>Wie Sie zu Hause helfen können</h3>
          <ul class="liste">
            <li>Lieber oft und kurz als selten und lang: Zehn Minuten an mehreren Tagen bringen mehr als eine Stunde am Stück.</li>
            <li>Über Fehler sprechen statt sie zu tadeln. Fragen Sie: „Wie hast du gerechnet?“</li>
            <li>Das Einmaleins steckt im Alltag: Eierkartons, Fenster, Treppenstufen, Taschengeld.</li>
            <li>Nicht vorsagen. Geben Sie lieber einen Tipp, zum Beispiel: „Was ist 5 mal 8?“</li>
          </ul>

          <h3>Daten</h3>
          <p>Es gibt kein Konto und keine Anmeldung. Gespeichert werden nur der Vorname und der Lernstand, und zwar nur in diesem Browser auf diesem Gerät. Nichts wird an einen Server geschickt. Mehr steht unter <a href="datenschutz.html">Datenschutz</a>.</p>
        </div>
      </details>`;
  }

  function anzeigen() {
    if (S.ladeFehler) melden('Dein gespeicherter Stand konnte nicht gelesen werden. Damit nichts verloren geht, speichert die Seite gerade nichts. Bitte sag deiner Lehrkraft Bescheid.');
    if (S.aktiv()) ansichtStart();
    else if (S.kinder().length) ansichtWer();
    else ansichtNeu();
  }

  /* ---------- Klicks ---------- */
  app.addEventListener('click', e => {
    const b = e.target.closest('[data-aktion]');
    if (!b || b.disabled) return;
    const a = b.dataset.aktion;
    if (a === 'waehlen') { S.waehlen(b.dataset.id); ansichtStart(); }
    else if (a === 'wer') { S.abmelden(); S.kinder().length ? ansichtWer() : ansichtNeu(); }
    else if (a === 'neu') { S.abmelden(); ansichtNeu(); }
    else if (a === 'bereich' && b.dataset.id === 'mal') ansichtReihen();
    else if (a === 'reihe') rundeStarten(Number(b.dataset.r));
    else if (a === 'gemischt') rundeStarten(null, ansichtReihen, begonneneReihen().flatMap(r => ZS.aufgaben.reihe(r)));
    else if (a === 'heute') rundeStarten(Number(b.dataset.r), ansichtStart);
    else if (a === 'start') ansichtStart();
  });

  if (S.istVorschau) {
    const h = document.getElementById('vorschau-hinweis');
    h.hidden = false;
    h.textContent = 'Vorschau: Hier wird nichts gespeichert.';
  }
  anzeigen();

  ZS.app = { anzeigen, melden };
})();
