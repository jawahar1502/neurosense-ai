/* NeuroSense AI — demo-only authentication (frontend simulation).
   No network calls, no backend, no database. Passwords are never stored.
   Session lives in sessionStorage and ends on logout or when the browser session ends. */
(function () {
  'use strict';
  const { $, $$, Session, icon, logo } = NS;

  const DEMO = { email: 'demo@neurosense.local', password: 'Demo123!', name: 'Demo Reviewer', role: 'Doctor' };
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const isLogin = !!$('#remember');

  // Already signed in → go straight to the dashboard
  if (Session.get()) { location.replace('index.html'); return; }

  /* illustration + logo + icons */
  $$('[data-logo]').forEach((el) => { el.innerHTML = logo(+el.dataset.logo || 36); });
  $$('[data-i]').forEach((el) => { el.innerHTML = icon(el.dataset.i); el.style.cssText = 'width:20px;height:20px;flex:none'; });
  $$('[data-art]').forEach((el) => {
    el.innerHTML = '<svg viewBox="0 0 480 220" role="img" aria-label="Stylised EEG waveform over a neural network">' +
      '<g stroke="#5FD6CD" stroke-opacity=".35" stroke-width="1.2" fill="none">' +
      '<path d="M40 60 L120 110 L200 50 L290 120 L380 70 L450 130"/><path d="M40 160 L120 110 L200 170 L290 120 L380 175 L450 130"/><path d="M120 110 L290 120 M200 50 L200 170 M380 70 L380 175"/></g>' +
      '<g fill="#8276D8"><circle cx="40" cy="60" r="6"/><circle cx="120" cy="110" r="7"/><circle cx="200" cy="50" r="6"/><circle cx="290" cy="120" r="8"/><circle cx="380" cy="70" r="6"/><circle cx="450" cy="130" r="6"/><circle cx="40" cy="160" r="5"/><circle cx="200" cy="170" r="5"/><circle cx="380" cy="175" r="5"/></g>' +
      '<path d="M0 118 C20 118 24 90 40 90 S60 150 80 150 S100 70 120 70 S140 160 165 160 S190 100 210 100 S235 130 255 130 S285 60 305 60 S335 150 360 150 S395 105 420 105 S455 125 480 125" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round"/></svg>';
  });
  $$('.pw-toggle').forEach((b) => { b.innerHTML = icon('eye'); });

  /* show / hide password */
  document.addEventListener('click', (e) => {
    const b = e.target.closest('.pw-toggle'); if (!b) return;
    const input = $('#' + b.dataset.toggle), show = input.type === 'password';
    input.type = show ? 'text' : 'password';
    b.innerHTML = icon(show ? 'eyeoff' : 'eye');
    b.setAttribute('aria-pressed', String(show));
    b.setAttribute('aria-label', (show ? 'Hide ' : 'Show ') + (b.dataset.toggle === 'confirm' ? 'confirm password' : 'password'));
  });

  /* helpers */
  const msg = $('#msg');
  function banner(type, html) {
    msg.className = 'auth-msg notice notice-' + type; msg.hidden = false;
    msg.innerHTML = icon(type === 'success' ? 'check' : type === 'error' ? 'alert' : 'info') + '<span>' + html + '</span>';
    msg.querySelector('svg').style.cssText = 'width:20px;height:20px;flex:none';
  }
  function fieldError(id, text) {
    const el = $('#' + id), err = $('#' + id + '-err');
    if (err) err.textContent = text || '';
    if (el) { el.classList.toggle('invalid', !!text); if (text) el.setAttribute('aria-invalid', 'true'); else el.removeAttribute('aria-invalid'); }
    return !text;
  }
  const clearAll = () => { $$('.field-error').forEach((e) => (e.textContent = '')); $$('.input.invalid').forEach((i) => i.classList.remove('invalid')); msg.hidden = true; };
  const pwOk = (p) => p.length >= 8 && /[A-Za-z]/.test(p) && /\d/.test(p);

  let busy = false;
  function lock(btn, label) { busy = true; btn.disabled = true; btn.dataset.label = btn.textContent; btn.innerHTML = '<span class="spinner"></span> ' + label; }
  function unlock(btn) { busy = false; btn.disabled = false; btn.textContent = btn.dataset.label || btn.textContent; }
  const goHome = () => { location.href = 'index.html'; };

  /* ------------------- LOGIN ------------------- */
  if (isLogin) {
    const form = $('#form'), submit = $('#submit'), email = $('#email'), pw = $('#password');
    try { const saved = localStorage.getItem('ns_remember_email'); if (saved) { email.value = saved; $('#remember').checked = true; } } catch (e) { /* ignore */ }
    const q = new URLSearchParams(location.search);
    if (q.get('registered')) {
      banner('success', 'Demo profile created for this browser session. <b>This is a simulation — no real account exists.</b> Sign in with the email you registered (any password meeting the demo rule works), or use the demo account.');
      if (q.get('email')) email.value = q.get('email');
    }

    $('#fill').addEventListener('click', () => { email.value = DEMO.email; pw.value = DEMO.password; clearAll(); banner('info', 'Demo credentials filled in. Press <b>Sign In</b> to continue.'); pw.focus(); });
    $('#try').addEventListener('click', () => {
      if (busy) return; lock($('#try'), 'Opening…');
      Session.start({ name: DEMO.name, role: DEMO.role, email: DEMO.email });
      setTimeout(goHome, 350);
    });
    $('#forgot').addEventListener('click', (e) => {
      e.preventDefault(); clearAll();
      banner('info', '<b>Demo only.</b> Password recovery is not available — no email is sent and no account exists. Use the demonstration credentials below.');
    });

    form.addEventListener('submit', (e) => {
      e.preventDefault(); if (busy) return; clearAll();
      const em = email.value.trim().toLowerCase(), p = pw.value;
      let ok = true;
      if (!em) ok = fieldError('email', 'Enter your email address.') && ok;
      else if (!EMAIL_RE.test(em)) ok = fieldError('email', 'Enter a valid email address.') && ok;
      if (!p) ok = fieldError('password', 'Enter your password.') && ok;
      if (!ok) { banner('error', 'Please fix the highlighted fields.'); return; }

      let profile = null;
      if (em === DEMO.email && p === DEMO.password) profile = DEMO;
      else {
        const acct = Session.getAccount();
        // Simulation: the password is not stored, so a registered email accepts any password that meets the demo rule.
        if (acct && acct.email.toLowerCase() === em && pwOk(p)) profile = acct;
      }
      if (!profile) { banner('error', 'These details do not match the demo account or a profile registered in this session. Use <b>Try Demo Access</b> to explore.'); return; }

      try { if ($('#remember').checked) localStorage.setItem('ns_remember_email', em); else localStorage.removeItem('ns_remember_email'); } catch (er) { /* ignore */ }
      lock(submit, 'Signing in…');
      Session.start(profile);
      setTimeout(goHome, 450);
    });
  }

  /* ------------------- SIGN UP ------------------- */
  else {
    const form = $('#form'), submit = $('#submit'), pw = $('#password'), bar = $('#strength');
    pw.addEventListener('input', () => {
      const p = pw.value; let s = 0;
      if (p.length >= 8) s++; if (/[A-Z]/.test(p) && /[a-z]/.test(p)) s++; if (/\d/.test(p)) s++; if (/[^A-Za-z0-9]/.test(p)) s++;
      bar.style.width = (s * 25) + '%'; bar.style.background = s <= 1 ? '#C94C4C' : s <= 2 ? '#D99724' : '#16865B';
    });

    form.addEventListener('submit', (e) => {
      e.preventDefault(); if (busy) return; clearAll();
      const name = $('#name').value.trim(), email = $('#email').value.trim(), role = $('#role').value, org = $('#org').value.trim();
      const p = pw.value, c = $('#confirm').value, terms = $('#terms').checked;
      let ok = true;
      if (name.length < 2) ok = fieldError('name', 'Enter your full name.') && ok;
      if (!email) ok = fieldError('email', 'Enter your email address.') && ok;
      else if (!EMAIL_RE.test(email)) ok = fieldError('email', 'Enter a valid email address.') && ok;
      if (!role) ok = fieldError('role', 'Choose a professional role.') && ok;
      if (!p) ok = fieldError('password', 'Create a password.') && ok;
      else if (!pwOk(p)) ok = fieldError('password', 'Use at least 8 characters including a letter and a number.') && ok;
      if (!c) ok = fieldError('confirm', 'Confirm your password.') && ok;
      else if (p !== c) ok = fieldError('confirm', 'Passwords do not match.') && ok;
      if (!terms) ok = fieldError('terms', 'Please accept the research disclaimer to continue.') && ok;
      if (!ok) { banner('error', 'Please fix the highlighted fields.'); const bad = $('.input.invalid'); if (bad) bad.focus(); return; }

      lock(submit, 'Creating demo account…');
      Session.saveAccount({ name, email, role, institution: org });   // profile only — password discarded
      pw.value = ''; $('#confirm').value = '';
      banner('success', 'Demo account created for this browser session. <b>This is a simulation and no real account exists.</b> Redirecting to sign in…');
      setTimeout(() => { location.href = 'login.html?registered=1&email=' + encodeURIComponent(email); }, 1800);
    });
  }
})();
