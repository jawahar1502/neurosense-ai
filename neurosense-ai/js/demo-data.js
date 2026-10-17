/* NeuroSense AI — SAMPLE / DEMONSTRATION DATA ONLY.
   Kept separate from any real research data. Every identifier is fictional and no value here
   comes from a real participant, hospital record or measured experiment. */
window.NS_DEMO = {
  recordings: [
    { id: 'DEMO-REC-0001', date: '2026-10-12', quality: 'Good', status: 'Completed', result: 'Sample result (demo)', fs: 256, channels: 8, duration: 60 },
    { id: 'DEMO-REC-0002', date: '2026-10-13', quality: 'Fair', status: 'Completed', result: 'Sample result (demo)', fs: 256, channels: 8, duration: 60 },
    { id: 'DEMO-REC-0003', date: '2026-10-14', quality: 'Good', status: 'Awaiting review', result: 'Not scored — model not configured', fs: 256, channels: 8, duration: 60 },
    { id: 'DEMO-REC-0004', date: '2026-10-15', quality: 'Poor', status: 'Needs re-recording', result: 'Not scored — quality check failed', fs: 256, channels: 8, duration: 60 },
    { id: 'DEMO-REC-0005', date: '2026-10-16', quality: 'Good', status: 'Queued', result: 'Not scored — model not configured', fs: 256, channels: 8, duration: 60 }
  ],
  // Illustrative feature importances for the "sample result" mode only (NOT from a trained model).
  sampleFeatures: [
    { name: 'Frontal alpha asymmetry (F4 vs F3)', value: 0.31 },
    { name: 'Relative alpha power (occipital)', value: 0.24 },
    { name: 'Theta / beta ratio (frontal)', value: 0.19 },
    { name: 'Relative beta power (central)', value: 0.14 },
    { name: 'Spectral entropy (mean)', value: 0.12 }
  ],
  // Illustrative analytics for the demo-labelled charts.
  models: [
    { name: 'Logistic regression (demo)', acc: 0.71, sens: 0.68, spec: 0.74, f1: 0.69, auc: 0.77 },
    { name: 'Random forest (demo)', acc: 0.76, sens: 0.73, spec: 0.79, f1: 0.74, auc: 0.82 },
    { name: 'SVM RBF (demo)', acc: 0.74, sens: 0.70, spec: 0.78, f1: 0.72, auc: 0.80 }
  ],
  // Illustrative evaluation cohort: 85 fictional participants (43 positive-class, 42 negative-class).
  cohort: { pos: 43, neg: 42 },
  qualityDist: [{ label: 'Good', n: 58 }, { label: 'Fair', n: 27 }, { label: 'Poor', n: 13 }],
  participants: [
    { id: 'DEMO-P001', date: '2026-09-02', fold: 1, truth: 'Class A', pred: 'Class A', score: 0.81 },
    { id: 'DEMO-P002', date: '2026-09-04', fold: 1, truth: 'Class B', pred: 'Class B', score: 0.22 },
    { id: 'DEMO-P003', date: '2026-09-09', fold: 2, truth: 'Class A', pred: 'Class B', score: 0.41 },
    { id: 'DEMO-P004', date: '2026-09-15', fold: 2, truth: 'Class B', pred: 'Class B', score: 0.18 },
    { id: 'DEMO-P005', date: '2026-09-21', fold: 3, truth: 'Class B', pred: 'Class A', score: 0.63 },
    { id: 'DEMO-P006', date: '2026-09-28', fold: 3, truth: 'Class A', pred: 'Class A', score: 0.74 },
    { id: 'DEMO-P007', date: '2026-10-03', fold: 4, truth: 'Class A', pred: 'Class A', score: 0.69 },
    { id: 'DEMO-P008', date: '2026-10-08', fold: 5, truth: 'Class B', pred: 'Class B', score: 0.27 }
  ]
};
