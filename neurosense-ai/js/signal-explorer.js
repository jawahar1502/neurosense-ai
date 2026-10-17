/* NeuroSense AI — Signal Explorer */
(function () {
  'use strict';
  const { $, $$, esc, icon, CH_COLORS, BANDS } = NS;

  let rec = NS.Rec.load(), fromSession = !!rec;
  if (!rec) { rec = NS.syntheticEEG({ id: 'SYN-DEMO-001' }); rec.settings = Object.assign({}, NS.Rec.DEFAULT_SETTINGS); }
  const S = rec.settings;
  const nch = rec.channels.length;
  const visible = rec.channels.map(() => true);
  let start = 0, win = Math.min(10, rec.duration), scale = rec.synthetic ? 50 : Math.max(1, Math.round((NS.stats(rec.data[0]).sd || 10) * 3));
  let filtered = null;

  $('#pe-ico').innerHTML = icon('alert'); $('#f-ico').innerHTML = icon('info');
  $$('#pe-ico svg, #f-ico svg').forEach((s) => (s.style.cssText = 'width:22px;height:22px;flex:none'));
  const badge = $('#src-badge'); badge.className = 'badge ' + (rec.synthetic ? 'badge-warning' : 'badge-info');
  badge.textContent = rec.synthetic ? (fromSession ? 'Synthetic demo recording' : 'Synthetic demo (nothing loaded)') : 'Uploaded: ' + (rec.source || rec.id);

  /* amplitude select */
  const ampSel = $('#amp'); if (![...ampSel.options].some((o) => +o.value === scale)) ampSel.add(new Option('±' + scale + ' µV', scale)); ampSel.value = String(scale);
  const slider = $('#start'); slider.max = Math.max(0, rec.duration - win);

  /* chips */
  $('#chips').innerHTML = rec.channels.map((c, i) => '<button type="button" class="chip" data-ch="' + i + '" aria-pressed="true"><i style="background:' + CH_COLORS[i % CH_COLORS.length] + '"></i>' + esc(c) + '</button>').join('');
  $('#chips').addEventListener('click', (e) => {
    const b = e.target.closest('.chip'); if (!b) return; const i = +b.dataset.ch;
    if (visible.filter(Boolean).length === 1 && visible[i]) { NS.toast('At least one channel must stay visible.'); return; }
    visible[i] = !visible[i]; b.setAttribute('aria-pressed', String(visible[i])); render();
  });

  /* metadata + QC */
  const q = NS.qualityChecks(rec);
  $('#meta').innerHTML = [['Recording identifier', rec.id], ['Sampling frequency', rec.fs + ' Hz'], ['Number of channels', nch], ['Duration', rec.duration.toFixed(1) + ' s'], ['Number of samples', rec.samples.toLocaleString()], ['Data source', rec.synthetic ? 'Synthetic (demo)' : 'Uploaded CSV']].map((r) => '<dt>' + r[0] + '</dt><dd>' + esc(r[1]) + '</dd>').join('');
  $('#qc').innerHTML = [['Invalid samples', q.invalid + ''], ['Flat channels', q.flat.join(', ')], ['Extreme amplitudes', q.extreme.join(', ')], ['Baseline drift', q.drift.join(', ')], ['Noisy segments', q.noisy.join(', ')]].map((r, i) => {
    const bad = i === 0 ? q.invalid > 0 : r[1].length > 0;
    return '<li><span>' + r[0] + '</span><span class="badge badge-' + (bad ? 'warning' : 'success') + '">' + esc(bad ? (i === 0 ? r[1] + ' samples' : r[1]) : 'None found') + '</span></li>';
  }).join('');

  /* tabs */
  let tab = 'raw';
  function setTab(t) {
    tab = t;
    $$('.tab').forEach((b) => { const on = b.dataset.tab === t; b.setAttribute('aria-selected', String(on)); b.tabIndex = on ? 0 : -1; });
    $$('.tab-panel').forEach((p) => (p.hidden = p.id !== 'p-' + t));
    render();
  }
  $('.tabs').addEventListener('click', (e) => { const b = e.target.closest('.tab'); if (b) setTab(b.dataset.tab); });
  $('.tabs').addEventListener('keydown', (e) => {
    const tabs = $$('.tab'), i = tabs.findIndex((b) => b.getAttribute('aria-selected') === 'true');
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { const n = tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length]; setTab(n.dataset.tab); n.focus(); }
  });

  /* raw view controls */
  const clampStart = () => { start = Math.max(0, Math.min(start, Math.max(0, rec.duration - win))); slider.max = Math.max(0, rec.duration - win); slider.value = start; };
  $('#pan-l').addEventListener('click', () => { start -= win / 4; render(); });
  $('#pan-r').addEventListener('click', () => { start += win / 4; render(); });
  $('#zin').addEventListener('click', () => { zoom(0.5); });
  $('#zout').addEventListener('click', () => { zoom(2); });
  ampSel.addEventListener('change', () => { scale = +ampSel.value; render(); });
  slider.addEventListener('input', () => { start = +slider.value; render(); });
  function zoom(f, anchor) {
    const a = anchor != null ? anchor : start + win / 2, nw = Math.max(1, Math.min(rec.duration, win * f));
    start = a - (a - start) * (nw / win); win = nw; render();
  }
  const raw = $('#raw'); let drag = null;
  raw.addEventListener('mousedown', (e) => { drag = { x: e.clientX, s: start }; raw.style.cursor = 'grabbing'; });
  window.addEventListener('mouseup', () => { drag = null; raw.style.cursor = ''; });
  raw.addEventListener('mousemove', (e) => {
    const r = raw.getBoundingClientRect(), left = 54, pw = r.width - left - 12, frac = (e.clientX - r.left - left) / pw;
    if (drag) { start = drag.s - (e.clientX - drag.x) / pw * win; render(); return; }
    if (frac < 0 || frac > 1) return;
    const t = start + frac * win, idx = Math.min(rec.samples - 1, Math.floor(t * rec.fs));
    const vis = rec.channels.map((c, i) => i).filter((i) => visible[i]);
    $('#readout').textContent = 't = ' + t.toFixed(2) + ' s · ' + vis.slice(0, 6).map((i) => rec.channels[i] + ' ' + rec.data[i][idx].toFixed(1) + ' µV').join(' · ');
  });
  raw.addEventListener('wheel', (e) => { e.preventDefault(); const r = raw.getBoundingClientRect(), pw = r.width - 66, frac = Math.max(0, Math.min(1, (e.clientX - r.left - 54) / pw)); zoom(e.deltaY < 0 ? 0.8 : 1.25, start + frac * win); }, { passive: false });

  /* renderers */
  function render() {
    clampStart();
    if (tab === 'raw') {
      $('#range-label').textContent = start.toFixed(1) + '–' + (start + win).toFixed(1) + ' s of ' + rec.duration.toFixed(0) + ' s';
      NS.drawEEG(raw, { rec, start, win, visible, scale, height: 420 });
    } else if (tab === 'proc') renderProc();
    else if (tab === 'spec') renderSpec();
    else renderFeat();
  }

  function getFiltered() {
    if (filtered) return filtered;
    const chs = (S.channels && S.channels.length) ? S.channels : rec.channels.map((_, i) => i);
    filtered = { channels: chs.map((i) => rec.channels[i]), data: chs.map((i) => NS.bandpass(rec.data[i], rec.fs, S.lo, S.hi)), fs: rec.fs, samples: rec.samples, synthetic: rec.synthetic };
    return filtered;
  }
  function renderProc() {
    const ran = !!(S.processed);
    $('#proc-empty').hidden = ran; $('#proc-wrap').hidden = !ran; if (!ran) return;
    const f = getFiltered();
    $('#proc-note').textContent = 'Zero-phase band-pass ' + S.lo + '–' + S.hi + ' Hz applied in this browser to ' + f.channels.length + ' channel(s)' + (rec.synthetic ? ' (synthetic input).' : '.');
    NS.drawEEG($('#proc'), { rec: f, start, win, visible: f.channels.map(() => true), scale, height: 380 });
  }

  const psdCache = {};
  function psdOf(i) { return psdCache[i] || (psdCache[i] = NS.welch(rec.data[i], rec.fs, 512)); }
  function renderSpec() {
    const vis = rec.channels.map((c, i) => i).filter((i) => visible[i]);
    const xmax = Math.min(45, rec.fs / 2), p0 = psdOf(vis[0]);
    NS.drawLines($('#psd'), { xs: Array.from(p0.freqs), xmin: 0, xmax, log: true, xlabel: 'Frequency (Hz)', ylabel: 'PSD (log10 µV²/Hz)', height: 300, bands: BANDS,
      series: vis.map((i) => ({ ys: Array.from(psdOf(i).psd), color: CH_COLORS[i % CH_COLORS.length], width: 1.6 })) });
    $('#psd-legend').innerHTML = vis.map((i) => '<span><i style="background:' + CH_COLORS[i % CH_COLORS.length] + '"></i>' + esc(rec.channels[i]) + '</span>').join('');
    $('#bp-table').innerHTML = '<thead><tr><th>Channel</th>' + BANDS.map((b) => '<th><span class="tip" tabindex="0" data-tip="' + esc(b.tip) + '">' + b.name + '</span></th>').join('') + '</tr></thead><tbody>' +
      vis.map((i) => { const bp = NS.bandPowers(psdOf(i).freqs, psdOf(i).psd); return '<tr><td><b>' + esc(rec.channels[i]) + '</b></td>' + BANDS.map((b) => '<td>' + (bp.relative[b.key] * 100).toFixed(1) + '%</td>').join('') + '</tr>'; }).join('') + '</tbody>';
  }
  function renderFeat() {
    const rows = rec.channels.map((c, i) => {
      const s = NS.stats(rec.data[i]), p = psdOf(i), bp = NS.bandPowers(p.freqs, p.psd);
      let rms = 0; for (let k = 0; k < rec.data[i].length; k++) rms += rec.data[i][k] * rec.data[i][k]; rms = Math.sqrt(rms / rec.data[i].length);
      let tot = 0, ent = 0; const lo = 0.5, hi = Math.min(45, rec.fs / 2); for (let k = 0; k < p.freqs.length; k++) if (p.freqs[k] >= lo && p.freqs[k] <= hi) tot += p.psd[k];
      for (let k = 0; k < p.freqs.length; k++) if (p.freqs[k] >= lo && p.freqs[k] <= hi && p.psd[k] > 0) { const pr = p.psd[k] / tot; ent -= pr * Math.log2(pr); }
      return { c, s, rms, bp, tb: bp.relative.theta / (bp.relative.beta || 1e-9), ent };
    });
    $('#feat-table').innerHTML = '<thead><tr><th>Channel</th><th>Mean (µV)</th><th>SD (µV)</th><th>RMS (µV)</th><th>Min / Max (µV)</th><th>Theta/Beta</th><th>Alpha rel.</th><th>Spectral entropy (bits)</th></tr></thead><tbody>' +
      rows.map((r) => '<tr><td><b>' + esc(r.c) + '</b></td><td>' + r.s.mean.toFixed(2) + '</td><td>' + r.s.sd.toFixed(2) + '</td><td>' + r.rms.toFixed(2) + '</td><td>' + r.s.min.toFixed(1) + ' / ' + r.s.max.toFixed(1) + '</td><td>' + r.tb.toFixed(2) + '</td><td>' + (r.bp.relative.alpha * 100).toFixed(1) + '%</td><td>' + r.ent.toFixed(2) + '</td></tr>').join('') + '</tbody>';
    const iF3 = rec.channels.findIndex((c) => /^f3$/i.test(c)), iF4 = rec.channels.findIndex((c) => /^f4$/i.test(c));
    if (iF3 > -1 && iF4 > -1) {
      const a = (i) => { const p = psdOf(i), df = p.freqs[1] - p.freqs[0]; let s = 0; p.freqs.forEach((f, k) => { if (f >= 8 && f < 13) s += p.psd[k] * df; }); return s; };
      $('#asym').innerHTML = 'Frontal alpha asymmetry, ln(F4) − ln(F3): <b>' + (Math.log(a(iF4)) - Math.log(a(iF3))).toFixed(3) + '</b>. A descriptive number only; its relationship to depression is debated and it must not be read as a diagnosis.';
    } else $('#asym').textContent = 'Frontal alpha asymmetry needs channels named F3 and F4, which are not present in this recording.';
  }

  window.addEventListener('resize', render);
  render();
})();
