/* NeuroSense AI — shared core: session guard, utilities, synthetic data, DSP, canvas charts.
   Everything generated here is SYNTHETIC DEMONSTRATION DATA. No real recordings, no trained model. */
(function () {
  'use strict';

  const inPages = /\/pages\/[^/]*$/.test(location.pathname);
  const root = inPages ? '../' : '';
  const SESSION_KEY = 'ns_demo_session';
  const ACCOUNT_KEY = 'ns_demo_account';

  /* ---------- Session (demo only, sessionStorage; never stores passwords) ---------- */
  const Session = {
    get() {
      try { return JSON.parse(sessionStorage.getItem(SESSION_KEY) || 'null'); } catch (e) { return null; }
    },
    start(profile) {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify({
        name: profile.name, email: profile.email, role: profile.role,
        institution: profile.institution || '', startedAt: new Date().toISOString(), demo: true
      }));
    },
    end() { sessionStorage.removeItem(SESSION_KEY); sessionStorage.removeItem('ns_recording'); },
    getAccount() {
      try { return JSON.parse(sessionStorage.getItem(ACCOUNT_KEY) || 'null'); } catch (e) { return null; }
    },
    saveAccount(profile) {
      // Profile only. The password is deliberately never stored.
      sessionStorage.setItem(ACCOUNT_KEY, JSON.stringify({
        name: profile.name, email: profile.email, role: profile.role, institution: profile.institution || ''
      }));
    }
  };

  // Route protection (UI demonstration only; trivially bypassable).
  const isPublic = /(?:^|\/)(login|signup)\.html$/.test(location.pathname);
  if (!isPublic && !Session.get()) {
    location.replace(root + 'login.html');
    document.documentElement.style.visibility = 'hidden';
  }

  /* ---------- Preferences (harmless UI settings only) ---------- */
  const Prefs = {
    defaults: { theme: 'light', gridLines: true, smoothing: true, amplitude: 'auto', density: 'comfortable' },
    get() {
      try { return Object.assign({}, this.defaults, JSON.parse(localStorage.getItem('ns_prefs') || '{}')); }
      catch (e) { return Object.assign({}, this.defaults); }
    },
    set(patch) {
      try { localStorage.setItem('ns_prefs', JSON.stringify(Object.assign(this.get(), patch))); } catch (e) { /* storage blocked */ }
      this.apply();
    },
    apply() {
      const p = this.get();
      document.documentElement.setAttribute('data-theme', p.theme === 'dark' ? 'dark' : 'light');
    }
  };
  Prefs.apply();

  /* ---------- DOM helpers ---------- */
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = (v) => String(v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  function toast(msg, type) {
    let host = $('.toast-host');
    if (!host) { host = document.createElement('div'); host.className = 'toast-host'; host.setAttribute('aria-live', 'polite'); document.body.appendChild(host); }
    const t = document.createElement('div');
    t.className = 'toast ' + (type || '');
    t.textContent = msg;
    host.appendChild(t);
    setTimeout(() => { t.style.opacity = '0'; t.style.transition = 'opacity .3s'; setTimeout(() => t.remove(), 320); }, 4200);
  }

  function modal(title, bodyHTML) {
    const back = document.createElement('div');
    back.className = 'modal-back';
    back.innerHTML = '<div class="modal" role="dialog" aria-modal="true" aria-label="' + esc(title) + '"><h2>' + esc(title) +
      '</h2><div style="margin:12px 0 18px">' + bodyHTML + '</div><div class="btn-row" style="justify-content:flex-end"><button class="btn btn-primary" type="button" data-close>Close</button></div></div>';
    const close = () => { back.remove(); document.removeEventListener('keydown', onKey); };
    const onKey = (e) => { if (e.key === 'Escape') close(); };
    back.addEventListener('click', (e) => { if (e.target === back || e.target.hasAttribute('data-close')) close(); });
    document.addEventListener('keydown', onKey);
    document.body.appendChild(back);
    const b = $('[data-close]', back); if (b) b.focus();
  }

  function download(filename, text, mime) {
    const blob = new Blob([text], { type: mime || 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 500);
  }
  const csvCell = (v) => { const s = String(v == null ? '' : v); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
  const toCSV = (rows) => rows.map((r) => r.map(csvCell).join(',')).join('\n');

  /* ---------- Icons (inline SVG, stroke based) ---------- */
  const P = {
    overview: '<rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/>',
    wave: '<path d="M2 12h3l2-6 4 12 3-9 2 3h6"/>',
    explorer: '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3M8 11h6M11 8v6"/>',
    ai: '<rect x="5" y="5" width="14" height="14" rx="3"/><path d="M9 2v3M15 2v3M9 19v3M15 19v3M2 9h3M2 15h3M19 9h3M19 15h3"/><path d="M9.5 12h5"/>',
    chart: '<path d="M3 3v18h18"/><path d="M7 15l4-5 3 3 5-7"/>',
    report: '<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6M8 13h8M8 17h6"/>',
    dataset: '<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v6c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 11v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 0 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 0 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 0 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 0 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
    logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>',
    bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0"/>',
    help: '<circle cx="12" cy="12" r="9"/><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3M12 17h.01"/>',
    menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',
    upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>',
    play: '<path d="M6 4l14 8-14 8z"/>',
    pause: '<path d="M7 4v16M17 4v16"/>',
    reset: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 16v-4M12 8h.01"/>',
    alert: '<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0zM12 9v4M12 17h.01"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    x: '<path d="M18 6 6 18M6 6l12 12"/>',
    download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>',
    print: '<path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 14h12v8H6z"/>',
    external: '<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14 21 3"/>',
    eye: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    eyeoff: '<path d="M17.9 17.9A10 10 0 0 1 12 19c-6.4 0-10-7-10-7a18 18 0 0 1 5.1-5.9M9.9 4.2A9 9 0 0 1 12 4c6.4 0 10 7 10 7a18 18 0 0 1-2.2 3.2M1 1l22 22"/>',
    user: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
    target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>'
  };
  const icon = (n, size) => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"' + (size ? ' width="' + size + '" height="' + size + '"' : '') + '>' + (P[n] || '') + '</svg>';
  const logo = (size) => '<svg viewBox="0 0 40 40" width="' + (size || 36) + '" height="' + (size || 36) + '" aria-hidden="true"><rect width="40" height="40" rx="11" fill="#0F9D94"/>' +
    '<path d="M6 21h6l3-9 5 17 4-12 2 4h8" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>' +
    '<circle cx="15" cy="12" r="2.2" fill="#8276D8"/><circle cx="26" cy="17" r="2.2" fill="#8276D8"/><circle cx="20" cy="29" r="2.2" fill="#8276D8"/></svg>';

  /* ---------- Seeded RNG + synthetic EEG ---------- */
  function rng(seed) {
    let s = seed >>> 0;
    return function () { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  const gauss = (r) => { let u = 0, v = 0; while (!u) u = r(); while (!v) v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };

  const CHANNELS = ['Fp1', 'Fp2', 'F3', 'F4', 'C3', 'C4', 'O1', 'O2'];
  const CH_COLORS = ['#0F9D94', '#8276D8', '#17365D', '#D99724', '#16865B', '#C94C4C', '#3B82C4', '#B05FA8'];
  const BANDS = [
    { key: 'delta', name: 'Delta', range: [0.5, 4], color: '#17365D', tip: 'Delta (0.5–4 Hz): slow waves, prominent in deep sleep. Interpretation depends heavily on context.' },
    { key: 'theta', name: 'Theta', range: [4, 8], color: '#3B82C4', tip: 'Theta (4–8 Hz): slower rhythm linked to drowsiness and some cognitive processes.' },
    { key: 'alpha', name: 'Alpha', range: [8, 13], color: '#0F9D94', tip: 'Alpha (8–13 Hz): rhythm typical of relaxed wakefulness, strongest over posterior regions with eyes closed.' },
    { key: 'beta', name: 'Beta', range: [13, 30], color: '#8276D8', tip: 'Beta (13–30 Hz): faster activity seen during alertness and active thinking; muscle artifact can overlap.' },
    { key: 'gamma', name: 'Gamma', range: [30, 45], color: '#D99724', tip: 'Gamma (30–45 Hz): fast activity; very susceptible to muscle and line-noise contamination.' }
  ];

  function syntheticEEG(opts) {
    opts = opts || {};
    const fs = opts.fs || 256, seconds = opts.seconds || 60, seed = opts.seed || 20260;
    const r = rng(seed), n = fs * seconds;
    const channels = (opts.channels || CHANNELS).slice();
    const comps = [[2, 18], [6, 10], [10, 22], [20, 6], [38, 2]];
    const data = channels.map((_, ci) => {
      const x = new Float32Array(n);
      const ph = comps.map(() => r() * Math.PI * 2);
      const alphaBoost = (ci >= 6) ? 1.7 : 1;               // occipital-ish channels
      const drift = (r() - .5) * 6;
      for (let i = 0; i < n; i++) {
        const t = i / fs; let v = 0;
        for (let k = 0; k < comps.length; k++) {
          const amp = comps[k][1] * (k === 2 ? alphaBoost * (0.75 + 0.25 * Math.sin(2 * Math.PI * t / 7 + ci)) : 1);
          v += amp * Math.sin(2 * Math.PI * comps[k][0] * t + ph[k]);
        }
        v += gauss(r) * 5 + drift * Math.sin(2 * Math.PI * t / 40);
        x[i] = v;
      }
      return x;
    });
    return { id: opts.id || 'SYN-DEMO-001', fs, channels, data, samples: n, duration: seconds, synthetic: true };
  }

  /* ---------- DSP (real, implemented in JS) ---------- */
  function fftInPlace(re, im) {
    const n = re.length;
    for (let i = 1, j = 0; i < n; i++) {
      let bit = n >> 1; for (; j & bit; bit >>= 1) j ^= bit; j ^= bit;
      if (i < j) { let t = re[i]; re[i] = re[j]; re[j] = t; t = im[i]; im[i] = im[j]; im[j] = t; }
    }
    for (let len = 2; len <= n; len <<= 1) {
      const ang = -2 * Math.PI / len, wr = Math.cos(ang), wi = Math.sin(ang);
      for (let i = 0; i < n; i += len) {
        let cr = 1, ci = 0;
        for (let k = 0; k < len / 2; k++) {
          const ur = re[i + k], ui = im[i + k];
          const vr = re[i + k + len / 2] * cr - im[i + k + len / 2] * ci;
          const vi = re[i + k + len / 2] * ci + im[i + k + len / 2] * cr;
          re[i + k] = ur + vr; im[i + k] = ui + vi;
          re[i + k + len / 2] = ur - vr; im[i + k + len / 2] = ui - vi;
          const nr = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = nr;
        }
      }
    }
  }
  // Welch PSD (Hann window, 50% overlap). Returns { freqs, psd } in µV²/Hz when input is µV.
  function welch(x, fs, segLen) {
    let nper = segLen || 512; while (nper > x.length) nper >>= 1;
    const step = nper >> 1, win = new Float64Array(nper); let wss = 0;
    for (let i = 0; i < nper; i++) { win[i] = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / (nper - 1)); wss += win[i] * win[i]; }
    const half = nper / 2 + 1, acc = new Float64Array(half); let count = 0;
    for (let s = 0; s + nper <= x.length; s += step) {
      const re = new Float64Array(nper), im = new Float64Array(nper); let mean = 0;
      for (let i = 0; i < nper; i++) mean += x[s + i]; mean /= nper;
      for (let i = 0; i < nper; i++) re[i] = (x[s + i] - mean) * win[i];
      fftInPlace(re, im);
      for (let k = 0; k < half; k++) { let p = (re[k] * re[k] + im[k] * im[k]) / (fs * wss); if (k > 0 && k < half - 1) p *= 2; acc[k] += p; }
      count++;
    }
    const freqs = new Float64Array(half), psd = new Float64Array(half);
    for (let k = 0; k < half; k++) { freqs[k] = k * fs / nper; psd[k] = count ? acc[k] / count : 0; }
    return { freqs, psd };
  }
  function bandPowers(freqs, psd, total) {
    const df = freqs[1] - freqs[0], out = {}; let sum = 0;
    BANDS.forEach((b) => { let p = 0; for (let i = 0; i < freqs.length; i++) if (freqs[i] >= b.range[0] && freqs[i] < b.range[1]) p += psd[i] * df; out[b.key] = p; sum += p; });
    const rel = {}; BANDS.forEach((b) => { rel[b.key] = sum > 0 ? out[b.key] / sum : 0; });
    return { absolute: out, relative: rel, total: sum };
  }
  // Biquad RBJ band-pass built as high-pass + low-pass cascade (zero-phase via forward/backward pass).
  function biquad(type, f0, fs, q) {
    const w = 2 * Math.PI * f0 / fs, cw = Math.cos(w), al = Math.sin(w) / (2 * (q || Math.SQRT1_2));
    let b0, b1, b2; const a0 = 1 + al, a1 = -2 * cw, a2 = 1 - al;
    if (type === 'lp') { b0 = (1 - cw) / 2; b1 = 1 - cw; b2 = b0; } else { b0 = (1 + cw) / 2; b1 = -(1 + cw); b2 = b0; }
    return { b0: b0 / a0, b1: b1 / a0, b2: b2 / a0, a1: a1 / a0, a2: a2 / a0 };
  }
  function runBiquad(c, x) {
    const y = new Float32Array(x.length); let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
    for (let i = 0; i < x.length; i++) { const v = c.b0 * x[i] + c.b1 * x1 + c.b2 * x2 - c.a1 * y1 - c.a2 * y2; y[i] = v; x2 = x1; x1 = x[i]; y2 = y1; y1 = v; }
    return y;
  }
  function bandpass(x, fs, lo, hi) {
    let y = x;
    const hp = biquad('hp', lo, fs), lp = biquad('lp', hi, fs);
    [hp, lp].forEach((c) => {
      y = runBiquad(c, y);
      y = runBiquad(c, Float32Array.from(y).reverse()); y = Float32Array.from(y).reverse(); // zero-phase
    });
    return y;
  }
  function stats(x) {
    let n = 0, mean = 0, m2 = 0, min = Infinity, max = -Infinity, bad = 0;
    for (let i = 0; i < x.length; i++) {
      const v = x[i]; if (!isFinite(v)) { bad++; continue; }
      n++; const d = v - mean; mean += d / n; m2 += d * (v - mean); if (v < min) min = v; if (v > max) max = v;
    }
    return { n, mean, sd: n > 1 ? Math.sqrt(m2 / (n - 1)) : 0, min, max, bad };
  }
  // Basic signal checks (NOT clinically validated artifact detection).
  function qualityChecks(rec) {
    const res = { invalid: 0, flat: [], extreme: [], drift: [], noisy: [], perChannel: [] };
    rec.data.forEach((x, ci) => {
      const s = stats(x); res.invalid += s.bad;
      if (s.sd < 0.05) res.flat.push(rec.channels[ci]);
      if (Math.max(Math.abs(s.min), Math.abs(s.max)) > 300) res.extreme.push(rec.channels[ci]);
      const h = Math.floor(x.length / 2); let a = 0, b = 0;
      for (let i = 0; i < h; i++) a += x[i]; for (let i = h; i < 2 * h; i++) b += x[i];
      if (Math.abs(a / h - b / h) > 25) res.drift.push(rec.channels[ci]);
      const win = Math.max(1, Math.floor(rec.fs)); let noisy = 0, tot = 0;
      for (let st = 0; st + win <= x.length; st += win) { const w = stats(x.subarray(st, st + win)); tot++; if (w.sd > 3 * (s.sd || 1)) noisy++; }
      if (tot && noisy / tot > 0.1) res.noisy.push(rec.channels[ci]);
      res.perChannel.push(s);
    });
    return res;
  }

  /* ---------- Canvas helpers ---------- */
  function fitCanvas(canvas, height) {
    const dpr = window.devicePixelRatio || 1, w = canvas.parentElement.clientWidth || 600;
    canvas.style.height = height + 'px';
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(height * dpr);
    const ctx = canvas.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx, w, h: height };
  }
  const cssVar = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();

  // Stacked multichannel waveform. opts: rec, start(s), win(s), visible[], scale(µV per lane), height
  function drawEEG(canvas, o) {
    const { ctx, w, h } = fitCanvas(canvas, o.height || 420);
    const text = cssVar('--muted'), grid = cssVar('--border'), prefs = Prefs.get();
    ctx.clearRect(0, 0, w, h);
    const left = 54, right = 12, top = 10, bottom = 28, pw = w - left - right, ph = h - top - bottom;
    const idx = o.rec.channels.map((_, i) => i).filter((i) => o.visible[i]);
    const lane = ph / Math.max(1, idx.length), fs = o.rec.fs;
    const i0 = Math.max(0, Math.floor(o.start * fs)), i1 = Math.min(o.rec.samples, Math.floor((o.start + o.win) * fs));
    ctx.font = '11px ' + cssVar('--font'); ctx.textBaseline = 'middle';
    if (prefs.gridLines) {
      ctx.strokeStyle = grid; ctx.lineWidth = 1; ctx.fillStyle = text; ctx.textAlign = 'center';
      const stepS = o.win <= 5 ? 0.5 : o.win <= 15 ? 1 : o.win <= 30 ? 2 : 5;
      for (let t = Math.ceil(o.start / stepS) * stepS; t <= o.start + o.win + 1e-6; t += stepS) {
        const x = left + (t - o.start) / o.win * pw; ctx.beginPath(); ctx.moveTo(x, top); ctx.lineTo(x, top + ph); ctx.stroke();
        ctx.fillText(t.toFixed(stepS < 1 ? 1 : 0) + 's', x, h - 12);
      }
    }
    idx.forEach((ci, row) => {
      const mid = top + lane * (row + .5), px = lane * 0.45 / o.scale, x = o.rec.data[ci];
      ctx.fillStyle = CH_COLORS[ci % CH_COLORS.length]; ctx.textAlign = 'right'; ctx.font = '600 12px ' + cssVar('--font');
      ctx.fillText(o.rec.channels[ci], left - 10, mid);
      ctx.strokeStyle = grid; ctx.beginPath(); ctx.moveTo(left, mid); ctx.lineTo(left + pw, mid); ctx.stroke();
      ctx.strokeStyle = CH_COLORS[ci % CH_COLORS.length]; ctx.lineWidth = 1.3; ctx.lineJoin = 'round'; ctx.beginPath();
      const span = Math.max(1, i1 - i0), step = Math.max(1, Math.floor(span / (pw * 1.5)));
      for (let i = i0; i < i1; i += step) {
        const xx = left + (i - i0) / span * pw, yy = mid - Math.max(-lane * .6, Math.min(lane * .6, (x[i] - (o.baseline ? o.baseline[ci] : 0)) * px));
        if (i === i0) ctx.moveTo(xx, yy); else ctx.lineTo(xx, yy);
      }
      ctx.stroke();
    });
    // amplitude scale bar
    ctx.strokeStyle = cssVar('--navy'); ctx.lineWidth = 2; const sb = lane * 0.45;
    ctx.beginPath(); ctx.moveTo(left + 6, top + 6); ctx.lineTo(left + 6, top + 6 + sb); ctx.stroke();
    ctx.fillStyle = cssVar('--text'); ctx.textAlign = 'left'; ctx.fillText(o.scale + ' µV', left + 12, top + 6 + sb / 2);
    ctx.fillStyle = text; ctx.textAlign = 'center'; ctx.fillText('Time (s)', left + pw / 2, h - 2);
    if (o.rec.synthetic) { ctx.fillStyle = 'rgba(217,151,36,.9)'; ctx.textAlign = 'right'; ctx.font = '700 10px ' + cssVar('--font'); ctx.fillText('SYNTHETIC DEMO DATA', w - right - 4, top + 8); }
    return { left, pw, top, ph };
  }

  // Generic line chart (xs[], series[{ys[], color, name}], log-y optional)
  function drawLines(canvas, o) {
    const { ctx, w, h } = fitCanvas(canvas, o.height || 280);
    const text = cssVar('--muted'), grid = cssVar('--border');
    const L = 54, R = 14, T = 12, B = 36, pw = w - L - R, ph = h - T - B;
    let xmin = o.xmin, xmax = o.xmax, ymin = Infinity, ymax = -Infinity;
    const f = o.log ? (v) => Math.log10(Math.max(v, 1e-6)) : (v) => v;
    o.series.forEach((s) => s.ys.forEach((v, i) => { if (o.xs[i] >= xmin && o.xs[i] <= xmax) { const y = f(v); if (y < ymin) ymin = y; if (y > ymax) ymax = y; } }));
    if (o.ymin != null) ymin = o.ymin; if (o.ymax != null) ymax = o.ymax;
    if (!isFinite(ymin)) { ymin = 0; ymax = 1; } if (ymax === ymin) ymax = ymin + 1;
    ctx.clearRect(0, 0, w, h); ctx.font = '11px ' + cssVar('--font'); ctx.fillStyle = text; ctx.strokeStyle = grid; ctx.lineWidth = 1;
    for (let g = 0; g <= 4; g++) {
      const y = T + ph * g / 4, val = ymax - (ymax - ymin) * g / 4;
      ctx.beginPath(); ctx.moveTo(L, y); ctx.lineTo(L + pw, y); ctx.stroke();
      ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
      ctx.fillText(o.log ? '1e' + val.toFixed(0) : (Math.abs(val) < 10 ? val.toFixed(2) : val.toFixed(0)), L - 8, y);
    }
    for (let g = 0; g <= 5; g++) { const x = L + pw * g / 5; ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.fillText((xmin + (xmax - xmin) * g / 5).toFixed(xmax - xmin <= 2 ? 1 : 0), x, T + ph + 8); }
    if (o.bands) o.bands.forEach((b) => { const x0 = L + (Math.max(b.range[0], xmin) - xmin) / (xmax - xmin) * pw, x1 = L + (Math.min(b.range[1], xmax) - xmin) / (xmax - xmin) * pw; if (x1 > x0) { ctx.fillStyle = b.color + '1A'; ctx.fillRect(x0, T, x1 - x0, ph); } });
    ctx.fillStyle = text; ctx.textAlign = 'center'; ctx.fillText(o.xlabel || '', L + pw / 2, h - 14);
    ctx.save(); ctx.translate(14, T + ph / 2); ctx.rotate(-Math.PI / 2); ctx.fillText(o.ylabel || '', 0, 0); ctx.restore();
    o.series.forEach((s) => {
      ctx.strokeStyle = s.color; ctx.lineWidth = s.width || 2; ctx.beginPath(); let first = true;
      s.ys.forEach((v, i) => { if (o.xs[i] < xmin || o.xs[i] > xmax) return; const x = L + (o.xs[i] - xmin) / (xmax - xmin) * pw, y = T + ph - (f(v) - ymin) / (ymax - ymin) * ph; if (first) { ctx.moveTo(x, y); first = false; } else ctx.lineTo(x, y); });
      ctx.stroke();
    });
    return { L, T, pw, ph };
  }

  function bandBars(el, rel, opts) {
    el.innerHTML = BANDS.map((b) => {
      const pct = (rel[b.key] * 100);
      return '<div class="bar-row"><span class="tip" tabindex="0" data-tip="' + esc(b.tip) + '">' + b.name + '</span>' +
        '<div class="bar-track" role="img" aria-label="' + b.name + ' relative power ' + pct.toFixed(1) + ' percent"><div class="bar-fill" style="width:' + Math.min(100, pct).toFixed(1) + '%;background:' + b.color + '"></div></div>' +
        '<b>' + pct.toFixed(1) + '%</b></div>';
    }).join('');
  }

  /* ---------- CSV parsing / validation ---------- */
  function parseCSV(text) {
    const lines = text.replace(/\r/g, '').split('\n').filter((l) => l.trim().length);
    if (lines.length < 2) return { error: 'File needs a header row and at least one data row.' };
    const delim = lines[0].indexOf(';') > -1 && lines[0].indexOf(',') === -1 ? ';' : ',';
    const header = lines[0].split(delim).map((s) => s.trim().replace(/^"|"$/g, ''));
    const rows = lines.slice(1).map((l) => l.split(delim));
    return { header, rows, delim };
  }

  window.NS = {
    root, Session, Prefs, $, $$, esc, toast, modal, download, toCSV, icon, logo,
    CHANNELS, CH_COLORS, BANDS, syntheticEEG, welch, bandPowers, bandpass, stats, qualityChecks, fftInPlace,
    drawEEG, drawLines, bandBars, fitCanvas, cssVar, parseCSV, rng, gauss
  };

  document.addEventListener('DOMContentLoaded', () => {
    if (isPublic || Session.get()) document.documentElement.style.visibility = '';
  });
})();
