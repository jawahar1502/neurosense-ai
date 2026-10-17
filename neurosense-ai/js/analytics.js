/* NeuroSense AI — Research analytics (ALL VALUES ILLUSTRATIVE DEMO DATA) */
(function () {
  'use strict';
  const { $, esc, icon, toast } = NS;
  const D = NS_DEMO, N = D.cohort;
  $('#n-ico').innerHTML = icon('alert'); $('#n-ico svg').style.cssText = 'width:20px;height:20px;flex:none';
  $('#export').innerHTML = icon('download') + 'Export displayed results (CSV)';
  $('#f-model').innerHTML = D.models.map((m, i) => '<option value="' + i + '">' + esc(m.name) + '</option>').join('');

  const bar = (label, pct, color, text) => '<div class="bar-row"><span>' + esc(label) + '</span><div class="bar-track"><div class="bar-fill" style="width:' + pct + '%;background:' + color + '"></div></div><b>' + text + '</b></div>';
  let view = null;

  function render() {
    const m = D.models[+$('#f-model').value];
    const tp = Math.round(m.sens * N.pos), fn = N.pos - tp, tn = Math.round(m.spec * N.neg), fp = N.neg - tn;
    const sens = tp / (tp + fn), spec = tn / (tn + fp), prec = tp / (tp + fp), f1 = 2 * prec * sens / (prec + sens), acc = (tp + tn) / (N.pos + N.neg);
    view = { m, tp, fn, tn, fp, sens, spec, prec, f1, acc };

    $('#classes').innerHTML = bar('Class A', N.pos / (N.pos + N.neg) * 100, 'var(--teal)', N.pos) + bar('Class B', N.neg / (N.pos + N.neg) * 100, 'var(--lavender)', N.neg) + '<p class="small muted" style="margin:0">Illustrative labels, not clinical diagnoses.</p>';
    const tq = D.qualityDist.reduce((s, q) => s + q.n, 0), qc = { Good: 'var(--success)', Fair: 'var(--warning)', Poor: 'var(--error)' };
    $('#quality').innerHTML = D.qualityDist.map((q) => bar(q.label, q.n / tq * 100, qc[q.label], q.n)).join('');
    $('#cm').innerHTML = '<span></span><span class="hd">Pred. A</span><span class="hd">Pred. B</span>' +
      '<span class="hd">True A</span><div class="cell" style="background:var(--success-light);color:var(--success)">' + tp + '</div><div class="cell" style="background:var(--error-light);color:var(--error)">' + fn + '</div>' +
      '<span class="hd">True B</span><div class="cell" style="background:var(--error-light);color:var(--error)">' + fp + '</div><div class="cell" style="background:var(--success-light);color:var(--success)">' + tn + '</div>';
    const pc = (v) => (v * 100).toFixed(1) + '%';
    $('#metrics').innerHTML = [['Sensitivity', sens], ['Specificity', spec], ['Precision', prec], ['Recall', sens], ['F1-score', f1], ['Accuracy', acc]].map((r) => bar(r[0], r[1] * 100, 'var(--lavender)', pc(r[1]))).join('');

    const k = 1 / m.auc - 1, xs = [], ys = [], diag = [];
    for (let i = 0; i <= 50; i++) { const x = i / 50; xs.push(x); ys.push(Math.pow(x, k)); diag.push(x); }
    $('#auc').textContent = 'Illustrative curve with ROC-AUC = ' + m.auc.toFixed(2) + ' (generated from a placeholder value, not measured).';
    NS.drawLines($('#roc'), { xs, xmin: 0, xmax: 1, ymin: 0, ymax: 1, xlabel: 'False positive rate', ylabel: 'True positive rate', height: 280, series: [{ ys: diag, color: '#A0AEC0', width: 1.2 }, { ys, color: '#8276D8', width: 2.5 }] });

    $('#models').innerHTML = '<thead><tr><th>Model (demo)</th><th>Accuracy</th><th>Sensitivity</th><th>Specificity</th><th>F1</th><th>ROC-AUC</th></tr></thead><tbody>' +
      D.models.map((x, i) => '<tr' + (i === +$('#f-model').value ? ' style="background:var(--teal-light)"' : '') + '><td><b>' + esc(x.name) + '</b></td><td>' + pc(x.acc) + '</td><td>' + pc(x.sens) + '</td><td>' + pc(x.spec) + '</td><td>' + x.f1.toFixed(2) + '</td><td>' + x.auc.toFixed(2) + '</td></tr>').join('') + '</tbody>';
    people();
  }

  function people() {
    const from = $('#f-from').value, to = $('#f-to').value;
    const rows = D.participants.filter((p) => (!from || p.date >= from) && (!to || p.date <= to));
    $('#people').innerHTML = '<thead><tr><th>Participant (fictional)</th><th>Date</th><th>Test fold</th><th>Reference label</th><th>Predicted</th><th>Score (demo)</th><th>Outcome</th></tr></thead><tbody>' +
      rows.map((p) => '<tr><td class="mono">' + p.id + '</td><td>' + p.date + '</td><td>' + p.fold + '</td><td>' + p.truth + '</td><td>' + p.pred + '</td><td>' + p.score.toFixed(2) + '</td><td><span class="badge badge-' + (p.truth === p.pred ? 'success' : 'error') + '">' + (p.truth === p.pred ? 'Match' : 'Mismatch') + '</span></td></tr>').join('') + '</tbody>';
    $('#people-empty').textContent = rows.length ? rows.length + ' of ' + D.participants.length + ' demo participants shown.' : 'No demo participants fall in this date range.';
    view.rows = rows;
  }

  ['f-model'].forEach((id) => $('#' + id).addEventListener('change', render));
  ['f-from', 'f-to'].forEach((id) => $('#' + id).addEventListener('change', () => {
    if ($('#f-from').value && $('#f-to').value && $('#f-from').value > $('#f-to').value) { toast('The start date is after the end date.', 'error'); return; }
    people();
  }));

  $('#export').addEventListener('click', () => {
    const v = view, pc = (x) => (x * 100).toFixed(1) + '%';
    const rows = [['NeuroSense AI — displayed research results'], ['DATA STATUS', 'ILLUSTRATIVE DEMO DATA — not from a real experiment'], ['Dataset', $('#f-ds').value], ['Model version', v.m.name], ['Evaluation split', $('#f-split').value], [],
      ['Metric', 'Value'], ['TP', v.tp], ['FN', v.fn], ['FP', v.fp], ['TN', v.tn], ['Sensitivity', pc(v.sens)], ['Specificity', pc(v.spec)], ['Precision', pc(v.prec)], ['F1', v.f1.toFixed(3)], ['Accuracy', pc(v.acc)], ['ROC-AUC (placeholder)', v.m.auc], [],
      ['Participant (fictional)', 'Date', 'Fold', 'Reference label', 'Predicted', 'Score (demo)']].concat(v.rows.map((p) => [p.id, p.date, p.fold, p.truth, p.pred, p.score]));
    NS.download('neurosense-demo-analytics.csv', NS.toCSV(rows)); toast('Exported the displayed demo results.', 'success');
  });
  render();
  window.addEventListener('resize', render);
})();
