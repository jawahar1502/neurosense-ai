/* NeuroSense AI — AI screening workflow.
   Stages 1–3 are really executed in JavaScript. Stage 4 requires a real trained model behind a REST service;
   without one the page reports "AI model not configured". Sample mode is clearly labelled illustrative. */
(function () {
  'use strict';
  const { $, esc, icon, toast } = NS;
  const STAGES = [['Recording Validation', 'Checks the recording'], ['Signal Preprocessing', 'Band-pass filter'], ['Feature Extraction', 'Band power & ratios'], ['Model Inference', 'Needs trained model'], ['Results Review', 'Clinician sign-off']];
  const state = STAGES.map(() => 'idle'), notes = STAGES.map((s) => s[1]);
  let features = null, rec = null, quality = null, ranAt = null, mode = 'none'; // mode: none | notconfigured | sample | model
  let modelOut = null;

  $('#cn-ico').innerHTML = icon('alert'); $('#cn-ico svg').style.cssText = 'width:20px;height:20px;flex:none';
  const API_KEY = 'ns_api_base';
  try { $('#api').value = localStorage.getItem(API_KEY) || ''; } catch (e) { /* ignore */ }
  const apiBase = () => { try { return (localStorage.getItem(API_KEY) || '').replace(/\/+$/, ''); } catch (e) { return ''; } };

  function renderSteps() {
    $('#stepper').innerHTML = STAGES.map((s, i) => '<div class="step ' + state[i] + '" role="listitem"><b>' + s[0] + '</b><span>' + esc(notes[i]) + '</span></div>').join('');
  }
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  function extract() {
    const chs = rec.channels, out = [];
    const per = chs.map((c, i) => { const f = NS.bandpass(rec.data[i], rec.fs, 1, Math.min(40, rec.fs / 2 - 1)); const w = NS.welch(f, rec.fs, 512); return { c, bp: NS.bandPowers(w.freqs, w.psd), sd: NS.stats(f).sd }; });
    const mean = (k) => per.reduce((s, p) => s + p.bp.relative[k], 0) / per.length;
    out.push(['Relative delta power (mean)', (mean('delta') * 100).toFixed(1) + '%'], ['Relative theta power (mean)', (mean('theta') * 100).toFixed(1) + '%'], ['Relative alpha power (mean)', (mean('alpha') * 100).toFixed(1) + '%'], ['Relative beta power (mean)', (mean('beta') * 100).toFixed(1) + '%'], ['Theta / beta ratio (mean)', (mean('theta') / (mean('beta') || 1e-9)).toFixed(2)], ['Filtered signal SD (mean, µV)', (per.reduce((s, p) => s + p.sd, 0) / per.length).toFixed(2)]);
    const f3 = per.find((p) => /^f3$/i.test(p.c)), f4 = per.find((p) => /^f4$/i.test(p.c));
    out.push(['Frontal alpha asymmetry ln(F4)−ln(F3)', f3 && f4 ? (Math.log(f4.bp.absolute.alpha) - Math.log(f3.bp.absolute.alpha)).toFixed(3) : 'Not available (needs F3 and F4)']);
    return out;
  }

  async function run() {
    const btn = $('#run'); btn.disabled = true; mode = 'none'; features = null; modelOut = null; state.fill('idle'); notes.splice(0, notes.length, ...STAGES.map((s) => s[1]));
    rec = NS.Rec.load(); let synthFallback = false;
    if (!rec) { rec = NS.syntheticEEG({ id: 'SYN-DEMO-001' }); synthFallback = true; }
    $('#src-badge').className = 'badge ' + (rec.synthetic ? 'badge-warning' : 'badge-info'); $('#src-badge').textContent = rec.synthetic ? 'Synthetic demo recording' : 'Uploaded: ' + (rec.source || rec.id);
    $('#wf-sub').textContent = synthFallback ? 'No recording was loaded, so the synthetic demonstration recording is used.' : 'Running on ' + rec.id + '.';
    ranAt = new Date(); renderSteps(); renderAll();

    state[0] = 'running'; renderSteps(); await wait(300);
    quality = NS.qualityChecks(rec);
    const issues = quality.invalid + quality.flat.length + quality.extreme.length;
    if (rec.samples / rec.fs < 10) { state[0] = 'blocked'; notes[0] = 'Recording shorter than 10 s'; renderSteps(); btn.disabled = false; renderAll(); return; }
    state[0] = 'done'; notes[0] = issues ? issues + ' basic issue(s) flagged' : 'No basic issues flagged';

    state[1] = 'running'; renderSteps(); await wait(250); state[1] = 'done'; notes[1] = 'Band-pass 1–40 Hz applied';
    state[2] = 'running'; renderSteps(); await wait(250); features = extract(); state[2] = 'done'; notes[2] = features.length + ' features computed'; renderSteps(); renderAll();

    state[3] = 'running'; renderSteps();
    const base = apiBase();
    if (!base) { await wait(250); state[3] = 'blocked'; notes[3] = 'AI model not configured'; mode = 'notconfigured'; }
    else {
      try {
        const res = await fetch(base + '/api/v1/predict', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ recording_id: rec.id, sampling_frequency: rec.fs, features: Object.fromEntries(features.map((f) => [f[0], f[1]])) }) });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        modelOut = await res.json(); mode = 'model'; state[3] = 'done'; notes[3] = 'Service responded';
      } catch (err) { state[3] = 'blocked'; notes[3] = 'Service unreachable'; mode = 'notconfigured'; toast('Model service request failed (' + err.message + '). Showing “AI model not configured”.', 'error'); }
    }
    state[4] = mode === 'model' ? 'running' : 'blocked'; notes[4] = mode === 'model' ? 'Awaiting clinician review' : 'No model output to review';
    renderSteps(); renderAll(); btn.disabled = false;
  }

  function row(k, v) { return '<dt>' + k + '</dt><dd>' + v + '</dd>'; }
  function renderAll() {
    const rb = $('#rc-badge'), host = $('#result');
    const q = quality ? (quality.invalid + quality.flat.length + quality.extreme.length ? 'Basic issues flagged' : 'No basic issues flagged') : 'Not assessed';
    const ts = ranAt ? ranAt.toLocaleString() : 'Not available';
    if (mode === 'none') { rb.className = 'badge badge-muted'; rb.textContent = 'Not run'; host.innerHTML = '<div class="empty"><h3>No result yet</h3><p>Run the workflow or open the clearly marked sample result.</p></div>'; }
    else if (mode === 'notconfigured') {
      rb.className = 'badge badge-warning'; rb.textContent = 'AI model not configured';
      host.innerHTML = '<div class="notice notice-warn" style="margin-bottom:14px">' + icon('alert') + '<span><b>AI model not configured.</b> No trained and validated model is connected, so no classification or score is produced.</span></div>' +
        '<dl class="meta-list">' + row('Research classification', 'Not available') + row('Model score', 'Not available') + row('Signal quality status', esc(q)) + row('Model version', 'None') + row('Analysis timestamp', esc(ts)) + row('Review status', 'Pending — nothing to review') + '</dl>' +
        '<p class="small muted" style="margin-top:12px">Explanation: stages 1–3 ran on real signal math; stage 4 needs a model trained on participant-independent data and served over the REST API.</p>';
    } else if (mode === 'sample') {
      rb.className = 'badge badge-ai'; rb.textContent = 'Sample — illustrative only';
      host.innerHTML = '<div class="notice notice-info" style="margin-bottom:14px">' + icon('info') + '<span><b>Sample result for demonstration.</b> This is not produced by any model and says nothing about any real person.</span></div>' +
        '<dl class="meta-list">' + row('Research classification', 'Sample label (illustrative)') + row('Model score', 'Not available (no model)') + row('Signal quality status', esc(q)) + row('Model version', 'sample-0 (placeholder)') + row('Analysis timestamp', esc(ts)) + row('Review status', 'Sample — not reviewable') + '</dl>';
    } else {
      rb.className = 'badge badge-ai'; rb.textContent = 'Model output (unvalidated)';
      const m = modelOut || {};
      host.innerHTML = '<div class="notice notice-warn" style="margin-bottom:14px">' + icon('alert') + '<span>Output supplied by an external service. Its validity depends on how that model was trained and tested.</span></div>' +
        '<dl class="meta-list">' + row('Research classification', esc(m.label != null ? m.label : 'Not supplied')) + row('Model score', esc(m.score != null ? m.score : 'Not supplied')) + row('Signal quality status', esc(q)) + row('Model version', esc(m.model_version || 'Not supplied')) + row('Analysis timestamp', esc(ts)) + row('Review status', 'Pending clinician review') + '</dl>';
    }
    $$svg();
    // features
    if (features) $('#features').innerHTML = '<div class="table-wrap"><table class="data" style="min-width:380px"><thead><tr><th>Feature</th><th>Value</th></tr></thead><tbody>' + features.map((f) => '<tr><td>' + esc(f[0]) + '</td><td><b>' + esc(f[1]) + '</b></td></tr>').join('') + '</tbody></table></div>';
    // XAI
    let imp = null, label = '';
    if (mode === 'sample') { imp = NS_DEMO.sampleFeatures; label = 'Illustrative importance — not from a model'; }
    else if (mode === 'model' && modelOut && Array.isArray(modelOut.feature_importance)) { imp = modelOut.feature_importance.map((f) => ({ name: f.name, value: +f.value })); label = 'Supplied by model service'; }
    if (imp) { const mx = Math.max.apply(null, imp.map((f) => f.value)) || 1; $('#xai').innerHTML = '<div class="demo-tag" style="margin-bottom:10px">' + esc(label) + '</div><div class="bars">' + imp.map((f) => '<div><div class="small" style="margin-bottom:4px">' + esc(f.name) + ' <b>' + (f.value * 100).toFixed(0) + '%</b></div><div class="bar-track"><div class="bar-fill" style="width:' + (f.value / mx * 100) + '%;background:var(--lavender)"></div></div></div>').join('') + '</div>'; }
    else $('#xai').innerHTML = '<div class="empty"><h3>Importance unavailable</h3><p>A trained model must supply importance values. Nothing is estimated here.</p></div>';
  }
  function $$svg() { document.querySelectorAll('#result svg').forEach((s) => (s.style.cssText = 'width:20px;height:20px;flex:none')); }

  $('#run').addEventListener('click', run);
  $('#sample').addEventListener('click', () => {
    mode = 'sample'; ranAt = new Date(); quality = quality || { invalid: 0, flat: [], extreme: [] };
    if (!features) { rec = NS.Rec.load() || NS.syntheticEEG({ id: 'SYN-DEMO-001' }); features = extract(); }
    renderAll(); toast('Showing a clearly marked sample result.');
  });

  /* service config */
  $('#api-save').addEventListener('click', () => {
    const v = $('#api').value.trim(), err = $('#api-err'); err.textContent = '';
    if (v && !/^https?:\/\/[^\s]+$/i.test(v)) { err.textContent = 'Enter a URL starting with http:// or https://'; return; }
    try { if (v) localStorage.setItem(API_KEY, v); else localStorage.removeItem(API_KEY); } catch (e) { /* ignore */ }
    toast(v ? 'Service URL saved (harmless UI setting).' : 'Service URL cleared — back to “AI model not configured”.');
  });
  $('#api-check').addEventListener('click', async () => {
    const base = apiBase() || $('#api').value.trim().replace(/\/+$/, ''), out = $('#api-status');
    if (!base) { out.textContent = 'No URL set. The app stays in “AI model not configured” mode.'; return; }
    out.textContent = 'Checking…';
    try { const r = await fetch(base + '/health'); out.textContent = r.ok ? 'Service reachable (HTTP ' + r.status + ').' : 'Service responded with HTTP ' + r.status + '.'; }
    catch (e) { out.textContent = 'Could not reach the service. Is it running, and does it allow CORS from this origin?'; }
  });

  renderSteps(); renderAll();
})();
