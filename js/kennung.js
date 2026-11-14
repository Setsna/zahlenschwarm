/* Zahlenschwarm: Kennung statt Zugangscode im Namen der Speicher-Einträge.
   Wortgleich aus dem Baukasten übernommen (Lernlagune-Konto, konto-speicher.js), damit alle Plattformen
   gleich rechnen und sich im Tab denselben Merker teilen. Der Code ist zugleich das Passwort für alle
   Plattformen und soll sich nach dem Abmelden nicht aus dem Speicher ablesen lassen.
   Wer hier etwas ändert, ändert es zuerst im Baukasten. */
(() => {
  'use strict';
  const LK = window.LagunenKonto = window.LagunenKonto || {};

  /* ---------- Kennung statt Code im Namen der Speicher-Einträge ----------
     SHA-256, sehr oft hintereinander und jedes Mal mit dem Code. Synchron, weil der Speicher synchron arbeitet.
     Dauert einmal je Code und Tab etwa 0,1 bis 0,5 Sekunden, danach kommt die Kennung aus dem Merker. */
  const KENNUNG_RUNDEN = 400000;
  const SHA_K = new Uint32Array([
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2]);
  const SHA_W = new Uint32Array(64);
  function sha256(m) {
    const n = m.length, p = new Uint8Array((((n + 8) >> 6) + 1) * 64);
    p.set(m); p[n] = 0x80;
    const bits = n * 8;
    p[p.length - 4] = bits >>> 24; p[p.length - 3] = bits >>> 16; p[p.length - 2] = bits >>> 8; p[p.length - 1] = bits;
    let h0 = 0x6a09e667, h1 = 0xbb67ae85, h2 = 0x3c6ef372, h3 = 0xa54ff53a, h4 = 0x510e527f, h5 = 0x9b05688c, h6 = 0x1f83d9ab, h7 = 0x5be0cd19;
    const W = SHA_W, K = SHA_K;
    for (let o = 0; o < p.length; o += 64) {
      for (let i = 0; i < 16; i++) W[i] = (p[o + 4 * i] << 24) | (p[o + 4 * i + 1] << 16) | (p[o + 4 * i + 2] << 8) | p[o + 4 * i + 3];
      for (let i = 16; i < 64; i++) {
        const a = W[i - 15], b = W[i - 2];
        const s0 = ((a >>> 7) | (a << 25)) ^ ((a >>> 18) | (a << 14)) ^ (a >>> 3);
        const s1 = ((b >>> 17) | (b << 15)) ^ ((b >>> 19) | (b << 13)) ^ (b >>> 10);
        W[i] = (W[i - 16] + s0 + W[i - 7] + s1) | 0;
      }
      let a = h0, b = h1, c = h2, d = h3, e = h4, f = h5, g = h6, h = h7;
      for (let i = 0; i < 64; i++) {
        const S1 = ((e >>> 6) | (e << 26)) ^ ((e >>> 11) | (e << 21)) ^ ((e >>> 25) | (e << 7));
        const t1 = (h + S1 + ((e & f) ^ (~e & g)) + K[i] + W[i]) | 0;
        const S0 = ((a >>> 2) | (a << 30)) ^ ((a >>> 13) | (a << 19)) ^ ((a >>> 22) | (a << 10));
        const t2 = (S0 + ((a & b) ^ (a & c) ^ (b & c))) | 0;
        h = g; g = f; f = e; e = (d + t1) | 0; d = c; c = b; b = a; a = (t1 + t2) | 0;
      }
      h0 = (h0 + a) | 0; h1 = (h1 + b) | 0; h2 = (h2 + c) | 0; h3 = (h3 + d) | 0; h4 = (h4 + e) | 0; h5 = (h5 + f) | 0; h6 = (h6 + g) | 0; h7 = (h7 + h) | 0;
    }
    const aus = new Uint8Array(32);
    [h0, h1, h2, h3, h4, h5, h6, h7].forEach((x, i) => { aus[4 * i] = x >>> 24; aus[4 * i + 1] = x >>> 16; aus[4 * i + 2] = x >>> 8; aus[4 * i + 3] = x; });
    return aus;
  }
  const bytes = s => Uint8Array.from(String(s), z => z.charCodeAt(0) & 255);
  function kennungRechnen(code, runden) {
    const c = bytes(code), puffer = new Uint8Array(32 + c.length);
    puffer.set(c, 32);
    let h = sha256(bytes('lernlagune-konto/kennung/1:' + code));
    for (let i = 0; i < runden; i++) { puffer.set(h); h = sha256(puffer); }
    return Array.from(h.subarray(0, 10), b => b.toString(16).padStart(2, '0')).join('');
  }
  /* Merker: im Tab (sessionStorage, dort steht der Code ohnehin bis zum Abmelden) und in dieser Seite */
  const KENNUNG_MERKER = 'lagunenkonto-kennung-1';
  const kennungen = new Map();
  LK.kennung = roh => {
    const code = String(roh || '').toUpperCase();
    if (kennungen.has(code)) return kennungen.get(code);
    let gemerkt = {};
    try { gemerkt = JSON.parse(sessionStorage.getItem(KENNUNG_MERKER) || '{}') || {}; } catch (e) { gemerkt = {}; }
    let k = typeof gemerkt[code] === 'string' && /^[0-9a-f]{20}$/.test(gemerkt[code]) ? gemerkt[code] : null;
    if (!k) {
      k = kennungRechnen(code, LK.kennungRunden || KENNUNG_RUNDEN);
      try { sessionStorage.setItem(KENNUNG_MERKER, JSON.stringify({ ...gemerkt, [code]: k })); } catch (e) { /* dann wird beim nächsten Laden neu gerechnet */ }
    }
    kennungen.set(code, k);
    return k;
  };
  /* Beim Abmelden: Die Zuordnung Code → Kennung gehört nicht länger in den Tab. */
  LK.kennungVergessen = () => {
    kennungen.clear();
    try { sessionStorage.removeItem(KENNUNG_MERKER); } catch (e) { /* nur dieser Tab */ }
  };
})();
