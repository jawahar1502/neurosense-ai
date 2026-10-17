/* NeuroSense AI — dashboard (synthetic demonstration data) */
(function () {
  'use strict';
  const { $, $$, esc, icon, Session, CHANNELS, CH_COLORS, BANDS } = NS;

  // Greeting
  const u = Session.get() || {}; const h = new Date().getHours();
  const part = h < 12 ? 'morning' : h < 18 ? 'afternoon' : 'evening';
  const who = u.role === 'Doctor' || !u.name ? 'Doctor' : u.name.split(/\s+/)[0];
  $('#greet').textContent = 'Good ' + part + ', ' + who;

  $$('[data-i]').forEach((el) => { el.innerHTML = icon(el.dataset.i); });
  $('#n-ico').innerHTML = icon('alert'); $('#n-ico svg').style.cssText = 'width:20px;height:20px;flex:none';
  $('#e-ico').innerHTML = icon('wave');
  $('#reset').innerHTML = icon('reset') + 'Reset';

  const rec = NS.syntheticEEG({ id: 'SYN-DEMO-001', seconds: 60, fs: 256 });
  const visible = rec.channels.map(() => true);
  let start = 0, win = 10, playing = !window.matchMedia('(prefers-reduced-motion: reduce)').matches, loaded = true, last = 0;

  // chips
  const chips = $('#chips');
  chips.innerHTML = rec.channels.map((c, i) => '<button type="button" class="chip" data-ch="' + i + '" aria-pressed="true"><i style="background:' + CH_COLORS[i] + '"></i>' + c + '</button>').join('');
  chips.addEventListener('click', (e) => {
    const b = e.target.closest('.chip'); if (!b) return; const i = +b.dataset.ch;
    if (visible.filter(Boolean).length === 1 && visible[i]) { NS.toast('At least one channel must stay visible.'); return; }
    visible[i] = !visible[i]; b.setAttribute('aria-pressed', String(visible[i])); draw();
  });

  function setPlayLabel() { const b = $('#play'); b.innerHTML = icon(playing ? 'pause' : 'play') + (playing ? 'Pause' : 'Play'); b.setAttribute('aria-pressed', String(playing)); }
  function draw() { if (loaded) NS.drawEEG($('#wf'), { rec, start, win, visible, scale: 50, height: 400 }); }
  function loop(ts) {
    if (playing && loaded) { if (last) start += (ts - last) / 1000; if (start + win > rec.duration) start = 0; draw(); }
    last = ts; requestAnimationFrame(loop);
  }
  setPlayLabel(); requestAnimationFrame(loop);

  $('#play').addEventListener('click', () => { playing = !playing; last = 0; setPlayLabel(); });
  $('#reset').addEventListener('click', () => { start = 0; draw(); });
  $('#range').addEventListener('change', (e) => { win = +e.target.value; if (start + win > rec.duration) start = 0; draw(); });
  $('#unload').addEventListener('click', () => { loaded = false; $('#wf-box').hidden = true; chips.hidden = true; $('#wf-empty').hidden = false; });
  $('#load').addEventListener('click', () => { loaded = true; $('#wf-box').hidden = false; chips.hidden = false; $('#wf-empty').hidden = true; start = 0; draw(); });
  window.addEventListener('resize', draw);

  // Band power from synthetic signal (real DSP, synthetic input)
  const avg = new Float64Array(rec.samples);
  rec.data.forEach((x) => { for (let i = 0; i < x.length; i++) avg[i] += x[i] / rec.data.length; });
  const { freqs, psd } = NS.welch(avg, rec.fs, 512);
  const bp = NS.bandPowers(freqs, psd);
  NS.bandBars($('#bands'), bp.relative);
  $('#band-cards').innerHTML = BANDS.map((b) => '<div class="band-card tip" tabindex="0" data-tip="' + esc(b.tip) + '" style="border-top:3px solid ' + b.color + '"><b>' + (bp.relative[b.key] * 100).toFixed(0) + '%</b><span>' + b.name + '<br>' + b.range[0] + '–' + b.range[1] + ' Hz</span></div>').join('');

  // Recent table
  const badge = (t, c) => '<span class="badge badge-' + c + '">' + esc(t) + '</span>';
  $('#recent').innerHTML = NS_DEMO.recordings.map((r) => {
    const q = r.quality === 'Good' ? 'success' : r.quality === 'Fair' ? 'warning' : 'error';
    const s = r.status === 'Completed' ? 'success' : r.status === 'Queued' ? 'muted' : 'warning';
    return '<tr><td class="mono">' + esc(r.id) + '</td><td>' + esc(r.date) + '</td><td>' + badge(r.quality, q) + '</td><td>' + badge(r.status, s) + '</td><td>' + esc(r.result) + '</td>' +
      '<td><a class="btn btn-secondary btn-sm" href="pages/reports.html?id=' + encodeURIComponent(r.id) + '">View</a></td></tr>';
  }).join('');
})();
