/* Zahlenschwarm: Üben-Ansicht mit eigenem Ziffernfeld.
   - Ruhige Ansicht: Aufgabe, Eingabe, Ziffernfeld, Rückmeldung. Tupfi und Fortschritt am Rand.
   - Denkzeit = Zeit von der Anzeige bis zur ersten getippten Ziffer (nicht sichtbar).
   - "Prüfen" ist kurz gesperrt (Bedenkzeit, config.js).
   - Bedienbar mit Finger und Tastatur (Ziffern, Rücktaste, Enter).
   - Jede Antwort wird sofort gespeichert (ZS.speicher.antwortMerken).
   - Eine falsche Aufgabe kommt nach zwei anderen noch einmal (je Aufgabe einmal).
   - Mit "waehler" kommt endlos die jeweils nächste Aufgabe nach Lernstand (js/lernstand.js).
     Verlassen nur über "Zurück" (Ingo: kein Rundenende).
   - Lernzeit (Etappe 5a): je Aufgabe die Zeit, solange die Seite sichtbar ist, höchstens 2 Minuten je Aufgabe.
   - Neuer Fisch: kurzer Satz nach "Richtig!". Neuer Stempel: "Gestempelt!" mit Selbsteinschätzung, kein Weiterlaufen.
   - Ab 3 Fehlern bei einer Aufgabe am selben Tag erscheint Tipp 2 (Schwarm-Bild) von selbst. */
(() => {
  'use strict';
  const C = ZS.config, A = ZS.aufgaben;
  const app = document.getElementById('app');
  const live = document.getElementById('live');
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  let z = null; /* Zustand der laufenden Übung */

  /* Text sicher einsetzen und jede Rechnung wie "4 + 4 = 8" zusammenhalten, damit sie nicht umbricht */
  const RECHNUNG = /(\d+(?:\s[+·−:]\s\d+)+(?:\s=\s\d+)?)/g;
  const mitRechnungen = text => esc(text).replace(RECHNUNG, '<span class="rechnung">$1</span>');

  function ansagen(text) {
    live.textContent = '';
    setTimeout(() => { live.textContent = text; }, 30);
  }

  /* ---------- Bild für Tipp 2: a Schwärme mit je b Fischen, als Punktefeld ---------- */
  /* Jede Spalte ist ein Schwarm (so bleibt das Bild flach und das Ziffernfeld sichtbar).
     Jeder Schwarm hat einen zarten Hintergrund, damit man Spalten liest und nicht Zeilen (Design-Review).
     Nach 5 Schwärmen und nach 5 Fischen eine kleine Lücke (Fünferstruktur).
     Breite und Höhe begrenzt das CSS (hochkant niedriger, an der Tafel größer). */
  function schwarmBild(a, b, label = null) {
    const dx = 30, dy = 15, luecke = 12;
    const x = i => 17 + i * dx + (i >= 5 ? luecke : 0);
    const y = j => 9 + j * dy + (j >= 5 ? luecke : 0);
    const breite = x(a - 1) + 16, hoehe = y(b - 1) + 11;
    let svg = '';
    for (let i = 0; i < a; i++) {
      svg += `<rect class="sb-schwarm" x="${x(i) - 15}" y="1" width="27" height="${hoehe - 2}" rx="10"/>`;
      for (let j = 0; j < b; j++) {
        svg += `<g transform="translate(${x(i)} ${y(j)})"><path class="sb-flosse" d="M-9 0 L-15 -5 L-15 5 Z"/><ellipse class="sb-koerper" rx="9" ry="5.5"/><circle class="sb-auge" cx="4.5" cy="-1" r="1.3"/></g>`;
      }
    }
    const beschriftung = label || `${a} ${a === 1 ? 'Schwarm' : 'Schwärme'} mit je ${b} ${b === 1 ? 'Fisch' : 'Fischen'}`;
    return `<svg class="schwarm-bild" viewBox="0 0 ${breite} ${hoehe}" style="--bild-breite:${Math.round(breite * 1.6)}px" role="img" aria-label="${beschriftung}">${svg}</svg>`;
  }

  /* ---------- Aufbau der Ansicht ---------- */
  const TASTEN = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'loeschen', '0', 'pruefen'];
  function tasteHtml(t) {
    if (t === 'loeschen') return `<button type="button" class="taste taste--leise" data-u="loeschen" aria-label="Löschen"><svg viewBox="0 0 24 24" width="1.1em" height="1.1em" aria-hidden="true" focusable="false"><path d="M9 5h11a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H9l-6-7z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M12 9l6 6M18 9l-6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></button>`;
    if (t === 'pruefen') return `<button type="button" class="taste taste--pruefen" data-u="pruefen" style="--bedenkzeit:${C.bedenkzeit.sekundenVorPruefen}s"><span>Prüfen</span></button>`;
    return `<button type="button" class="taste" data-u="ziffer" data-z="${t}">${t}</button>`;
  }

  function tupfenHtml() {
    const n = z.liste.length;
    return `<ol class="tupfen" aria-label="Aufgabe ${z.index + 1} von ${n}">${z.liste.map((_, i) =>
      `<li class="${i < z.index ? 'voll' : i === z.index ? 'jetzt' : ''}"></li>`).join('')}</ol>`;
  }

  function zeigeAufgabe() {
    const auf = z.liste[z.index];
    Object.assign(z, { aufgabe: auf, eingabe: '', start: performance.now(), ersteZiffer: null, tippStufe: 0, beantwortet: false });
    uhrStarten();
    const kind = ZS.speicher.aktiv();
    const stand = kind ? ZS.lernstand.eintrag(kind, auf.id) : null;
    z.verlauf.push({ id: auf.id, neu: !stand || stand.box === 0 });
    app.innerHTML = `
      <section class="ueben" aria-labelledby="h-aufgabe">
        <div class="ueben__leiste">
          <button type="button" class="knopf leise-knopf knopf--klein" data-u="zurueck">← Zurück</button>
          ${z.endlos ? (z.titel ? `<p class="ueben__titel hof">${esc(z.titel)}</p>` : '') : tupfenHtml()}
          <button type="button" class="knopf leise-knopf knopf--klein tipp-knopf" data-u="tipp"><img src="bilder/tupfi.png?b=${C.bildStand}" alt="" width="40" height="40">Tipp</button>
        </div>
        <div class="ueben__flaeche">
          <div class="fenster aufgabe-fenster">
            <h1 id="h-aufgabe" class="aufgabe"><span class="aufgabe__text">${esc(auf.text)} =</span> <output id="eingabe" class="eingabe" aria-label="Deine Antwort">?</output></h1>
            <div id="rueck" class="rueck"></div>
            <div id="tipp" class="tipp" hidden></div>
          </div>
          <div class="ziffernfeld" role="group" aria-label="Ziffernfeld">${TASTEN.map(tasteHtml).join('')}</div>
        </div>
      </section>`;
    document.title = `${auf.text} – Zahlenschwarm`;
    const h1 = app.querySelector('h1');
    h1.tabIndex = -1; h1.focus({ preventScroll: true });
    bedenkzeitStarten();
    /* Hängt ein Kind heute an dieser Aufgabe, hilft Tupfi von selbst mit dem Bild */
    if (stand && ZS.lernstand.fehlerHeute(stand) >= C.leitner.autoTippAbFehlern) { z.tippStufe = 1; tipp(); }
  }

  /* ---------- Bedenkzeit ---------- */
  function bedenkzeitStarten() {
    const knopf = app.querySelector('[data-u="pruefen"]');
    if (!C.bedenkzeit.aktiv) return;
    knopf.disabled = true;
    knopf.classList.add('wartet');
    clearTimeout(z.bedenkTimer);
    z.bedenkTimer = setTimeout(() => { knopf.classList.remove('wartet'); if (!z.beantwortet) knopf.disabled = false; }, C.bedenkzeit.sekundenVorPruefen * 1000);
  }
  const gesperrt = () => C.bedenkzeit.aktiv && performance.now() - z.start < C.bedenkzeit.sekundenVorPruefen * 1000;

  /* ---------- Eingabe ---------- */
  function eingabeZeigen() {
    const o = app.querySelector('#eingabe');
    o.textContent = z.eingabe || '?';
    o.classList.toggle('leer', !z.eingabe);
  }
  function ziffer(t) {
    if (z.beantwortet || z.eingabe.length >= A.ziffern(z.aufgabe)) return;
    if (z.ersteZiffer === null) z.ersteZiffer = performance.now() - z.start;
    z.eingabe = (z.eingabe === '0' ? '' : z.eingabe) + t;
    eingabeZeigen();
    rueckmelden('');
  }
  function loeschen() {
    if (z.beantwortet) return;
    z.eingabe = z.eingabe.slice(0, -1);
    eingabeZeigen();
  }

  /* ---------- Lernzeit ---------- */
  /* Läuft je Aufgabe nur, solange die Seite sichtbar ist. Höchstens 2 Minuten je Aufgabe,
     damit ein liegen gelassenes iPad nicht stundenlang zählt. */
  const UHR_HOECHSTENS_SEK = 120;
  function uhrStarten() { if (z && !document.hidden) z.uhr = { start: performance.now(), sek: 0 }; }
  function uhrStoppen() {
    if (!z || !z.uhr || !z.aufgabe) return;
    if (z.uhr.start !== null) z.uhr.sek += (performance.now() - z.uhr.start) / 1000;
    z.uhr.start = null;
  }
  function uhrBuchen() {
    if (!z || !z.uhr || !z.aufgabe) return;
    uhrStoppen();
    const sek = Math.round(Math.min(UHR_HOECHSTENS_SEK, z.uhr.sek) * 10) / 10;
    z.uhr = null;
    ZS.speicher.zeitMerken(ZS.tauchbuch.bereichVon(z.aufgabe.art), sek);
  }
  document.addEventListener('visibilitychange', () => {
    if (!z || !z.uhr) return;
    if (document.hidden) uhrStoppen(); else z.uhr.start = performance.now();
  });
  window.addEventListener('pagehide', () => uhrBuchen());

  /* ---------- Rückmeldung ---------- */
  /* Text sichtbar im Fenster (für Screenreader versteckt, er hört die Ansage im aria-live-Bereich).
     Knöpfe stehen außerhalb des versteckten Teils, damit sie erreichbar bleiben. */
  function rueckmelden(html, sprechText = '', knoepfe = '') {
    app.querySelector('#rueck').innerHTML = (html ? `<div class="rueck__text" aria-hidden="true">${html}</div>` : '') + knoepfe;
    if (sprechText) ansagen(sprechText);
  }

  /* Stempel-Moment mit Selbsteinschätzung (Ingo, 11.11.2026) */
  const grossAnfang = t => t.charAt(0).toUpperCase() + t.slice(1);
  function stempelMoment(st) {
    const knoepfe = ZS.tauchbuch.GEFUEHLE.map(g => `<button type="button" class="knopf leise-knopf knopf--klein" data-u="gefuehl" data-key="${st.key}" data-wert="${g.wert}" aria-pressed="false">${g.text}</button>`).join('');
    return `<div class="stempel-moment">
        ${ZS.tauchbuch.stempelSvg(st, true)}
        <p class="stempel-moment__titel">Gestempelt! ${esc(grossAnfang(st.name))} sitzt.</p>
        <p id="sm-frage">Wie fühlt sich ${esc(st.name)} an?</p>
        <div class="gefuehle" role="group" aria-labelledby="sm-frage">${knoepfe}</div>
        <p class="stempel-moment__danke" hidden>Danke! Das steht jetzt in deinem Tauchbuch.</p>
      </div>`;
  }
  function gefuehlWaehlen(b) {
    ZS.speicher.gefuehlMerken(b.dataset.key, b.dataset.wert);
    const gruppe = b.closest('.stempel-moment');
    gruppe.querySelectorAll('[data-u="gefuehl"]').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
    gruppe.querySelector('.stempel-moment__danke').hidden = false;
    ansagen('Danke! Das steht jetzt in deinem Tauchbuch.');
    fokusWeiter();
  }
  const HAKEN = '<svg viewBox="0 0 24 24" width="1em" height="1em" aria-hidden="true" focusable="false"><path d="M4 12.5l5 5L20 6.5" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const WELLE = '<svg viewBox="0 0 24 24" width="1em" height="1em" aria-hidden="true" focusable="false"><path d="M3 13c3-4 6 4 9 0s6 4 9 0" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg>';

  function pruefen() {
    if (z.beantwortet) return;
    if (!z.eingabe) { rueckmelden('<p class="rueck__hinweis">Tippe zuerst deine Zahl.</p>', 'Tippe zuerst deine Zahl.'); return; }
    if (gesperrt()) return;
    const auf = z.aufgabe;
    const richtig = A.pruefen(auf, z.eingabe);
    if (richtig === null) return;
    z.beantwortet = true;
    clearTimeout(z.bedenkTimer);
    const denkSek = (z.ersteZiffer ?? (performance.now() - z.start)) / 1000;
    const zuegig = richtig && z.tippStufe === 0 && denkSek <= (auf.uebergang ? C.zuegig.mitUebergang : C.zuegig[auf.art]);
    const eintrag = { id: auf.id, richtig, denkSek: Math.round(denkSek * 10) / 10, tipp: z.tippStufe > 0, zuegig };
    z.ergebnisse.push(eintrag);
    const gemerkt = ZS.speicher.antwortMerken(auf.id, eintrag) || { ok: false, fische: [], stempel: [] };
    z.neueFische += gemerkt.fische.length;
    if (!gemerkt.ok && !ZS.speicher.istVorschau) {
      const m = document.getElementById('meldung');
      if (m) m.textContent = 'Dein Stand konnte gerade nicht gespeichert werden. Bitte sag deiner Lehrkraft Bescheid.';
    }
    /* Falsch: nach zwei anderen Aufgaben noch einmal, aber jede Aufgabe nur einmal extra */
    if (!richtig && !z.wiederholt.has(auf.id)) {
      z.wiederholt.add(auf.id);
      if (z.waehler) z.warteschlange.push({ aufgabe: auf, ab: z.index + 3 });
      else z.liste.splice(Math.min(z.index + 3, z.liste.length), 0, auf);
    }
    app.querySelectorAll('.ziffernfeld button, [data-u="tipp"]').forEach(b => { b.disabled = true; });
    app.querySelector('#tipp').hidden = true;
    app.querySelector('.aufgabe-fenster').classList.add(richtig ? 'ist-richtig' : 'ist-fast');

    const erkl = A.erklaerung(auf);
    /* Jeder Block ein Absatz, jede Zeile für sich (Zeilen mit ":" am Ende sind Überleitungen) */
    const block = zeilen => `<div class="weg-block">${zeilen.map(l => `<p class="${/:$/.test(l) ? 'weg-ueber' : ''}">${mitRechnungen(l)}</p>`).join('')}</div>`;
    /* Neuer Fisch und neuer Stempel gibt es nur nach einer richtigen Antwort */
    const fisch = gemerkt.fische.length ? '<p class="rueck__fisch">Ein neuer Fisch für deinen Schwarm!</p>' : '';
    const fischText = gemerkt.fische.length ? ' Ein neuer Fisch für deinen Schwarm!' : '';
    const st = gemerkt.stempel.length ? ZS.tauchbuch.stempelListe().find(x => x.key === gemerkt.stempel[0]) : null;
    const stempelText = st ? ` Gestempelt! ${grossAnfang(st.name)} sitzt. Wie fühlt sich ${st.name} an?` : '';
    if (richtig && zuegig) {
      rueckmelden(`<p class="rueck__titel rueck--gut">${HAKEN} Richtig!</p>${fisch}`, `Richtig! ${auf.text} = ${auf.loesung}.${fischText}${stempelText}`,
        st ? stempelMoment(st) + weiterKnopf() : '');
      if (st) app.querySelector('[data-u="gefuehl"]').focus();
      else z.weiterTimer = setTimeout(naechste, C.pauseNachRichtigSek * 1000);
    } else if (richtig) {
      rueckmelden(`<p class="rueck__titel rueck--gut">${HAKEN} Richtig!</p>${fisch}<div class="rueck__weg"><p class="weg-ueber">So geht es noch schneller:</p>${block(erkl[0])}</div>`,
        `Richtig! So geht es noch schneller: ${A.erklaerungText([erkl[0]])}.${fischText}${stempelText}`,
        (st ? stempelMoment(st) : '') + weiterKnopf());
      if (st) app.querySelector('[data-u="gefuehl"]').focus();
      else { fokusWeiter(); z.weiterTimer = setTimeout(naechste, C.pauseNachLangsamSek * 1000); }
    } else {
      /* Nur der erste Rechenweg (Leitweg), ohne "Oder:" und Tauschaufgabe: Auf dem iPad quer rutschte
         der Weiter-Knopf sonst aus dem Bild (Ingo, 11.11.2026). Zeilenumbrüche bleiben. */
      /* Die richtige Zahl steht groß in der Aufgabe, die eigene Antwort nur klein darunter (Ingo, 11.11.2026) */
      const o = app.querySelector('#eingabe');
      o.textContent = auf.loesung;
      o.classList.add('ist-loesung');
      o.setAttribute('aria-label', 'Richtige Lösung');
      rueckmelden(`<p class="rueck__titel rueck--fast">${WELLE} Fast!</p><p class="rueck__eigene">Du hattest ${esc(z.eingabe)}</p><div class="rueck__weg">${block(erkl[0])}</div>`,
        `Fast! ${auf.text} = ${auf.loesung}. ${A.erklaerungText([erkl[0]])}`, weiterKnopf());
      fokusWeiter();
    }
  }
  const weiterKnopf = () => '<p><button type="button" class="knopf haupt" data-u="weiter">Weiter</button></p>';
  function fokusWeiter() { const w = app.querySelector('[data-u="weiter"]'); if (w) w.focus(); }

  /* ---------- Tipps ---------- */
  function tipp() {
    if (z.beantwortet || z.tippStufe >= 3) return;
    z.tippStufe++;
    const s = A.tipps(z.aufgabe)[z.tippStufe - 1];
    const box = app.querySelector('#tipp');
    box.hidden = false;
    /* Nur der aktuelle Tipp, damit das Ziffernfeld im Bild bleibt */
    box.innerHTML = `<p class="tipp__kopf">Tupfis Tipp <span class="tipp__nr">${z.tippStufe} von 3</span></p><div class="tipp__stufe"><p>${mitRechnungen(s.text)}</p>${s.bild ? schwarmBild(s.bild.schwaerme, s.bild.je, s.bild.label) : ''}</div>`;
    const k = app.querySelector('[data-u="tipp"]');
    if (z.tippStufe >= 3) { k.disabled = true; k.lastChild.textContent = 'Keine Tipps mehr'; }
    else k.lastChild.textContent = 'Noch ein Tipp';
    ansagen(s.text);
  }

  /* ---------- Ablauf ---------- */
  function naechste() {
    clearTimeout(z.weiterTimer);
    uhrBuchen();
    z.index++;
    if (z.index >= z.liste.length && z.waehler) {
      /* Zuerst eine fällige Wiederholung nach einem Fehler, sonst fragt die Lernlogik */
      const i = z.warteschlange.findIndex(w => w.ab <= z.index);
      z.liste.push(i >= 0 ? z.warteschlange.splice(i, 1)[0].aufgabe : z.waehler(z.verlauf));
    } else if (z.index >= z.liste.length && z.nachschub) {
      /* Neue Aufgaben anhängen; nie zweimal dieselbe Aufgabe direkt hintereinander */
      const neu = z.nachschub();
      const letzte = z.liste[z.liste.length - 1];
      if (neu.length > 1 && letzte && neu[0].id === letzte.id) neu.push(neu.shift());
      z.liste.push(...neu);
    }
    if (z.index >= z.liste.length) beenden(false);
    else zeigeAufgabe();
  }
  /* abgebrochen: true bei "Zurück", false wenn eine feste Liste zu Ende ist */
  function beenden(abgebrochen = true) {
    if (!z) return;
    clearTimeout(z.weiterTimer); clearTimeout(z.bedenkTimer);
    uhrBuchen();
    const { fertig, ergebnisse, neueFische } = z;
    z = null;
    document.body.classList.remove('uebt');
    if (fertig) fertig(ergebnisse, abgebrochen, { fische: neueFische });
  }

  /* Startet eine Übung. aufgaben: Liste aus ZS.aufgaben. nachschub(): liefert neue Aufgaben (endlos).
     fertig(ergebnisse, abgebrochen) wird bei "Zurück" oder am Ende einer festen Liste gerufen. */
  function starte({ aufgaben = [], waehler = null, nachschub = null, fertig, titel = '' }) {
    z = { liste: aufgaben.slice(), index: 0, waehler, nachschub, endlos: !!(waehler || nachschub), fertig, titel,
      ergebnisse: [], wiederholt: new Set(), warteschlange: [], verlauf: [], neueFische: 0 };
    if (!z.liste.length && waehler) z.liste.push(waehler([]));
    document.body.classList.add('uebt');
    zeigeAufgabe();
  }

  /* ---------- Bedienung ---------- */
  app.addEventListener('click', e => {
    if (!z) return;
    const b = e.target.closest('[data-u]');
    if (!b || b.disabled) return;
    const u = b.dataset.u;
    if (u === 'ziffer') ziffer(b.dataset.z);
    else if (u === 'loeschen') loeschen();
    else if (u === 'pruefen') pruefen();
    else if (u === 'tipp') tipp();
    else if (u === 'weiter') naechste();
    else if (u === 'gefuehl') gefuehlWaehlen(b);
    else if (u === 'zurueck') beenden(true);
  });

  document.addEventListener('keydown', e => {
    if (!z || e.ctrlKey || e.metaKey || e.altKey) return;
    if (/^[0-9]$/.test(e.key)) { e.preventDefault(); ziffer(e.key); }
    else if (e.key === 'Backspace') { e.preventDefault(); loeschen(); }
    else if (e.key === 'Enter') {
      /* Enter auf einem Knopf löst ihn selbst aus; sonst Prüfen bzw. Weiter */
      if (e.target.closest && e.target.closest('button')) return;
      e.preventDefault();
      if (z.beantwortet) { if (app.querySelector('[data-u="weiter"]')) naechste(); }
      else pruefen();
    }
  });

  ZS.ueben = { starte, beenden, schwarmBild, get laeuft() { return !!z; } };
})();
