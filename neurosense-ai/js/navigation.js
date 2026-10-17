/* NeuroSense AI — shared shell: sidebar, top bar, profile menu, drawer, search. */
(function () {
  'use strict';
  const { $, $$, esc, icon, logo, Session, toast, modal, root } = NS;
  const body = document.body;
  const page = body.dataset.page || 'overview';
  const title = body.dataset.title || 'Overview';

  const NAV = [
    { key: 'overview', label: 'Overview', icon: 'overview', href: 'index.html', hint: 'dashboard home kpi' },
    { key: 'eeg-analysis', label: 'EEG Analysis', icon: 'wave', href: 'pages/eeg-analysis.html', hint: 'upload csv edf recording quality' },
    { key: 'signal-explorer', label: 'Signal Explorer', icon: 'explorer', href: 'pages/signal-explorer.html', hint: 'waveform psd spectrum zoom' },
    { key: 'ai-screening', label: 'AI Screening', icon: 'ai', href: 'pages/ai-screening.html', hint: 'model inference features explainable' },
    { key: 'analytics', label: 'Research Analytics', icon: 'chart', href: 'pages/analytics.html', hint: 'roc confusion matrix metrics' },
    { key: 'reports', label: 'Reports', icon: 'report', href: 'pages/reports.html', hint: 'print csv export' },
    { key: 'dataset-explorer', label: 'Dataset Explorer', icon: 'dataset', href: 'pages/dataset-explorer.html', hint: 'nemar openneuro public data' },
    { key: 'settings', label: 'Settings', icon: 'settings', href: 'pages/settings.html', hint: 'theme preferences' }
  ];

  const user = Session.get() || { name: 'Demo Reviewer', role: 'Doctor', email: 'demo@neurosense.local' };
  const initials = user.name.split(/\s+/).filter(Boolean).slice(0, 2).map((s) => s[0].toUpperCase()).join('') || 'DR';
  const href = (p) => root + p;

  function buildSidebar() {
    return '<a class="brand" href="' + href('index.html') + '">' + logo(38) + '<span>NeuroSense AI<small>Research Platform</small></span></a>' +
      '<nav aria-label="Primary"><div class="nav-label">Workspace</div>' +
      NAV.map((n) => '<a class="nav-link' + (n.key === page ? ' active' : '') + '" href="' + href(n.href) + '"' + (n.key === page ? ' aria-current="page"' : '') + '>' + icon(n.icon) + '<span>' + n.label + '</span></a>').join('') +
      '</nav><div class="sidebar-footer"><div class="profile-mini"><div class="avatar">' + esc(initials) + '</div><div class="meta"><div class="name">' + esc(user.name) + '</div><span class="role-badge">' + esc(user.role) + ' · demo</span></div></div>' +
      '<button class="logout-btn" type="button" data-logout>' + icon('logout') + 'Log out</button></div>';
  }

  function buildTopbar() {
    return '<button class="icon-btn menu-toggle" type="button" aria-label="Open navigation menu" data-menu>' + icon('menu') + '</button>' +
      '<div class="crumbs"><div class="trail">NeuroSense AI / ' + esc(title) + '</div><div class="title">' + esc(title) + '</div></div>' +
      '<div class="topbar-spacer"></div>' +
      '<div class="search" role="search">' + icon('search') + '<label class="sr-only" for="globalSearch">Search pages</label><input id="globalSearch" class="input" style="padding-left:38px;border-radius:99px;height:40px;min-height:40px" type="search" placeholder="Search pages…" autocomplete="off"><div class="search-results" hidden></div></div>' +
      '<span class="env-pill" title="This build contains no trained model and no real recordings"><i></i>Research sandbox · demo data</span>' +
      '<div class="menu-wrap"><button class="icon-btn" type="button" aria-label="Notifications" aria-expanded="false" data-pop="notif">' + icon('bell') + '<span class="dot"></span></button>' +
      '<div class="dropdown" id="pop-notif" hidden><div class="dd-head"><b>Notifications</b></div>' +
      '<div class="dd-note">• Demo build: no trained model is configured.</div><div class="dd-note">• All recordings shown are synthetic.</div><div class="dd-note">• Results are not a diagnosis.</div></div></div>' +
      '<button class="icon-btn" type="button" aria-label="Help" data-help>' + icon('help') + '</button>' +
      '<div class="menu-wrap"><button class="top-user icon-btn" style="width:auto;border-radius:99px;padding:2px 6px 2px 2px;gap:10px" type="button" aria-haspopup="true" aria-expanded="false" aria-label="Profile menu" data-pop="profile">' +
      '<div class="avatar">' + esc(initials) + '</div><div class="who"><b>' + esc(user.name) + '</b><span>' + esc(user.role) + '</span></div></button>' +
      '<div class="dropdown" id="pop-profile" hidden><div class="dd-head"><b>' + esc(user.name) + '</b><div class="muted small">' + esc(user.email) + '</div><span class="badge badge-ai" style="margin-top:6px">' + esc(user.role) + ' · demo profile</span></div>' +
      '<a class="dd-item" href="' + href('pages/settings.html') + '">' + icon('settings') + 'Settings</a>' +
      '<button class="dd-item" type="button" data-logout>' + icon('logout') + 'Log out</button>' +
      '<div class="dd-note">Demo-only profile. No real authentication or identity verification is performed.</div></div></div>';
  }

  const sbSlot = $('#sidebar-slot'), tbSlot = $('#topbar-slot');
  if (sbSlot) { const el = document.createElement('aside'); el.className = 'sidebar'; el.id = 'sidebar'; el.setAttribute('aria-label', 'Sidebar'); el.innerHTML = buildSidebar(); sbSlot.replaceWith(el); }
  if (tbSlot) { const el = document.createElement('header'); el.className = 'topbar'; el.innerHTML = buildTopbar(); tbSlot.replaceWith(el); }
  const scrim = document.createElement('div'); scrim.className = 'scrim'; body.appendChild(scrim);
  const foot = $('#footer-slot');
  if (foot) foot.outerHTML = '<footer class="app-footer">NeuroSense AI v0.1.0 (demo) · Research screening prototype — not a clinically validated diagnostic device. Results are not a diagnosis.</footer>';

  /* drawer */
  const setDrawer = (open) => { body.classList.toggle('drawer-open', open); const t = $('[data-menu]'); if (t) t.setAttribute('aria-expanded', String(open)); };
  document.addEventListener('click', (e) => {
    if (e.target.closest('[data-menu]')) { setDrawer(!body.classList.contains('drawer-open')); return; }
    if (e.target === scrim || e.target.closest('.sidebar .nav-link')) setDrawer(false);

    const pop = e.target.closest('[data-pop]');
    $$('.dropdown').forEach((d) => { if (!pop || d.id !== 'pop-' + pop.dataset.pop) d.hidden = true; });
    $$('[data-pop]').forEach((b) => b.setAttribute('aria-expanded', 'false'));
    if (pop) { const d = $('#pop-' + pop.dataset.pop); d.hidden = !d.hidden; pop.setAttribute('aria-expanded', String(!d.hidden)); }

    if (e.target.closest('[data-logout]')) { Session.end(); location.href = href('login.html'); }
    if (e.target.closest('[data-help]')) {
      modal('Help', '<p>Use the sidebar to move between workspaces. Load the <b>synthetic sample recording</b> in EEG Analysis, or upload a CSV with numeric EEG columns.</p>' +
        '<p>Items marked <span class="demo-tag">Demo</span> are illustrative. This prototype has no trained model and does not diagnose depression.</p>');
    }
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { setDrawer(false); $$('.dropdown').forEach((d) => (d.hidden = true)); }
  });

  /* global search (navigates between pages) */
  const input = $('#globalSearch'), results = $('.search-results');
  if (input) {
    input.addEventListener('input', () => {
      const q = input.value.trim().toLowerCase();
      if (!q) { results.hidden = true; return; }
      const hits = NAV.filter((n) => (n.label + ' ' + n.hint).toLowerCase().includes(q));
      results.innerHTML = hits.length ? hits.map((n) => '<a href="' + href(n.href) + '">' + esc(n.label) + '</a>').join('') : '<div class="muted small">No matching pages</div>';
      results.hidden = false;
    });
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { const a = $('a', results); if (a) location.href = a.href; } });
    document.addEventListener('click', (e) => { if (!e.target.closest('.search')) results.hidden = true; });
  }
})();
