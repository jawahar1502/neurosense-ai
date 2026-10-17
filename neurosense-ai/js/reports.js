/* NeuroSense AI — reports (demo records + optional current-session recording). Print and CSV are real. */
(function () {
  'use strict';
  const { $, esc, icon, toast, BANDS } = NS;
  $('#e-ico').innerHTML = icon('report'); $('#print').innerHTML = icon('print') + 'Print Report'; $('#csv').innerHTML = icon('download') + 'Download CSV';
  const notes = {};   // reviewer notes live in memory only
  const today = new Date().toISOString().slice(0, 10);

  function sessionReport() {
    const rec = NS.Rec.load(); if (!rec) return null;
    const q = NS.qualityChecks(rec), chs = rec.channels.map((_, i) => i);
    const avg = new Float64Array(rec.samples); rec.data.forEach((x) => { for (let i = 0; i < x.length; i++) avg[i] += x[i] / rec.data.length; });
    const w = NS.welch(avg, rec.fs, 512), bp = NS.bandPowers(w.freqs, w.psd);
    const flags = q.invalid + q.flat.length + q.extreme.length + q.drift.length + q.noisy.length;
    return { rid: 'RPT-SESSION', id: rec.id, date: today, source: rec.synthetic ? 'Current session (synthetic)' : 'Current session (uploaded CSV)', fs: rec.fs, channels: rec.channels.length, duration: rec.duration.toFixed(1) + ' s', samples: rec.samples.toLocaleString(),
      quality: flags ? flags + ' basic check(s) flagged' : 'No basic issues flagged',
      preprocess: rec.settings.processed ? 'Zero-phase band-pass ' + rec.settings.lo + '–' + rec.settings.hi + ' Hz; epochs ' + rec.settings.epoch + ' s' : 'Not run (defaults: 1–40 Hz, 2 s epochs)',
      features: BANDS.map((b) => ['Relative ' + b.name.toLowerCase() + ' power (mean across channels)', (bp.relative[b.key] * 100).toFixed(1) + '%']),
      output: 'Not available — AI model not configured' };
  }
  function demoReport(r, i) {
    return { rid: 'RPT-DEMO-' + String(i + 1).padStart(3, '0'), id: r.id, date: r.date, source: 'Demo record (fictional)', fs: r.fs, channels: r.channels, duration: r.duration + ' s', samples: (r.fs * r.duration).toLocaleString(),
      quality: r.quality + ' (placeholder)', preprocess: 'Not run (demo record)', features: [], output: r.result };
  }
  const reports = [].concat(sessionReport() || [], NS_DEMO.recordings.map(demoReport));

  $('#list').innerHTML = reports.map((r, i) => '<tr><td class="mono">' + r.rid + '</td><td class="mono">' + esc(r.id) + '</td><td>' + r.date + '</td><td>' + esc(r.source) + '</td><td><button class="btn btn-secondary btn-sm" data-view="' + i + '" type="button">View Report</button></td></tr>').join('');

  let current = null;
  function view(i) {
    current = reports[i]; const r = current;
    $('#rv-empty').hidden = true; $('#rv').hidden = false;
    const kv = (k, v) => '<tr><td style="width:40%;color:var(--muted)">' + k + '</td><td><b>' + esc(v) + '</b></td></tr>';
    $('#sheet').innerHTML = '<header style="border-bottom:2px solid var(--teal);padding-bottom:12px;margin-bottom:18px"><div class="demo-tag">' + (r.source.indexOf('Demo') === 0 ? 'Demonstration record' : 'Session record') + '</div><h2 style="margin:6px 0 2px">NeuroSense AI — Research Report</h2><div class="small" style="color:#556">Report ' + r.rid + ' · Recording ' + esc(r.id) + ' · Analysis date ' + r.date + '</div></header>' +
      '<section><h3>Recording metadata</h3><table style="width:100%;border-collapse:collapse">' + kv('Sampling frequency', r.fs + ' Hz') + kv('Channels', r.channels) + kv('Duration', r.duration) + kv('Samples per channel', r.samples) + '</table></section>' +
      '<section><h3>Signal quality summary</h3><p>' + esc(r.quality) + '. Basic statistical checks only; not clinically validated artifact detection.</p></section>' +
      '<section><h3>Preprocessing settings</h3><p>' + esc(r.preprocess) + '</p></section>' +
      '<section><h3>Extracted features</h3>' + (r.features.length ? '<table style="width:100%;border-collapse:collapse">' + r.features.map((f) => kv(f[0], f[1])).join('') + '</table>' : '<p>Not computed for this demonstration record.</p>') + '</section>' +
      '<section><h3>Model version</h3><p>None — no trained model configured.</p></section>' +
      '<section><h3>Research output</h3><p>' + esc(r.output) + '</p></section>' +
      '<section><h3>Evaluation limitations</h3><ul><li>Research screening only; not a diagnosis.</li><li>EEG alone cannot diagnose depression.</li><li>No validated model or participant-independent evaluation is attached to this report.</li></ul></section>' +
      '<section><h3>Reviewer notes</h3><label class="sr-only" for="notes">Reviewer notes</label><textarea class="input" id="notes" rows="4" placeholder="Type notes for this report (kept in memory only; do not enter patient-identifying information)."></textarea><div class="print-notes" hidden></div></section>' +
      '<footer class="small" style="color:#556;border-top:1px solid #ddd;padding-top:10px">Research screening only. Results are not a diagnosis. Clinical interpretation requires assessment by a qualified healthcare professional.</footer>';
    const ta = $('#notes'); ta.value = notes[r.rid] || ''; ta.addEventListener('input', () => { notes[r.rid] = ta.value; });
    $('#rv').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  $('#list').addEventListener('click', (e) => { const b = e.target.closest('[data-view]'); if (b) view(+b.dataset.view); });

  $('#print').addEventListener('click', () => { document.body.classList.add('printing-report'); window.print(); });
  window.addEventListener('afterprint', () => document.body.classList.remove('printing-report'));
  $('#pdf').addEventListener('click', () => toast('PDF export needs a client-side PDF library, which is not configured. Use Print Report → Save as PDF.'));
  $('#csv').addEventListener('click', () => {
    const r = current; if (!r) return;
    const rows = [['Field', 'Value'], ['Report ID', r.rid], ['Recording ID', r.id], ['Analysis date', r.date], ['Source', r.source], ['Sampling frequency (Hz)', r.fs], ['Channels', r.channels], ['Duration', r.duration], ['Samples per channel', r.samples], ['Signal quality', r.quality], ['Preprocessing', r.preprocess]]
      .concat(r.features.map((f) => ['Feature: ' + f[0], f[1]]), [['Model version', 'None'], ['Research output', r.output], ['Limitations', 'Research screening only; not a diagnosis'], ['Reviewer notes', notes[r.rid] || '']]);
    NS.download(r.rid + '.csv', NS.toCSV(rows)); toast('CSV downloaded.', 'success');
  });

  const q = new URLSearchParams(location.search).get('id');
  if (q) { const i = reports.findIndex((r) => r.id === q); if (i > -1) view(i); }
})();
