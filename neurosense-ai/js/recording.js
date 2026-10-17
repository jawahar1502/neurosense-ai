/* NeuroSense AI — current-recording hand-off between pages.
   Kept in sessionStorage only (cleared on logout / when the browser session ends).
   Synthetic recordings are stored as a seed; uploaded CSV data is kept only if small enough. */
(function () {
  'use strict';
  const KEY = 'ns_recording', MAX_BYTES = 3.5e6;
  const DEFAULT_SETTINGS = { fs: 256, lo: 1, hi: 40, epoch: 2, channels: null, bands: true };

  const Rec = {
    save(rec, settings) {
      const base = { settings: settings || DEFAULT_SETTINGS };
      let payload;
      if (rec.synthetic) payload = Object.assign(base, { type: 'synthetic', id: rec.id, fs: rec.fs, seconds: rec.duration });
      else {
        if (rec.samples * rec.channels.length * 7 > MAX_BYTES) { return false; }
        payload = Object.assign(base, {
          type: 'csv', id: rec.id, fs: rec.fs, channels: rec.channels, source: rec.source || '',
          data: rec.data.map((x) => Array.from(x, (v) => Math.round(v * 100) / 100))
        });
      }
      try { sessionStorage.setItem(KEY, JSON.stringify(payload)); return true; } catch (e) { return false; }
    },
    load() {
      let p; try { p = JSON.parse(sessionStorage.getItem(KEY) || 'null'); } catch (e) { return null; }
      if (!p) return null;
      let rec;
      if (p.type === 'synthetic') rec = NS.syntheticEEG({ id: p.id, fs: p.fs, seconds: p.seconds });
      else rec = { id: p.id, fs: p.fs, channels: p.channels, data: p.data.map((a) => Float32Array.from(a)), samples: p.data[0].length, duration: p.data[0].length / p.fs, synthetic: false, source: p.source };
      rec.settings = Object.assign({}, DEFAULT_SETTINGS, p.settings || {});
      return rec;
    },
    updateSettings(settings) {
      try { const p = JSON.parse(sessionStorage.getItem(KEY) || 'null'); if (p) { p.settings = settings; sessionStorage.setItem(KEY, JSON.stringify(p)); } } catch (e) { /* ignore */ }
    },
    clear() { sessionStorage.removeItem(KEY); },
    DEFAULT_SETTINGS
  };
  NS.Rec = Rec;

  // clear the hand-off whenever the demo session ends
  const end = NS.Session.end;
  NS.Session.end = function () { Rec.clear(); end.call(NS.Session); };
})();
