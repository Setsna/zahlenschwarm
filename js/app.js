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
  const ZIER = `<svg class="zier" viewBox="0 0 60 16" aria-hidden="true" focusable="false"><path d="M2 8H18M42 8H58" style="stroke:var(--zier)" stroke-width="1.6" stroke-linecap="round"/><circle cx="23" cy="8" r="2.6" style="fill:var(--zier)"/><circle cx="30" cy="8" r="2.6" style="fill:var(--zier)"/><circle cx="37" cy="8" r="2.6" style="fill:var(--zier)"/></svg>`;
  const TUPFI = `<img class="tupfi" src="bilder/tupfi.png?b=${ZS.config.bildStand}" alt="" width="256" height="256">`;
  /* "← Zurück" oben links, an derselben Stelle wie beim Üben (Ingo, 11.11.2026) */
  const zurueckOben = () => '<div class="zurueck-oben"><button type="button" class="knopf leise-knopf knopf--klein" data-aktion="start">← Zurück</button></div>';
  /* Erklärung der Tupfen auf den Reihen-Kacheln (Ingo, 11.11.2026) */
  const TUPFEN_LEGENDE = '<p class="tupfen-legende hof"><span class="legende-punkt"><i class="rt rt--sicher" aria-hidden="true"></i>sitzt sicher</span><span class="legende-punkt"><i class="rt rt--uebt" aria-hidden="true"></i>übst du noch</span><span class="legende-punkt"><i class="rt rt--neu" aria-hidden="true"></i>neu</span></p>';
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
          <fieldset class="klassenwahl" aria-describedby="klasse-hinweis">
            <legend>In welche Klasse gehst du?</legend>
            <div class="klassen-knoepfe">${ZS.config.klassen.map(n => `<label class="klasse-wahl"><input type="radio" name="klasse" value="${n}"><span>Klasse ${n}</span></label>`).join('')}</div>
            <p id="klasse-hinweis" class="hinweis-feld" aria-live="polite"></p>
          </fieldset>
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
      const wahl = app.querySelector('input[name="klasse"]:checked');
      const r = S.anlegen(feld.value, wahl ? wahl.value : null);
      app.querySelector('#name-hinweis').textContent = '';
      app.querySelector('#klasse-hinweis').textContent = '';
      if (!r.kind) {
        if (r.feld === 'klasse') { app.querySelector('#klasse-hinweis').textContent = r.grund; app.querySelector('input[name="klasse"]').focus(); }
        else { app.querySelector('#name-hinweis').textContent = r.grund; feld.focus(); }
        return;
      }
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
    { id: 'geteilt', titel: 'Geteilt', text: 'Die Umkehraufgaben', bald: false },
    { id: 'plusminus', titel: 'Plus und Minus', text: 'Rechnen im Kopf bis 1000', bald: false }
  ];
  function bereichKarte(b) {
    const inhalt = `<span class="bereich__titel">${esc(b.titel)}</span><span class="bereich__text">${esc(b.text)}</span>${b.bald ? '<span class="bereich__status">Bald</span>' : ''}`;
    return b.bald
      ? `<li><div class="fenster bereich bereich--bald">${inhalt}<span class="nurvorlesen">, kommt bald</span></div></li>`
      : `<li><button type="button" class="fenster bereich" data-aktion="bereich" data-id="${b.id}">${inhalt}</button></li>`;
  }

  function ansichtStart() {
    S.nachtragen();
    const k = S.aktiv();
    const mehrere = S.kinder().length > 1;
    zeigen(`
      ${kopf(`Hallo, ${esc(k.name)}!`, 'Ich bin Tupfi. Was möchtest du heute üben?')}
      <p class="klasse-zeile hof">Klasse ${k.klasse}</p>
      ${S.istVorschau ? `<p class="einleitung hof">Vorschau: ${Object.keys(k.schwarm).length} sichere Aufgaben.</p>` : ''}
      ${heuteKarte()}
      <section class="bereiche-block" aria-labelledby="h-bereiche">
        <h2 id="h-bereiche" class="abschnitt hof">Wohin schwimmst du heute?</h2>
        <ul class="bereiche">${BEREICHE.map(b => bereichKarte(b.id === 'plusminus' && k.klasse >= 4 ? { ...b, text: 'Rechnen im Kopf bis 1\u202F000\u202F000' } : b)).join('')}</ul>
      </section>
      <p class="knopfreihe">
        <button type="button" class="knopf" data-aktion="tauchbuch">Mein Tauchbuch</button>
        ${S.istVorschau ? '' : `${mehrere ? '<button type="button" class="knopf leise-knopf" data-aktion="wer">Kind wechseln</button>' : ''}
        <button type="button" class="knopf leise-knopf" data-aktion="neu">Neues Kind anlegen</button>`}
      </p>
      ${erwachsene()}`, `Hallo, ${k.name}`);
  }

  /* ---------- Reihen-Auswahl (Einmaleins und Geteilt) ---------- */
  /* Etappe 4a: alle Reihen offen, das Kind wählt selbst, "Heute bereit für dich" empfiehlt.
     Etappe 4b: Geteilt hat dieselben Reihen ("durch 2", "durch 5" …) mit eigenem Lernstand. */
  const OFFENE_REIHEN = ZS.config.reihenFolge.slice();
  const ARTEN = {
    mal: { titel: 'Einmaleins', frage: 'Welche Reihe übst du heute?', kachel: r => [`${r}er`, 'Reihe'], kurz: r => `${r}er`, stufen: 'stufenmal' },
    geteilt: { titel: 'Geteilt', frage: 'Durch welche Zahl teilst du heute?', kachel: r => [`: ${r}`, `durch ${r}`], kurz: r => `durch ${r}`, stufen: 'stufengeteilt' }
  };
  /* Klasse 4: Mal und Geteilt mit Stufenzahlen (Etappe 7b). Beispiel auf der Kachel ohne Lösung. */
  const STUFEN = {
    plusgross: { name: 'Plus bis 1\u202F000\u202F000', zurueck: 'plusminus' },
    minusgross: { name: 'Minus bis 1\u202F000\u202F000', zurueck: 'plusminus' },
    stufenmal: { name: 'Mal mit Stufenzahlen', zurueck: 'mal', beispiel: '30 · 4, 300 · 4, 3\u202F000 · 4, 30 · 40' },
    stufengeteilt: { name: 'Geteilt mit Stufenzahlen', zurueck: 'geteilt', beispiel: '120 : 4, 1\u202F200 : 4, 12\u202F000 : 4, 1\u202F200 : 40' }
  };
  const klasse4 = () => S.aktiv() && S.aktiv().klasse >= 4;
  /* Kennzeichen auf jeder Klasse-4-Kachel (statt einer eigenen Überschrift, Design-Review Klasse 4) */
  const KLASSE4_MARKE = '<span class="marke-k4">Klasse 4</span>';
  function stufenKachel(art) {
    const st = ARTEN[art].stufen;
    return `<button type="button" class="fenster bereich gemischt stufen" data-aktion="stufen" data-art="${st}">${KLASSE4_MARKE}<span class="bereich__titel">Mit Stufenzahlen</span><span class="bereich__text">${STUFEN[st].beispiel}</span>${reihenTupfen(null, st, ZS.aufgaben.formate(st))}</button>`;
  }
  const reiheVon = (r, art) => ZS.aufgaben.reihe(r, art);
  /* Begonnene Reihen: mindestens eine Aufgabe schon geübt */
  const begonneneReihen = art => OFFENE_REIHEN.filter(r => reiheVon(r, art).some(a => ZS.lernstand.eintrag(S.aktiv(), a.id).box > 0));
  /* 10 Tupfen je Reihe: gefüllt = sicher, halb = übe ich noch, leer = neu */
  function reihenTupfen(r, art, aufgaben = reiheVon(r, art)) {
    const k = S.aktiv();
    const st = ZS.lernstand.reiheStand(k, aufgaben);
    const punkte = aufgaben.map(a => `<i class="rt rt--${ZS.lernstand.status(ZS.lernstand.eintrag(k, a.id))}"></i>`).join('');
    return `<span class="reihen-tupfen${aufgaben.length === 6 ? ' reihen-tupfen--6' : ''}" aria-hidden="true">${punkte}</span><span class="nurvorlesen">, ${st.sicher} von ${st.gesamt} sicher</span>`;
  }

  function ansichtReihen(art = 'mal') {
    const A_ = ARTEN[art];
    const kacheln = OFFENE_REIHEN.map(r => {
      const [gross, klein] = A_.kachel(r);
      return `<li><button type="button" class="fenster bereich reihe reihe--offen" data-aktion="reihe" data-art="${art}" data-r="${r}"><span class="reihe__zahl">${esc(gross)}</span><span class="bereich__text">${esc(klein)}</span>${reihenTupfen(r, art)}</button></li>`;
    }).join('');
    /* Gemischt: Aufgaben aus allen begonnenen Reihen */
    const begonnen = begonneneReihen(art);
    const gemischt = begonnen.length
      ? `<button type="button" class="fenster bereich gemischt" data-aktion="gemischt" data-art="${art}"><span class="bereich__titel">Gemischt</span><span class="bereich__text">Aufgaben aus deinen Reihen: ${begonnen.map(A_.kurz).join(', ')}</span></button>`
      : `<div class="fenster bereich gemischt bereich--bald"><span class="bereich__titel">Gemischt</span><span class="bereich__text">Geht los, sobald du eine Reihe geübt hast.</span></div>`;
    zeigen(`
      ${zurueckOben()}
      ${kopf(A_.titel, A_.frage, false)}
      <section class="bereiche-block" aria-label="Reihen">
        <ul class="bereiche reihen">${kacheln}</ul>
        ${TUPFEN_LEGENDE}
        ${klasse4() ? `<div class="kachel-paar">${gemischt}${stufenKachel(art)}</div>` : gemischt}
      </section>
`, A_.titel);
  }

  /* ---------- Plus und Minus: zwei Kacheln mit je 6 Tupfen (ein Tupfen je Format) ---------- */
  const PM = {
    plus: { zeichen: '+', name: 'Plus im Kopf' },
    minus: { zeichen: ZS.aufgaben.MINUS, name: 'Minus im Kopf' }
  };
  const pmBegonnen = () => ['plus', 'minus'].filter(op => ZS.aufgaben.formate(op).some(a => ZS.lernstand.eintrag(S.aktiv(), a.id).box > 0));
  function ansichtPlusMinus() {
    const kacheln = ['plus', 'minus'].map(op => `<li><button type="button" class="fenster bereich reihe reihe--offen" data-aktion="pm" data-op="${op}"><span class="reihe__zahl">${PM[op].zeichen}</span><span class="bereich__text">${PM[op].name}</span>${reihenTupfen(null, op, ZS.aufgaben.formate(op))}</button></li>`).join('');
    const begonnen = pmBegonnen();
    const gemischt = begonnen.length
      ? `<button type="button" class="fenster bereich gemischt" data-aktion="pm-gemischt"><span class="bereich__titel">Gemischt</span><span class="bereich__text">Aufgaben aus: ${begonnen.map(op => PM[op].name).join(', ')}</span></button>`
      : `<div class="fenster bereich gemischt bereich--bald"><span class="bereich__titel">Gemischt</span><span class="bereich__text">Geht los, sobald du Plus oder Minus geübt hast.</span></div>`;
    zeigen(`
      ${zurueckOben()}
      ${kopf('Plus und Minus', `Rechnen im Kopf bis ${klasse4() ? '1\u202F000\u202F000' : '1000'}. Was übst du heute?`, false)}
      <section class="bereiche-block" aria-label="Plus und Minus">
        <ul class="bereiche zwei">${kacheln}</ul>
        ${klasse4() ? `<ul class="bereiche zwei">${ZS.aufgaben.GROSS_ARTEN.map(st => `<li><button type="button" class="fenster bereich reihe reihe--offen" data-aktion="stufen" data-art="${st}">${KLASSE4_MARKE}<span class="reihe__zahl">${st === 'plusgross' ? '+' : ZS.aufgaben.MINUS}</span><span class="bereich__text">${STUFEN[st].name}</span>${reihenTupfen(null, st, ZS.aufgaben.formate(st))}</button></li>`).join('')}</ul>` : ''}
        ${TUPFEN_LEGENDE}
        ${gemischt}
      </section>
`, 'Plus und Minus');
  }

  /* Endlos üben (Ingo: kein Rundenende), Auswahl nach Lernstand. "Zurück" führt zurück.
     Bei Plus/Minus sind die Kandidaten Formate; konkret() macht daraus jedes Mal eine neue Aufgabe. */
  /* Titel in der Üben-Leiste, damit das Kind sieht, was es gerade übt (Design-Review) */
  const reihenTitel = (art, r) => art === 'geteilt' ? `Geteilt durch ${r}` : `${r}er-Reihe`;
  function rundeStarten(kandidaten, zurueck, titel = '') {
    const neuInReihenfolge = kandidaten.some(a => a.platzhalter);
    melden('');
    ZS.ueben.starte({
      waehler: verlauf => ZS.aufgaben.konkret(ZS.lernstand.naechste({ kandidaten, kind: S.aktiv(), verlauf, neuInReihenfolge }).aufgabe, Math.random, S.aktiv()),
      fertig: (ergebnisse, abgebrochen, neu = {}) => {
        zurueck();
        const n = neu.fische || 0;
        if (n) melden(`Schön geübt! ${n === 1 ? '1 neuer Fisch' : `${n} neue Fische`} für deinen Schwarm.`);
      },
      titel
    });
  }

  /* ---------- Heute bereit für dich ---------- */
  /* Schaut über alle Bereiche. Reihenfolge: 2er, durch 2, Plus, 5er, durch 5, Minus, dann die übrigen Reihen.
     So kommt eine Geteilt-Reihe erst dran, wenn die Malreihe dazu fast sicher ist. Keine Zahlen, damit kein Druck entsteht. */
  function heuteReihen() {
    const liste = [];
    OFFENE_REIHEN.forEach((nr, i) => {
      for (const art of ['mal', 'geteilt']) liste.push({ nr: `${art}:${nr}`, aufgaben: reiheVon(nr, art) });
      if (i === 0) liste.push({ nr: 'plus:alle', aufgaben: ZS.aufgaben.formate('plus') });
      if (i === 1) liste.push({ nr: 'minus:alle', aufgaben: ZS.aufgaben.formate('minus') });
    });
    if (klasse4()) for (const st of [...ZS.aufgaben.STUFEN_ARTEN, ...ZS.aufgaben.GROSS_ARTEN]) liste.push({ nr: `${st}:alle`, aufgaben: ZS.aufgaben.formate(st) });
    return liste;
  }
  function heuteKarte() {
    const e = ZS.lernstand.empfehlung(S.aktiv(), heuteReihen());
    if (!e.reihe) return '';
    const [art, nr] = e.reihe.split(':');
    const name = PM[art] ? PM[art].name : STUFEN[art] ? STUFEN[art].name : art === 'geteilt' ? `Geteilt durch ${nr}` : `${nr}er-Reihe`;
    const text = {
      faellig: `${name}: Ein paar Aufgaben warten auf dich.`,
      neu: `Neu für dich: ${art === 'mal' ? `die ${nr}er-Reihe` : name}.`,
      weiter: `${name}: Es gibt noch neue Aufgaben für dich.`,
      fertig: 'Heute ist alles geschafft. Du kannst trotzdem weiterüben.'
    }[e.art];
    const knopf = e.art === 'fertig' ? 'Weiterüben' : "Los geht's";
    return `
      <section class="fenster heute" aria-labelledby="h-heute">
        <h2 id="h-heute">Heute bereit für dich</h2>
        <p>${esc(text)}</p>
        <p><button type="button" class="knopf haupt" data-aktion="heute" data-art="${art}" data-r="${nr}">${knopf}</button></p>
      </section>`;
  }

  /* ---------- Mein Tauchbuch (Etappe 5a) ---------- */
  /* Schwarm als SVG: Plätze wachsen von der Mitte nach außen (ovaler Schwarm), feste Verschiebung je Platz,
     damit jedes Kind bei gleicher Fischzahl dasselbe Bild sieht. Farbe = Bereich. */
  const SCHWARM_PLAETZE = (() => {
    const plaetze = [];
    for (let r = 0; r < 12; r++) for (let c = 0; c < 24; c++) {
      const x = 22 + c * 24 + (r % 2 ? 12 : 0) + Math.sin(r * 7.3 + c * 3.1) * 4;
      const y = 18 + r * 22 + Math.cos(r * 2.7 + c * 5.9) * 4;
      plaetze.push({ x, y, d: ((x - 300) / 300) ** 2 + ((y - 140) / 140) ** 2 });
    }
    return plaetze.sort((p, q) => p.d - q.d).slice(0, ZS.tauchbuch.HOECHSTENS_FISCHE);
  })();
  function schwarmGross(fische) {
    const F = ZS.tauchbuch.FARBE;
    const svg = fische.map((f, i) => {
      const p = SCHWARM_PLAETZE[i], c = F[f.bereich] || F.mal;
      return `<g transform="translate(${p.x.toFixed(1)} ${p.y.toFixed(1)})"><path d="M-8 0 L-13 -4.5 L-13 4.5 Z" style="fill:${c.rand}"/><ellipse rx="8" ry="5" style="fill:${c.voll};stroke:${c.rand}" stroke-width="1"/><circle cx="4" cy="-1" r="1.2" style="fill:var(--navy)"/></g>`;
    }).join('');
    /* Ausschnitt wächst mit: wenige Fische erscheinen größer, ab etwa 200 Fischen ist das ganze Feld voll */
    const genutzt = SCHWARM_PLAETZE.slice(0, Math.max(fische.length, 24));
    const xs = genutzt.map(p => p.x), ys = genutzt.map(p => p.y);
    const mx = (Math.min(...xs) + Math.max(...xs)) / 2, my = (Math.min(...ys) + Math.max(...ys)) / 2;
    const w = Math.min(600, Math.max(Math.max(...xs) - Math.min(...xs) + 50, (Math.max(...ys) - Math.min(...ys) + 40) * 600 / 280));
    const h = w * 280 / 600;
    const box = [mx - w / 2, my - h / 2, w, h].map(n => n.toFixed(1)).join(' ');
    return `<svg class="schwarm-gross" viewBox="${box}" role="img" aria-label="Dein Schwarm mit ${fische.length} ${fische.length === 1 ? 'Fisch' : 'Fischen'}">${svg}</svg>`;
  }

  const datum = t => new Date(t).toLocaleDateString('de-DE', { day: 'numeric', month: 'numeric', year: 'numeric' });

  function stempelKarte(st, k) {
    const T = ZS.tauchbuch, e = k.stempel[st.key];
    if (!e) return `<li class="stempel-platz">${T.stempelSvg(st, false)}<span class="stempel-name">${esc(st.titel)}</span><span class="nurvorlesen">, noch nicht gestempelt</span></li>`;
    const gefuehl = T.GEFUEHLE.find(g => g.wert === e.gefuehl);
    return `<li class="stempel-platz ist-gestempelt">${T.stempelSvg(st, true)}<span class="stempel-name">${esc(st.titel)}</span><span class="stempel-datum">${datum(e.t)}</span>${gefuehl ? `<span class="stempel-gefuehl">${esc(gefuehl.text)}</span>` : ''}</li>`;
  }

  /* Tupfi fragt immer nur nach einem Stempel ohne Selbsteinschätzung, damit die Ansicht ruhig bleibt */
  function gefuehlFrage(k) {
    const T = ZS.tauchbuch, st = T.stempelListe(k.klasse).find(x => k.stempel[x.key] && !k.stempel[x.key].gefuehl);
    if (!st) return '';
    return `<div class="tupfi-frage">
        <p id="tb-frage">Tupfi fragt: Wie fühlt sich ${esc(st.name)} an?</p>
        <div class="gefuehle" role="group" aria-labelledby="tb-frage">${T.GEFUEHLE.map(g => `<button type="button" class="knopf leise-knopf knopf--klein" data-aktion="gefuehl" data-key="${st.key}" data-wert="${g.wert}">${g.text}</button>`).join('')}</div>
      </div>`;
  }

  function ansichtTauchbuch() {
    S.nachtragen();
    const k = S.aktiv(), T = ZS.tauchbuch;
    const fische = T.fische(k);
    const alle = T.stempelListe(k.klasse);
    const gruppe = (g, titel) => `<h3>${titel}</h3><ul class="stempelfeld">${alle.filter(st => st.gruppe === g && !st.klasse4).map(st => stempelKarte(st, k)).join('')}</ul>`;
    const klasse4Stempel = alle.filter(st => st.klasse4);
    const kann = T.kannListe(k);
    const zeit = b => Number(k.zeit[b]) || 0;
    zeigen(`
      ${zurueckOben()}
      ${kopf('Mein Tauchbuch', `Hier siehst du, was du schon kannst${k.name ? `, ${esc(k.name)}` : ''}.`, false)}
      <section class="fenster tauchbuch" aria-labelledby="h-schwarm">
        <h2 id="h-schwarm">Mein Schwarm</h2>
        ${fische.length
          ? `${schwarmGross(fische)}<p class="schwarm-zahl">Dein Schwarm: ${fische.length} ${fische.length === 1 ? 'Fisch' : 'Fische'}</p>`
          : '<p>Noch ist dein Schwarm leer. Für jede Aufgabe, die du sicher kannst, kommt ein Fisch dazu.</p>'}
        <p class="leise schwarm-legende"><span class="punkt punkt--mal"></span> Einmaleins <span class="punkt punkt--geteilt"></span> Geteilt <span class="punkt punkt--plusminus"></span> Plus und Minus</p>
        <p class="leise">Ein Fisch bleibt in deinem Schwarm, auch wenn du die Aufgabe später noch einmal übst.</p>
      </section>
      <section class="fenster tauchbuch" aria-labelledby="h-stempel">
        <h2 id="h-stempel">Meine Stempel</h2>
        <p class="leise">Einen Stempel gibt es, wenn eine ganze Reihe sicher sitzt.</p>
        ${gefuehlFrage(k)}
        ${gruppe('mal', 'Einmaleins')}
        ${gruppe('geteilt', 'Geteilt')}
        ${gruppe('plusminus', 'Plus und Minus')}
        ${klasse4Stempel.length ? `<h3>Klasse 4</h3><ul class="stempelfeld">${klasse4Stempel.map(st => stempelKarte(st, k)).join('')}</ul>` : ''}
      </section>
      <section class="fenster tauchbuch" aria-labelledby="h-kann">
        <h2 id="h-kann">Das kann ich schon</h2>
        ${kann.length ? `<ul class="liste kann-liste">${kann.map(t => `<li>${esc(t)}</li>`).join('')}</ul>` : '<p>Hier steht bald, was du sicher kannst.</p>'}
      </section>
      <section class="fenster tauchbuch" aria-labelledby="h-zeit">
        <h2 id="h-zeit">Meine Lernzeit</h2>
        <dl class="zeit-liste">
          <div><dt>Einmaleins</dt><dd>${T.zeitText(zeit('mal'))}</dd></div>
          <div><dt>Geteilt</dt><dd>${T.zeitText(zeit('geteilt'))}</dd></div>
          <div><dt>Plus und Minus</dt><dd>${T.zeitText(zeit('plusminus'))}</dd></div>
          <div class="zeit-heute"><dt>Heute zusammen</dt><dd>${T.zeitText(S.heuteSek(k))}</dd></div>
        </dl>
      </section>
      <section class="fenster tauchbuch" aria-labelledby="h-klasse">
        <h2 id="h-klasse">Meine Klasse</h2>
        <p>Du übst die Aufgaben von Klasse ${k.klasse}.</p>
        <p><button type="button" class="knopf leise-knopf" data-aktion="klasse-frage"${S.istVorschau ? ' disabled' : ''}>Ich bin jetzt in Klasse ${andereKlasse(k)}</button></p>
      </section>
      <section class="fenster tauchbuch" aria-labelledby="h-neu-anfangen">
        <h2 id="h-neu-anfangen">Neu anfangen</h2>
        <p class="leise">Löscht deinen Schwarm, deine Stempel, deine Lernzeit und deinen Lernstand auf diesem Gerät. Die anderen Kinder bleiben.</p>
        <p><button type="button" class="knopf leise-knopf" data-aktion="loeschen-frage"${S.istVorschau ? ' disabled' : ''}>Alles löschen / Neu anfangen</button></p>
        ${S.istVorschau ? '<p class="leise">In der Vorschau wird nichts gelöscht.</p>' : ''}
      </section>
      <dialog class="dialog" id="klasse-dialog" aria-labelledby="kd-titel" aria-describedby="kd-text">
        <h2 id="kd-titel">Bist du jetzt in Klasse ${andereKlasse(k)}?</h2>
        <p id="kd-text">Dann bekommst du die Aufgaben von Klasse ${andereKlasse(k)}. Dein Schwarm, deine Stempel und dein Lernstand bleiben.</p>
        <p class="knopfreihe"><button type="button" class="knopf haupt" data-aktion="klasse-nein" autofocus>Nein, Klasse ${k.klasse} bleibt</button><button type="button" class="knopf leise-knopf" data-aktion="klasse-ja" data-klasse="${andereKlasse(k)}">Ja, Klasse ${andereKlasse(k)}</button></p>
      </dialog>
      <dialog class="dialog" id="loeschen-dialog" aria-labelledby="ld-titel" aria-describedby="ld-text">
        <h2 id="ld-titel">Wirklich alles löschen?</h2>
        <p id="ld-text">Alles von ${esc(k.name)} wird gelöscht: Schwarm, Stempel, Lernzeit und Lernstand. Das geht nicht rückgängig. Die anderen Kinder auf diesem Gerät bleiben.</p>
        <p class="knopfreihe"><button type="button" class="knopf haupt" data-aktion="loeschen-nein" autofocus>Nein, behalten</button><button type="button" class="knopf leise-knopf" data-aktion="loeschen-ja">Ja, alles löschen</button></p>
      </dialog>`, 'Mein Tauchbuch');
    /* Escape schließt wie "Nein, behalten" (mit Fokus zurück) */
    app.querySelector('#loeschen-dialog').addEventListener('cancel', e => { e.preventDefault(); loeschenNein(); });
    app.querySelector('#klasse-dialog').addEventListener('cancel', e => { e.preventDefault(); dialogZu('klasse-dialog', 'klasse-frage'); });
  }
  const andereKlasse = k => ZS.config.klassen.find(n => n !== k.klasse);

  /* Dialog zu, Fokus zurück auf den Knopf, der ihn geöffnet hat */
  function dialogZu(id, aktion) {
    const d = app.querySelector('#' + id);
    if (d && d.open) d.close();
    const b = app.querySelector(`[data-aktion="${aktion}"]`);
    if (b) b.focus();
  }
  function dialogAuf(id) {
    const d = app.querySelector('#' + id);
    if (d && typeof d.showModal === 'function') d.showModal();
  }
  function klasseJa(n) {
    const d = app.querySelector('#klasse-dialog');
    if (d && d.open) d.close();
    const ok = S.klasseSetzen(n);
    ansichtTauchbuch();
    const b = app.querySelector('[data-aktion="klasse-frage"]');
    if (b) b.focus();
    melden(ok ? `Du bist jetzt in Klasse ${n}.` : SPEICHER_FEHLT);
  }

  /* Dialog zu, Fokus zurück auf den Knopf, der ihn geöffnet hat */
  function loeschenNein() {
    const d = app.querySelector('#loeschen-dialog');
    if (d && d.open) d.close();
    const b = app.querySelector('[data-aktion="loeschen-frage"]');
    if (b) b.focus();
  }

  function loeschenFragen() {
    const d = app.querySelector('#loeschen-dialog');
    if (d && typeof d.showModal === 'function') d.showModal();
  }
  function loeschenJa() {
    const name = S.aktiv() ? S.aktiv().name : '';
    const d = app.querySelector('#loeschen-dialog');
    if (d && d.open) d.close();
    const ok = S.aktivLoeschen();
    S.kinder().length ? ansichtWer() : ansichtNeu();
    melden(ok ? `Alles von ${name} ist gelöscht.` : SPEICHER_FEHLT);
  }

  /* ---------- Für Lehrkräfte und Eltern (aufklappbar, am Ende jeder Startansicht) ---------- */
  function erwachsene() {
    return `
      <details class="fenster erwachsene">
        <summary><h2 id="h-erw">Für Lehrkräfte und Eltern</h2></summary>
        <div class="erwachsene__inhalt">
          <p>Der Zahlenschwarm ist ein Trainer für das Einmaleins, das Geteilt-Rechnen und das Rechnen im Kopf bis 1000. Er enthält zurzeit die Inhalte von Klasse 3: das kleine Einmaleins, die Umkehraufgaben und Plus und Minus im Kopf bis 1000. Beim Anlegen wählt jedes Kind seine Klasse. In Klasse 4 kommen Mal- und Geteilt-Aufgaben mit Stufenzahlen dazu (30 · 4, 300 · 4, 3 000 · 4, 30 · 40 und die Umkehraufgaben). Sie beruhen immer auf einer Aufgabe aus dem kleinen Einmaleins und werden über den Stellenwert erklärt. Dazu kommt Plus und Minus im Kopf bis 1 000 000 mit Tausendern, Hundertern und Zehntausendern, auch über den vollen Tausender oder Zehntausender, und das Ergänzen bis zu einer Stufenzahl (3 600 + ? = 10 000). Ändern lässt sich die Klasse im Tauchbuch.</p>

          <h3>So ist das Üben gedacht</h3>
          <p>Jede Aufgabe hat ihren eigenen Lernstand. Was ein Kind noch nicht sicher kann, kommt öfter und auch an späteren Tagen wieder. Was es sicher kann, kommt seltener. Als sicher gilt eine Aufgabe erst, wenn das Kind sie an mehreren Tagen zügig und ohne Tipp gelöst hat. Bei Plus und Minus zählt der Lernstand je Aufgabenart, zum Beispiel „Einer mit Übergang“.</p>
          <p>Bei einem Fehler zeigt die Seite einen Rechenweg Schritt für Schritt, zum Beispiel über eine leichte Kernaufgabe, statt nur die Lösung. Eine Uhr gibt es nicht. Die Seite merkt sich nur, wie lange ein Kind bis zur ersten getippten Ziffer überlegt. So erkennt sie, ob eine Aufgabe schon auswendig sitzt oder noch abgeleitet wird.</p>

          <div class="tabelle-rahmen">
            <table>
              <caption class="nurvorlesen">Prinzip und Umsetzung</caption>
              <thead><tr><th scope="col">Prinzip</th><th scope="col">Umsetzung im Zahlenschwarm</th></tr></thead>
              <tbody>
                <tr><th scope="row">Üben nach Lernstand</th><td>Jede Aufgabe wandert durch fünf Stufen. Eine falsche Aufgabe kommt kurz danach noch einmal und an den nächsten Tagen wieder.</td></tr>
                <tr><th scope="row">Verstehen vor Auswendiglernen</th><td>Fehler werden mit Kernaufgaben (mal 2, mal 5, mal 10), Tausch- und Umkehraufgaben erklärt, Plus und Minus in kleinen Schritten. Gestufte Tipps helfen, ohne die Lösung zu verraten.</td></tr>
                <tr><th scope="row">Kein Zeitdruck</th><td>Keine sichtbare Uhr, kein Countdown. Das Kind übt, so lange es möchte, und hört über „Zurück“ auf.</td></tr>
                <tr><th scope="row">Erfolg sichtbar machen</th><td>Im Tauchbuch wächst ein Fischschwarm: ein Fisch für jede Aufgabe, die zum ersten Mal sicher ist. Für jede ganze Reihe gibt es einen Stempel. Fische und Stempel gehen nie verloren.</td></tr>
                <tr><th scope="row">Sich selbst einschätzen</th><td>Bei jedem Stempel fragt Tupfi, wie sich die Reihe anfühlt: „Ganz leicht“, „Geht gut“ oder „Noch wackelig“. Die Antwort steht nur im Tauchbuch und wird nicht bewertet.</td></tr>
                <tr><th scope="row">Keine Vergleiche</th><td>Keine Punkte, keine Rangliste, kein Wettbewerb zwischen Kindern.</td></tr>
                <tr><th scope="row">Lehrplan</th><td>Lehrplan Thüringen Mathematik Grundschule 2026, Leitidee Zahl und Operation: Grundaufgaben aus Kernaufgaben ableiten, Tausch- und Umkehraufgaben nutzen, mündlich rechnen. Lernkompetenzen: eigene Lernfortschritte einschätzen.</td></tr>
              </tbody>
            </table>
          </div>

          <h3>Wie Sie zu Hause helfen können</h3>
          <ul class="liste">
            <li>Lieber oft und kurz als selten und lang: Zehn Minuten an mehreren Tagen bringen mehr als eine Stunde am Stück.</li>
            <li>Über Fehler sprechen statt sie zu tadeln. Fragen Sie: „Wie hast du gerechnet?“</li>
            <li>Das Einmaleins steckt im Alltag: Eierkartons, Fenster, Treppenstufen, Taschengeld.</li>
            <li>Nicht vorsagen. Geben Sie lieber einen Tipp, zum Beispiel: „Was ist 5 mal 8?“</li>
            <li>Schauen Sie gemeinsam ins Tauchbuch. Dort sieht Ihr Kind, was es schon sicher kann. Fragen Sie nach, wenn dort „Noch wackelig“ steht.</li>
          </ul>

          <h3>Daten</h3>
          <p>Es gibt kein Konto und keine Anmeldung. Gespeichert werden nur der Vorname, die Klasse, der Lernstand, der Schwarm, die Stempel und die Lernzeit, und zwar nur in diesem Browser auf diesem Gerät. Nichts wird an einen Server geschickt. Im Tauchbuch kann ein Kind seinen Stand ganz löschen. Mehr steht unter <a href="datenschutz.html">Datenschutz</a>.</p>
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
    else if (a === 'bereich' && ARTEN[b.dataset.id]) ansichtReihen(b.dataset.id);
    else if (a === 'reihe') { const art = b.dataset.art, r = Number(b.dataset.r); rundeStarten(reiheVon(r, art), () => ansichtReihen(art), reihenTitel(art, r)); }
    else if (a === 'gemischt') { const art = b.dataset.art; rundeStarten(begonneneReihen(art).flatMap(r => reiheVon(r, art)), () => ansichtReihen(art), art === 'geteilt' ? 'Geteilt gemischt' : 'Einmaleins gemischt'); }
    else if (a === 'heute') {
      const art = b.dataset.art, r = Number(b.dataset.r);
      if (PM[art]) rundeStarten(ZS.aufgaben.formate(art), ansichtStart, PM[art].name);
      else if (STUFEN[art]) rundeStarten(ZS.aufgaben.formate(art), ansichtStart, STUFEN[art].name);
      else rundeStarten(reiheVon(r, art), ansichtStart, reihenTitel(art, r));
    }
    else if (a === 'bereich' && b.dataset.id === 'plusminus') ansichtPlusMinus();
    else if (a === 'stufen' && STUFEN[b.dataset.art]) { const st = b.dataset.art; rundeStarten(ZS.aufgaben.formate(st), () => STUFEN[st].zurueck === 'plusminus' ? ansichtPlusMinus() : ansichtReihen(STUFEN[st].zurueck), STUFEN[st].name); }
    else if (a === 'pm') rundeStarten(ZS.aufgaben.formate(b.dataset.op), ansichtPlusMinus, PM[b.dataset.op].name);
    else if (a === 'pm-gemischt') rundeStarten(pmBegonnen().flatMap(op => ZS.aufgaben.formate(op)), ansichtPlusMinus, 'Plus und Minus gemischt');
    else if (a === 'start') ansichtStart();
    else if (a === 'tauchbuch') ansichtTauchbuch();
    else if (a === 'gefuehl') { S.gefuehlMerken(b.dataset.key, b.dataset.wert); ansichtTauchbuch(); melden('Danke! Das steht jetzt in deinem Tauchbuch.'); }
    else if (a === 'klasse-frage') dialogAuf('klasse-dialog');
    else if (a === 'klasse-nein') dialogZu('klasse-dialog', 'klasse-frage');
    else if (a === 'klasse-ja') klasseJa(Number(b.dataset.klasse));
    else if (a === 'loeschen-frage') loeschenFragen();
    else if (a === 'loeschen-nein') loeschenNein();
    else if (a === 'loeschen-ja') loeschenJa();
  });

  if (S.istVorschau) {
    const h = document.getElementById('vorschau-hinweis');
    h.hidden = false;
    h.textContent = 'Vorschau: Hier wird nichts gespeichert.';
  }
  anzeigen();

  ZS.app = { anzeigen, melden };
})();
