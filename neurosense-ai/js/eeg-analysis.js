/* NeuroSense AI — EEG upload, CSV validation, EDF header inspection, quality checks, preprocessing */
(function () {
  'use strict';
  const { $, $$, esc, icon, toast, CH_COLORS, BANDS } = NS;
  const MAX = 25 * 1024 * 1024;
  let rec = null, edfInfo = null, selected = [];

  $('#up-ico').innerHTML = icon('upload'); $('#pv-ico').innerHTML = icon('wave');

  const NA = 'Not available';
  const feedback = (type, html) => { $('#feedback').innerHTML = html ? '<div class="notice notice-' + type + '">' + icon(type === 'success' ? 'check' : type === 'error' ? 'alert' : 'info') + '<span>' + html + '</span></div>' : ''; const s = $('#feedback svg'); if (s) s.style.cssText = 'width:20px;height:20px;flex:none'; };
  const setProgress = (p, label) => { $('#prog').hidden = p == null; if (p == null) return; $('#prog > .progress > i').style.width = p + '%'; $('#prog .progress').setAttribute('aria-valuenow', Math.round(p)); $('#prog-label').textContent = label || ''; };

  /* ---------- info + quality ---------- */
  function renderInfo() {
    const rows = [];
    if (rec) rows.push(['Recording identifier', rec.id], ['Sampling frequency', rec.fs ? rec.fs + ' Hz' : NA], ['Number of channels', rec.channels.length], ['Duration', rec.duration.toFixed(1) + ' s'], ['Number of samples', rec.samples.toLocaleString() + ' / channel'], ['Data quality status', rec.qualityLabel || NA]);
    else if (edfInfo) rows.push(['Recording identifier', edfInfo.id], ['Sampling frequency', edfInfo.fs ? edfInfo.fs + ' Hz (first signal)' : NA], ['Number of channels', edfInfo.ns], ['Duration', edfInfo.duration ? edfInfo.duration + ' s' : NA], ['Number of samples', NA], ['Data quality status', 'Not assessed (signal data not decoded)']);
    else rows.push(['Recording identifier', NA], ['Sampling frequency', NA], ['Number of channels', NA], ['Duration', NA], ['Number of samples', NA], ['Data quality status', NA]);
    $('#info').innerHTML = rows.map((r) => '<dt>' + r[0] + '</dt><dd>' + esc(r[1]) + (r[1] === NA ? '' : '') + '</dd>').join('');
  }
  function renderQC() {
    const defs = [['Missing or invalid samples', 'invalid'], ['Flat channels', 'flat'], ['Extreme amplitudes (>300 µV)', 'extreme'], ['Baseline drift', 'drift'], ['Potential noisy segments', 'noisy']];
    if (!rec) { $('#qc').innerHTML = defs.map((d) => '<li><span>' + d[0] + '</span><span class="badge badge-muted">Not assessed</span></li>').join(''); return; }
    const q = NS.qualityChecks(rec); rec._qc = q;
    const items = defs.map((d) => { const v = q[d[1]]; const n = typeof v === 'number' ? v : v.length; const detail = typeof v === 'number' ? n + ' samples' : (n ? v.join(', ') : 'None found');
      return '<li><span>' + d[0] + '</span><span class="badge badge-' + (n ? 'warning' : 'success') + '">' + esc(detail) + '</span></li>'; });
    $('#qc').innerHTML = items.join('');
    const flags = defs.filter((d) => { const v = q[d[1]]; return (typeof v === 'number' ? v : v.length) > 0; }).length;
    rec.qualityLabel = flags === 0 ? 'No basic issues flagged' : flags + ' basic check(s) flagged';
  }
  function renderChannels() {
    const host = $('#ctl-ch');
    if (!rec) { host.innerHTML = '<span class="muted small">Load a recording first.</span>'; return; }
    selected = rec.channels.map((_, i) => true);
    host.innerHTML = rec.channels.map((c, i) => '<button type="button" class="chip" data-ch="' + i + '" aria-pressed="true"><i style="background:' + CH_COLORS[i % CH_COLORS.length] + '"></i>' + esc(c) + '</button>').join('');
  }
  $('#ctl-ch').addEventListener('click', (e) => { const b = e.target.closest('.chip'); if (!b) return; const i = +b.dataset.ch; selected[i] = !selected[i]; b.setAttribute('aria-pressed', String(selected[i])); });

  function preview() {
    const has = !!rec; $('#pv-empty').hidden = has; $('#pv-box').hidden = !has;
    $('#pv-sub').textContent = has ? (rec.synthetic ? 'Synthetic demonstration data (not a real recording).' : 'Uploaded CSV — first ' + Math.min(10, rec.duration).toFixed(0) + ' s shown.') : 'Load a recording to preview it.';
    if (has) NS.drawEEG($('#pv'), { rec, start: 0, win: Math.min(10, rec.duration), visible: rec.channels.map(() => true), scale: rec.synthetic ? 50 : autoScale(rec), height: 340 });
  }
  const autoScale = (r) => { const s = r.data.map((x) => NS.stats(x).sd).filter(isFinite).sort((a, b) => a - b); const m = s[Math.floor(s.length / 2)] || 10; return Math.max(1, Math.round(m * 3)); };

  function setRecording(r) {
    rec = r; edfInfo = null;
    $('#fs').value = r.fs; $('#remove').hidden = false;
    renderChannels(); renderQC(); renderInfo(); preview(); $('#result').innerHTML = '';
    const saved = NS.Rec.save(r, { fs: r.fs, lo: +$('#lo').value, hi: +$('#hi').value, epoch: +$('#epoch').value, bands: true });
    if (!saved) toast('Recording is too large to hand off to other pages; analysis works here only.', 'error');
  }
  function clearAll() { rec = null; edfInfo = null; $('#remove').hidden = true; feedback(); setProgress(null); NS.Rec.clear(); renderChannels(); renderQC(); renderInfo(); preview(); $('#result').innerHTML = ''; $('#file').value = ''; }

  /* ---------- file handling ---------- */
  function handleFile(file) {
    if (!file) return;
    const ext = (file.name.split('.').pop() || '').toLowerCase();
    if (!['csv', 'edf'].includes(ext)) { feedback('error', 'Unsupported file type <b>.' + esc(ext) + '</b>. Please choose a .csv or .edf file.'); return; }
    if (file.size > MAX) { feedback('error', 'File is ' + (file.size / 1048576).toFixed(1) + ' MB. The limit is 25 MB.'); return; }
    if (file.size === 0) { feedback('error', 'The file is empty.'); return; }
    feedback(); setProgress(0, 'Reading ' + file.name + '…');
    const reader = new FileReader();
    reader.onprogress = (e) => { if (e.lengthComputable) setProgress(e.loaded / e.total * 100, 'Reading ' + file.name + '…'); };
    reader.onerror = () => { setProgress(null); feedback('error', 'Could not read the file.'); };
    reader.onload = () => { setProgress(100, 'Validating…'); setTimeout(() => { setProgress(null); ext === 'csv' ? loadCSV(file, reader.result) : loadEDF(file, reader.result); }, 150); };
    ext === 'csv' ? reader.readAsText(file) : reader.readAsArrayBuffer(file);
  }

  function loadCSV(file, text) {
    const p = NS.parseCSV(text);
    if (p.error) { feedback('error', esc(p.error)); return; }
    const timeIdx = p.header.findIndex((h) => /^(time|t|timestamp|seconds|sec)$/i.test(h));
    const chIdx = p.header.map((_, i) => i).filter((i) => i !== timeIdx);
    if (!chIdx.length) { feedback('error', 'No signal columns found. Add at least one numeric channel column.'); return; }
    if (new Set(p.header).size !== p.header.length) { feedback('error', 'Duplicate column names in the header. Each channel needs a unique name.'); return; }
    const n = p.rows.length, data = chIdx.map(() => new Float32Array(n)); let bad = 0, ragged = 0;
    const badCols = new Set();
    p.rows.forEach((r, ri) => {
      if (r.length !== p.header.length) ragged++;
      chIdx.forEach((ci, k) => { const v = parseFloat(r[ci]); if (r[ci] === undefined || r[ci].trim() === '' || !isFinite(v)) { data[k][ri] = NaN; bad++; badCols.add(p.header[ci]); } else data[k][ri] = v; });
    });
    const totalCells = n * chIdx.length;
    if (bad / totalCells > 0.5) { feedback('error', 'More than half of the signal cells are not numeric. Columns affected: <b>' + esc([...badCols].slice(0, 6).join(', ')) + '</b>. Check that the header row is correct.'); return; }
    let fs = 256, fsNote = ' Sampling frequency defaulted to 256 Hz — <b>please confirm it below</b>.';
    if (timeIdx > -1 && n > 2) {
      const dts = []; for (let i = 1; i < Math.min(n, 2000); i++) { const d = parseFloat(p.rows[i][timeIdx]) - parseFloat(p.rows[i - 1][timeIdx]); if (d > 0 && isFinite(d)) dts.push(d); }
      dts.sort((a, b) => a - b); const med = dts[Math.floor(dts.length / 2)];
      if (med) { fs = Math.round(1 / med * 100) / 100; fsNote = ' Sampling frequency inferred from the time column (' + fs + ' Hz, assuming seconds).'; }
    }
    const warn = (bad ? ' ' + bad + ' non-numeric cell(s) found (treated as invalid samples).' : '') + (ragged ? ' ' + ragged + ' row(s) had an unexpected column count.' : '');
    setRecording({ id: 'UPLOAD-' + file.name.replace(/\.[^.]+$/, '').slice(0, 24).toUpperCase().replace(/[^A-Z0-9]+/g, '-'), fs, channels: chIdx.map((i) => p.header[i]), data, samples: n, duration: n / fs, synthetic: false, source: file.name });
    feedback(bad || ragged ? 'info' : 'success', '<b>' + esc(file.name) + '</b> validated: ' + chIdx.length + ' channel(s), ' + n.toLocaleString() + ' samples.' + fsNote + warn);
  }

  function loadEDF(file, buf) {
    const dv = new Uint8Array(buf), txt = (a, b) => new TextDecoder('ascii').decode(dv.subarray(a, b)).trim();
    if (dv.length < 256 || txt(0, 8) !== '0') { feedback('error', 'This does not look like a valid EDF file (header check failed). No data was read.'); return; }
    const ns = parseInt(txt(252, 256), 10), nrec = parseInt(txt(236, 244), 10), rdur = parseFloat(txt(244, 252));
    if (!(ns > 0) || dv.length < 256 + ns * 216) { feedback('error', 'EDF header is incomplete or corrupt.'); return; }
    const nsamp = parseInt(txt(256 + ns * 216, 256 + ns * 216 + 8), 10);
    rec = null;
    edfInfo = { id: 'EDF-' + file.name.replace(/\.[^.]+$/, '').slice(0, 24).toUpperCase().replace(/[^A-Z0-9]+/g, '-'), ns, fs: nsamp > 0 && rdur > 0 ? Math.round(nsamp / rdur * 100) / 100 : null, duration: nrec > 0 && rdur > 0 ? (nrec * rdur).toFixed(1) : null };
    $('#remove').hidden = false; renderChannels(); renderQC(); renderInfo(); preview();
    feedback('info', '<b>EDF header read</b> (' + ns + ' signals). <b>Signal decoding is not implemented in this build</b> — a compatible EEG processing library or the planned Python service is required, so no waveform, quality check or analysis was produced. Convert to CSV to analyse here.');
  }

  /* ---------- analysis ---------- */
  function fieldErr(id, t) { $('#' + id + '-err').textContent = t || ''; $('#' + id).classList.toggle('invalid', !!t); return !t; }
  $('#ctl').addEventListener('submit', (e) => {
    e.preventDefault();
    ['fs', 'epoch', 'lo', 'hi', 'ch'].forEach((k) => { const el = $('#' + k + '-err'); if (el) el.textContent = ''; });
    if (!rec) { toast(edfInfo ? 'EDF signal decoding is not available — convert to CSV.' : 'Load a recording first.', 'error'); return; }
    const fs = parseFloat($('#fs').value), ep = parseFloat($('#epoch').value), lo = parseFloat($('#lo').value), hi = parseFloat($('#hi').value);
    let ok = true;
    if (!(fs >= 1 && fs <= 5000)) ok = fieldErr('fs', 'Enter a sampling frequency between 1 and 5000 Hz.') && ok;
    if (!(lo >= 0.1)) ok = fieldErr('lo', 'Low cut must be at least 0.1 Hz.') && ok;
    if (!(hi > lo)) ok = fieldErr('hi', 'High cut must be greater than the low cut.') && ok;
    else if (fs >= 1 && hi >= fs / 2) ok = fieldErr('hi', 'High cut must be below the Nyquist frequency (' + (fs / 2) + ' Hz).') && ok;
    const dur = rec.samples / fs;
    if (!(ep >= 1 && ep <= 60)) ok = fieldErr('epoch', 'Epoch duration must be 1–60 s.') && ok;
    else if (ep > dur) ok = fieldErr('epoch', 'Epoch is longer than the recording (' + dur.toFixed(1) + ' s).') && ok;
    const chs = selected.map((s, i) => s ? i : -1).filter((i) => i >= 0);
    if (!chs.length) { $('#ch-err').textContent = 'Select at least one channel.'; ok = false; }
    if (!ok) return;

    rec.fs = fs; rec.duration = dur; renderInfo();
    const btn = $('#run'); btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> Processing…';
    setTimeout(() => {
      try {
        const out = chs.map((ci) => { const f = NS.bandpass(rec.data[ci], fs, lo, hi); const w = NS.welch(f, fs, 512); return { name: rec.channels[ci], bp: NS.bandPowers(w.freqs, w.psd), filtered: f }; });
        const mean = {}; BANDS.forEach((b) => { mean[b.key] = out.reduce((s, o) => s + o.bp.relative[b.key], 0) / out.length; });
        const epochs = Math.floor(dur / ep);
        NS.Rec.updateSettings({ fs, lo, hi, epoch: ep, channels: chs, bands: $('#bands').checked, processed: true });
        let html = '<div class="notice notice-success">' + icon('check') + '<span>Processed ' + chs.length + ' channel(s): zero-phase band-pass ' + lo + '–' + hi + ' Hz, ' + epochs + ' epoch(s) of ' + ep + ' s. Open <a href="signal-explorer.html">Signal Explorer</a> to inspect the processed signal.</span></div>';
        if ($('#bands').checked) { html += '<h3 style="margin:16px 0 10px">Relative band power (mean of selected channels)</h3><div class="bars" id="rb"></div><p class="small muted" style="margin-top:10px">Computed with Welch PSD on the filtered signal. Descriptive only — not a diagnostic measure.</p>'; }
        $('#result').innerHTML = html; const s = $('#result svg'); if (s) s.style.cssText = 'width:20px;height:20px;flex:none';
        if ($('#bands').checked) NS.bandBars($('#rb'), mean);
      } catch (err) { $('#result').innerHTML = '<div class="notice notice-error">' + icon('alert') + '<span>Processing failed: ' + esc(err.message) + '</span></div>'; }
      btn.disabled = false; btn.textContent = 'Run preprocessing & band analysis';
    }, 60);
  });

  /* ---------- wiring ---------- */
  const drop = $('#drop'), file = $('#file');
  $('#browse').addEventListener('click', (e) => { e.stopPropagation(); file.click(); });
  drop.addEventListener('click', () => file.click());
  drop.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); file.click(); } });
  file.addEventListener('change', () => handleFile(file.files[0]));
  ['dragenter', 'dragover'].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add('drag'); }));
  ['dragleave', 'drop'].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.remove('drag'); }));
  drop.addEventListener('drop', (e) => handleFile(e.dataTransfer.files[0]));
  $('#remove').addEventListener('click', () => { clearAll(); toast('Recording removed. Choose another file to replace it.'); });
  $('#sample').addEventListener('click', () => { const r = NS.syntheticEEG({ id: 'SYN-DEMO-001' }); setRecording(r); feedback('info', 'Loaded the <b>synthetic demonstration recording</b> (8 channels, 256 Hz, 60 s). It is generated in your browser and is not real EEG.'); });
  window.addEventListener('resize', preview);

  // restore any recording handed off from another page
  const prev = NS.Rec.load();
  renderChannels(); renderQC(); renderInfo(); preview();
  if (prev) { rec = prev; $('#fs').value = prev.fs; $('#lo').value = prev.settings.lo; $('#hi').value = prev.settings.hi; $('#epoch').value = prev.settings.epoch; $('#remove').hidden = false; renderChannels(); renderQC(); renderInfo(); preview(); feedback('info', 'Restored the recording from this browser session.'); }
})();
