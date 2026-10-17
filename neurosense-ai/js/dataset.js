/* NeuroSense AI — dataset explorer (static metadata only; nothing is downloaded or processed) */
(function () {
  'use strict';
  const { $, icon } = NS;
  ['i1', 'i2'].forEach((id) => { const el = $('#' + id); el.innerHTML = icon('info'); el.firstChild.style.cssText = 'width:20px;height:20px;flex:none'; });
})();
