/* Zahlenschwarm: Fortschritt fürs Tauchbuch (Etappe 5a). Ohne Bildschirm-Code, damit es testbar bleibt.
   - Fisch: für jede Aufgabe (bei Plus/Minus und Stufenzahlen jedes Format), die zum ersten Mal sicher ist. Höchstens 229.
   - Stempel: für jede Reihe, deren Aufgaben alle zugleich sicher sind (10 Einmaleins, 10 Geteilt, Plus, Minus).
   - Fische und Stempel gehen nie verloren, auch wenn eine Aufgabe später zurückrutscht (keine Verlust-Mechanik).
   - Selbsteinschätzung je Stempel: leicht, gut oder wackelig (Ingo, 11.11.2026). */
(() => {
  'use strict';
  const C = ZS.config;

  /* Alle Stempel in fester Reihenfolge: 22 für Klasse 3, dazu 4 für Klasse 4 (Stufenzahlen 7b, Plus/Minus bis 1 000 000 7c).
     Ohne Klasse: alle (so gehen Fische und Stempel nach einem Wechsel 4 → 3 nicht verloren). */
  function stempelListe(klasse = 4) {
    const A = ZS.aufgaben, liste = [];
    for (const r of C.reihenFolge) liste.push({ key: `mal:${r}`, gruppe: 'mal', kurz: `${r}er`, name: `die ${r}er-Reihe`, titel: `${r}er-Reihe`, aufgaben: A.reihe(r, 'mal') });
    for (const r of C.reihenFolge) liste.push({ key: `geteilt:${r}`, gruppe: 'geteilt', kurz: `: ${r}`, name: `Geteilt durch ${r}`, titel: `Geteilt durch ${r}`, aufgaben: A.reihe(r, 'geteilt') });
    liste.push({ key: 'plus', gruppe: 'plusminus', kurz: '+', name: 'Plus im Kopf', titel: 'Plus im Kopf', aufgaben: A.formate('plus') });
    liste.push({ key: 'minus', gruppe: 'plusminus', kurz: A.MINUS, name: 'Minus im Kopf', titel: 'Minus im Kopf', aufgaben: A.formate('minus') });
    if (klasse >= 4) {
      liste.push({ key: 'stufenmal', gruppe: 'mal', klasse4: true, kurz: '·10', name: 'Mal mit Stufenzahlen', titel: 'Mal mit Stufenzahlen', aufgaben: A.formate('stufenmal') });
      liste.push({ key: 'stufengeteilt', gruppe: 'geteilt', klasse4: true, kurz: ':10', name: 'Geteilt mit Stufenzahlen', titel: 'Geteilt mit Stufenzahlen', aufgaben: A.formate('stufengeteilt') });
      liste.push({ key: 'plusgross', gruppe: 'plusminus', klasse4: true, kurz: '+', name: 'Plus bis 1 000 000', titel: 'Plus bis 1 000 000', aufgaben: A.formate('plusgross') });
      liste.push({ key: 'minusgross', gruppe: 'plusminus', klasse4: true, kurz: A.MINUS, name: 'Minus bis 1 000 000', titel: 'Minus bis 1 000 000', aufgaben: A.formate('minusgross') });
    }
    return liste;
  }
  /* Alle Aufgaben, für die es einen Fisch geben kann */
  const alleAufgaben = () => stempelListe().flatMap(s => s.aufgaben);
  const sicher = (kind, id) => ZS.lernstand.status(ZS.lernstand.eintrag(kind, id)) === 'sicher';

  /* Bereich einer Aufgabe für Fischfarbe und Lernzeit */
  const bereichVon = artOderId => {
    const art = String(artOderId).split(':')[0];
    if (art === 'stufenmal') return 'mal';
    if (art === 'stufengeteilt') return 'geteilt';
    return ['plus', 'minus', 'plusgross', 'minusgross'].includes(art) ? 'plusminus' : art;
  };

  /* Trägt neue Fische und Stempel ein (auch für alte Stände von vor Etappe 5).
     Verändert das Kind, speichert aber nicht. Gibt zurück, was neu ist. */
  function nachtragen(kind, jetzt = Date.now()) {
    const neu = { fische: [], stempel: [] };
    for (const a of alleAufgaben()) {
      if (!kind.schwarm[a.id] && sicher(kind, a.id)) { kind.schwarm[a.id] = jetzt; neu.fische.push(a.id); }
    }
    for (const s of stempelListe()) {
      if (!kind.stempel[s.key] && s.aufgaben.every(a => sicher(kind, a.id))) { kind.stempel[s.key] = { t: jetzt }; neu.stempel.push(s.key); }
    }
    return neu;
  }

  /* Fische in der Reihenfolge, in der sie dazukamen, mit Bereich (für die Farbe) */
  function fische(kind) {
    return Object.entries(kind.schwarm).filter(([, t]) => Number(t) > 0)
      .sort((p, q) => p[1] - q[1]).map(([id]) => ({ id, bereich: bereichVon(id) }));
  }

  /* "Das kann ich schon": was jetzt sicher ist. Ganze Reihen, bei Plus/Minus auch einzelne Formate. */
  function kannListe(kind) {
    const liste = [];
    for (const s of stempelListe(kind.klasse)) {
      if (s.aufgaben.every(a => sicher(kind, a.id))) liste.push(s.gruppe === 'mal' && !s.klasse4 ? `Die ${s.titel}` : s.titel);
      else if (s.gruppe === 'plusminus' || s.klasse4) {
        s.aufgaben.filter(a => sicher(kind, a.id)).forEach(a => liste.push(`${s.key === 'plus' ? 'Plus' : s.key === 'minus' ? 'Minus' : s.titel}: ${a.name}`));
      }
    }
    return liste;
  }

  const GEFUEHLE = [
    { wert: 'leicht', text: 'Ganz leicht' },
    { wert: 'gut', text: 'Geht gut' },
    { wert: 'wackelig', text: 'Noch wackelig' }
  ];

  /* Lernzeit lesbar machen: "unter 1 Min.", "12 Min.", "1 Std. 5 Min." */
  function zeitText(sek) {
    const min = Math.floor((Number(sek) || 0) / 60);
    if (min < 1) return 'unter 1 Min.';
    if (min < 60) return `${min} Min.`;
    return `${Math.floor(min / 60)} Std.${min % 60 ? ` ${min % 60} Min.` : ''}`;
  }

  /* Farben je Bereich (Fische und Stempel): Einmaleins gelb wie Tupfi, Geteilt meerblau, Plus/Minus koralle */
  /* Werte stehen in css/tokens.css (--fisch-…) */
  const FARBE = {
    mal: { voll: 'var(--fisch-mal)', rand: 'var(--fisch-mal-rand)' },
    geteilt: { voll: 'var(--fisch-geteilt)', rand: 'var(--fisch-geteilt-rand)' },
    plusminus: { voll: 'var(--fisch-plusminus)', rand: 'var(--fisch-plusminus-rand)' }
  };

  /* Runder Stempel als SVG. da = geschafft (kräftig), sonst blasser, gestrichelter Platz ohne Schloss. */
  function stempelSvg(st, da) {
    const f = FARBE[st.gruppe];
    const text = st.kurz.replace(/&/g, '&amp;');
    const lang = st.kurz.replace(/\s/g, '').length > 2;
    return da
      ? `<svg class="stempel-svg" viewBox="0 0 100 100" aria-hidden="true" focusable="false"><circle cx="50" cy="50" r="46" style="fill:var(--stempel-grund);stroke:${f.rand}" stroke-width="5"/><circle cx="50" cy="50" r="37" style="fill:${f.voll};stroke:${f.rand}" stroke-width="2" stroke-dasharray="4 3"/><text x="50" y="${lang ? 59 : 62}" text-anchor="middle" font-size="${lang ? 28 : 36}" style="fill:var(--navy)">${text}</text></svg>`
      : `<svg class="stempel-svg stempel-svg--offen" viewBox="0 0 100 100" aria-hidden="true" focusable="false"><circle cx="50" cy="50" r="44" fill="none" stroke="rgba(255,255,255,0.55)" stroke-width="3" stroke-dasharray="6 6"/><text x="50" y="${lang ? 59 : 62}" text-anchor="middle" font-size="${lang ? 28 : 36}" fill="rgba(255,255,255,0.6)">${text}</text></svg>`;
  }

  ZS.tauchbuch = { stempelListe, alleAufgaben, bereichVon, nachtragen, fische, kannListe, GEFUEHLE, zeitText, stempelSvg, FARBE, HOECHSTENS_FISCHE: 229 };
})();
