/* ============================================================
   Raisable Robotics — intake: "Who are you?" modal + 3 forms
   (Corporate / CVC · Investor · Founder, 3 steps).
   Same transport, validation and UX conventions as raisable.vc
   forms.js; spec: "Raisable Robotics — ТЗ і GTM-плейбук", Форми.
   ============================================================ */
(function () {
  'use strict';

  /* ---------- Config ---------- */
  // Same lead store as raisable.vc: Apps Script relay (JSON, text/plain),
  // Formspree as the fallback so no lead is lost if the relay is down.
  var FORM_ENDPOINT = 'https://script.google.com/macros/s/AKfycbzjXFmkOy9jGCG8TuO1PCh7ZhMrq96sFLHlHHGtcJlFB1MTqhiGZIcXWTTzpiPZoXm0aA/exec';
  var FALLBACK_ENDPOINT = 'https://formspree.io/f/mrewovpk';
  var TRACK = 'robotics';
  var FORM_VERSION = 'robotics-v1';
  var MIN_FILL_MS = 4000; // time trap

  // Local previews never send real leads: payloads go to the console.
  var params = new URLSearchParams(location.search);
  var DEMO = /^(localhost|127\.0\.0\.1|\[::1\]|)$/.test(location.hostname) ||
             location.protocol === 'file:' || params.get('demo') === '1';

  var modal = document.getElementById('apply-modal');
  if (!modal) return;

  if (DEMO) {
    var badge = document.createElement('div');
    badge.className = 'demo-banner';
    badge.textContent = 'Preview · forms send nothing';
    document.body.appendChild(badge);
  }

  var steps = modal.querySelectorAll('.modal-step');
  var lastTrigger = null;
  var openedAt = 0;

  /* ---------- Analytics ---------- */
  function track(event, data) {
    var payload = Object.assign({ event: event, track: TRACK }, data || {});
    if (window.gtag) { window.gtag('event', event, Object.assign({ track: TRACK }, data || {})); }
    else if (window.dataLayer) { window.dataLayer.push(payload); }
    if (DEMO && window.console) console.debug('[analytics]', payload);
  }

  /* ---------- UTM + event context ---------- */
  var utm = {
    utm_source: params.get('utm_source') || '',
    utm_medium: params.get('utm_medium') || '',
    utm_campaign: params.get('utm_campaign') || '',
    utm_content: params.get('utm_content') || ''
  };
  // keep UTMs for the session, so an in-page navigation doesn't lose them
  try {
    if (utm.utm_source || utm.utm_campaign) sessionStorage.setItem('rsbl_rb_utm', JSON.stringify(utm));
    else {
      var saved = JSON.parse(sessionStorage.getItem('rsbl_rb_utm') || 'null');
      if (saved) utm = saved;
    }
  } catch (e) {}
  var EVENT_NAMES = {
    'sftw26-breakfast': 'SF Tech Week — Series A Founders & CVCs Breakfast (Oct 5)',
    'sftw26-pitchnight': 'SF Tech Week — VC <> Founders Pitch Night (Oct 8)',
    'tee': 'Raisable team T-shirt'
  };
  var fromEvent = utm.utm_medium === 'qr' || utm.utm_source === 'event';
  var eventName = EVENT_NAMES[utm.utm_campaign] || (fromEvent ? (utm.utm_campaign || 'Raisable event') : '');

  /* ---------- submission_id (upsert key) ---------- */
  function uuid() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      var r = Math.random() * 16 | 0;
      return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
  }
  function submissionId() {
    var id;
    try { id = sessionStorage.getItem('rsbl_rb_submission_id'); } catch (e) {}
    if (!id) {
      id = uuid();
      try { sessionStorage.setItem('rsbl_rb_submission_id', id); } catch (e) {}
    }
    return id;
  }

  /* ---------- Modal open / close / routing ---------- */
  function showStep(name) {
    steps.forEach(function (s) { s.hidden = s.getAttribute('data-step') !== name; });
    modal.scrollTop = 0;
    var focusable = modal.querySelector('.modal-step:not([hidden]) input:not(.gotcha), .modal-step:not([hidden]) button.who-option');
    if (focusable) focusable.focus({ preventScroll: true });
  }

  function openModal(step) {
    showStep(step || 'who');
    if (!modal.open) modal.showModal();
    openedAt = Date.now();
    if (step === 'founder' || step === 'investor' || step === 'corporate') track('form_open', { type: step });
  }

  function preselectProgram(value) {
    if (!value) return;
    var radio = modal.querySelector('input[name="format_interest"][value="' + value + '"]');
    if (radio) { radio.checked = true; radio.dispatchEvent(new Event('change', { bubbles: true })); }
  }

  document.querySelectorAll('[data-open-apply]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      lastTrigger = btn;
      var role = btn.getAttribute('data-role') || 'who';
      track('cta_click', { cta: btn.getAttribute('data-cta') || '', role: role });
      openModal(role);
      preselectProgram(btn.getAttribute('data-program'));
    });
  });

  modal.querySelectorAll('[data-choose]').forEach(function (btn) {
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      var step = btn.getAttribute('data-choose');
      showStep(step);
      openedAt = Date.now();
      track('form_open', { type: step });
    });
  });

  modal.querySelectorAll('[data-back]').forEach(function (btn) {
    btn.addEventListener('click', function () { showStep('who'); });
  });

  modal.querySelector('[data-close-modal]').addEventListener('click', function () { modal.close(); });
  modal.addEventListener('click', function (e) { if (e.target === modal) modal.close(); });
  modal.addEventListener('close', function () {
    if (location.hash.indexOf('#apply') === 0) {
      history.replaceState(null, '', location.pathname + location.search);
    }
    if (lastTrigger) { lastTrigger.focus(); lastTrigger = null; }
  });

  // Deep links: #apply · #apply/founder · #apply/investor · #apply/corporate (alias: partner, cvc)
  function routeFromHash() {
    var m = location.hash.match(/^#apply(?:\/(founder|investor|partner|corporate|cvc))?$/);
    if (!m) return;
    var map = { partner: 'corporate', cvc: 'corporate' };
    openModal(m[1] ? (map[m[1]] || m[1]) : 'who');
  }
  window.addEventListener('hashchange', routeFromHash);
  routeFromHash();

  /* ---------- Shared validation helpers ---------- */
  function normalizeUrl(v) {
    v = (v || '').trim();
    if (v && !/^https?:\/\//i.test(v)) v = 'https://' + v;
    return v;
  }
  function fieldWrap(input) { return input.closest('.field') || input.parentElement; }
  function setError(input, msg) {
    input.classList.add('is-invalid');
    input.setAttribute('aria-invalid', 'true');
    var wrap = fieldWrap(input);
    var err = wrap.querySelector('.field-error');
    if (!err) {
      err = document.createElement('p');
      err.className = 'field-error';
      wrap.appendChild(err);
    }
    err.textContent = msg;
  }
  function clearError(input) {
    input.classList.remove('is-invalid');
    input.removeAttribute('aria-invalid');
    var err = fieldWrap(input).querySelector('.field-error');
    if (err) err.remove();
  }
  function validateInput(input) {
    var v = input.value.trim();
    var kind = input.getAttribute('data-validate');
    if (input.type === 'checkbox') {
      if (input.hasAttribute('required') && !input.checked) { setError(input, 'Required.'); return false; }
      clearError(input); return true;
    }
    if (input.hasAttribute('required') && !v) { setError(input, 'This field is required.'); return false; }
    if (v && input.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) {
      setError(input, 'Please enter a valid email.'); return false;
    }
    if (v && kind === 'linkedin') {
      if (!/linkedin\.com\//i.test(v)) { setError(input, 'Please paste a linkedin.com link.'); return false; }
      input.value = normalizeUrl(v);
    }
    if (v && kind === 'url') input.value = normalizeUrl(v);
    if (v && input.minLength > 0 && v.length < input.minLength) { setError(input, 'A bit longer, please.'); return false; }
    clearError(input);
    return true;
  }
  function groupError(wrap, msg) {
    var err = wrap.querySelector('.field-error');
    if (msg) {
      if (!err) { err = document.createElement('p'); err.className = 'field-error'; wrap.appendChild(err); }
      err.textContent = msg;
    } else if (err) { err.remove(); }
  }
  function validateGroups(container) {
    var ok = true;
    container.querySelectorAll('[data-chips], [data-checks]').forEach(function (group) {
      if (group.closest('[hidden]')) return;
      var min = parseInt(group.getAttribute('data-min') || '0', 10);
      var checked = group.querySelectorAll('input:checked').length;
      var wrap = group.closest('.field');
      if (min && checked < min) { groupError(wrap, 'Pick at least ' + (min === 1 ? 'one' : min) + '.'); ok = false; }
      else groupError(wrap, '');
    });
    container.querySelectorAll('[data-radios]').forEach(function (group) {
      if (group.hidden || group.closest('[hidden]')) return;
      var name = group.getAttribute('data-radios');
      var any = group.querySelector('input[name="' + name + '"]:checked');
      var required = group.querySelector('input[required]');
      if (required && !any) { groupError(group, 'Choose one.'); ok = false; }
      else groupError(group, '');
    });
    return ok;
  }
  function validateSection(section) {
    var ok = true;
    var firstBad = null;
    section.querySelectorAll('input:not([type="radio"]):not([type="checkbox"]):not(.gotcha), textarea, select').forEach(function (input) {
      if (input.closest('[hidden]')) return;
      if (!validateInput(input)) { ok = false; firstBad = firstBad || input; }
    });
    section.querySelectorAll('input[type="checkbox"][required]').forEach(function (input) {
      if (input.closest('[hidden]')) return;
      if (!validateInput(input)) { ok = false; firstBad = firstBad || input; }
    });
    if (!validateGroups(section)) {
      ok = false;
      firstBad = firstBad || section.querySelector('.field-error');
    }
    if (firstBad) firstBad.scrollIntoView({ block: 'center', behavior: 'smooth' });
    return ok;
  }

  modal.querySelectorAll('input, textarea, select').forEach(function (input) {
    if (input.classList.contains('gotcha') || input.type === 'radio' || input.type === 'checkbox') return;
    input.addEventListener('blur', function () { if (input.value.trim()) validateInput(input); });
  });

  /* char counters */
  modal.querySelectorAll('[data-counter]').forEach(function (ta) {
    var counter = document.createElement('p');
    counter.className = 'char-counter';
    ta.after(counter);
    function update() { counter.textContent = ta.value.length + ' / ' + ta.maxLength; }
    ta.addEventListener('input', update);
    update();
  });

  /* max-N groups: disable the rest once the cap is reached */
  modal.querySelectorAll('[data-chips][data-max], [data-checks][data-max]').forEach(function (group) {
    var max = parseInt(group.getAttribute('data-max'), 10);
    var help = group.closest('.field').querySelector('[data-max-help]');
    function sync() {
      var atMax = group.querySelectorAll('input:checked').length >= max;
      group.querySelectorAll('input:not(:checked)').forEach(function (box) { box.disabled = atMax; });
      if (help) help.hidden = !atMax;
    }
    group.addEventListener('change', sync);
    group.__sync = sync;
  });

  /* ---------- Conditional fields ---------- */
  modal.querySelectorAll('form[data-form]').forEach(function (form) {
    // referral → ask who exactly
    var heardSel = form.querySelector('select[name="heard_from"]');
    var refField = form.querySelector('[data-referrer-field]');
    if (heardSel && refField) {
      var refInput = refField.querySelector('input');
      heardSel.addEventListener('change', function () {
        var isRef = /referral/i.test(heardSel.value);
        refField.hidden = !isRef;
        refInput.required = isRef;
        if (!isRef) { refInput.value = ''; clearError(refInput); }
      });
    }
    // arrived from an event QR → "how did you hear" is known; don't ask
    if (fromEvent && heardSel) {
      heardSel.value = 'Event / Conference';
      var heardWrap = form.querySelector('[data-heard]');
      if (heardWrap) heardWrap.hidden = true;
    }
    // corporate: soft warning on personal inboxes
    var work = form.querySelector('[data-validate="workmail"]');
    if (work) {
      work.addEventListener('blur', function () {
        var warn = fieldWrap(work).querySelector('[data-freemail]');
        var free = /@(gmail|yahoo|hotmail|outlook|icloud|proton|mail)\./i.test(work.value);
        if (warn) warn.hidden = !free;
      });
    }
    // investor: corporate VCs get pointed to the partner track
    var cvcNote = form.querySelector('[data-cvc-note]');
    if (cvcNote) {
      form.querySelectorAll('input[name="investor_type"]').forEach(function (r) {
        r.addEventListener('change', function () { cvcNote.hidden = !(r.checked && r.value === 'Corporate VC'); });
      });
    }
  });

  /* ---------- sessionStorage persistence ---------- */
  function storageKey(form) { return 'rsbl_rb_form_' + form.getAttribute('data-form'); }
  function saveForm(form) {
    var data = {};
    new FormData(form).forEach(function (v, k) {
      if (k === 'company_fax') return;
      if (data[k]) data[k] = [].concat(data[k], v); else data[k] = v;
    });
    if (form.__startedAt) data.__started = form.__startedAt; // keeps the relay's time check honest after a reload
    try { sessionStorage.setItem(storageKey(form), JSON.stringify(data)); } catch (e) {}
  }
  function restoreForm(form) {
    var raw;
    try { raw = sessionStorage.getItem(storageKey(form)); } catch (e) { return; }
    if (!raw) return;
    var data;
    try { data = JSON.parse(raw); } catch (e) { return; }
    if (Object.keys(data).length) form.__restored = true; // skip the time trap for a returning visitor
    if (data.__started) { form.__startedAt = data.__started; delete data.__started; }
    Object.keys(data).forEach(function (k) {
      var values = [].concat(data[k]);
      form.querySelectorAll('[name="' + k + '"]').forEach(function (input) {
        if (input.type === 'checkbox' || input.type === 'radio') {
          input.checked = values.indexOf(input.value) !== -1 || (k === 'consent' && values.indexOf('on') !== -1);
          if (input.checked) input.dispatchEvent(new Event('change', { bubbles: true }));
        } else if (!(fromEvent && k === 'heard_from')) {
          input.value = values[0];
          input.dispatchEvent(new Event('input', { bubbles: true }));
        }
      });
    });
  }
  modal.querySelectorAll('form[data-form]').forEach(function (form) {
    restoreForm(form);
    // the time trap counts from the first real keystroke or click, not from opening the modal
    var markStarted = function (e) { if (e.isTrusted && !form.__startedAt) form.__startedAt = Date.now(); };
    form.addEventListener('input', function (e) { markStarted(e); saveForm(form); });
    form.addEventListener('change', function (e) { markStarted(e); saveForm(form); });
  });

  /* ---------- Priority (per the spec) ---------- */
  function has(str, re) { return re.test(str || ''); }
  function computePriority(d) {
    if (d.type === 'corporate') {
      var format = has(d.partner_goal, /Co-hosting|roundtable|Founding partnership/);
      var soon = has(d.timeline, /This quarter|H1 2027/);
      var authority = has(d.decision_role, /decide|recommend/);
      var score = (format ? 1 : 0) + (soon ? 1 : 0) + (authority ? 1 : 0);
      return score === 3 ? 'hot' : (score === 2 ? 'warm' : 'nurture');
    }
    if (d.type === 'investor') {
      var stageFit = has(d.stage_focus, /Seed|Series A/);
      var digest = has(d.engagement, /digest/);
      var institutional = !has(d.investor_type, /Angel/);
      return stageFit && digest && institutional ? 'hot' : 'warm';
    }
    // founder
    var paid = has(d.deployment_stage, /Paid deployments/);
    var pilotOrPaid = paid || has(d.deployment_stage, /Pilot/);
    if (has(d.stage, /Series A|Series B/) && paid) return 'series_a_hot';
    if (has(d.stage, /^(Pre-seed|Seed)$/) && pilotOrPaid) return 'seed_hot';
    return 'pipeline';
  }

  /* Robotics answers duplicated into `notes`, so nothing is lost if the
     relay/sheet doesn't have the new columns yet. */
  var NOTE_FIELDS = {
    corporate: ['team_type', 'focus_areas', 'decision_role', 'pilot_problem'],
    investor: ['engagement'],
    founder: ['founder_role', 'deployment_stage', 'raised_to_date', 'demo_url', 'success_6m']
  };
  function notesSummary(d) {
    var parts = ['[Robotics' + (d.event ? ' · ' + d.event : '') + '] priority=' + d.priority];
    (NOTE_FIELDS[d.type] || []).forEach(function (k) { if (d[k]) parts.push(k + ': ' + d[k]); });
    return parts.join(' | ');
  }

  /* ---------- Payload + transport ---------- */
  function collectPayload(form, leadStatus) {
    var data = {
      type: form.getAttribute('data-form'),
      track: TRACK,
      form_version: FORM_VERSION,
      submission_id: submissionId(),
      lead_status: leadStatus,
      submitted_at: new Date().toISOString(),
      page_url: location.href.split('#')[0],
      referrer: document.referrer || '',
      form_opened_at: new Date(form.__startedAt || openedAt || Date.now()).toISOString(),
      restored: form.__restored ? 'yes' : '', // draft restored from this browser session — relay skips its time check
      utm_source: utm.utm_source,
      utm_medium: utm.utm_medium,
      utm_campaign: utm.utm_campaign,
      utm_content: utm.utm_content,
      event: eventName
    };
    var multi = {};
    new FormData(form).forEach(function (v, k) {
      if (multi[k]) multi[k] = [].concat(multi[k], v); else multi[k] = v;
    });
    Object.keys(multi).forEach(function (k) {
      data[k] = Array.isArray(multi[k]) ? multi[k].join('; ') : multi[k];
    });
    if (data.heard_from && fromEvent && eventName) data.heard_from = 'Event / Conference: ' + eventName;
    data.priority = computePriority(data);
    data.notes = notesSummary(data);
    return data;
  }

  function post(data) {
    if (DEMO) {
      window.__rbLastPayload = data; // inspect in preview
      if (window.console) console.info('[robotics-forms] DEMO — not sent', data);
      return new Promise(function (resolve) { setTimeout(function () { resolve({ ok: true }); }, 450); });
    }
    return fetch(FORM_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' }, // no CORS preflight
      body: JSON.stringify(data)
    }).then(function (res) {
      if (!res.ok) throw new Error('relay ' + res.status);
      return res;
    }).catch(function () {
      var fd = new FormData();
      Object.keys(data).forEach(function (k) { fd.append(k, data[k]); });
      return fetch(FALLBACK_ENDPOINT, { method: 'POST', body: fd, headers: { Accept: 'application/json' } });
    });
  }

  /* ---------- Success screens ---------- */
  function socialRow() {
    return '<div class="success-links success-social"><p class="social-note">In the meantime, follow the Raisable Robotics Series</p>' +
      '<div class="social-row">' +
      '<a href="https://www.youtube.com/@RaisableFounders" target="_blank" rel="noopener" aria-label="Raisable on YouTube"><img src="assets/img/LG_YOUTUBE_ICON.svg" alt="YouTube"></a>' +
      '<a href="https://www.linkedin.com/company/raisable-global/" target="_blank" rel="noopener" aria-label="Raisable on LinkedIn"><img src="assets/img/LG_LINKEDIN_ICON.svg" alt="LinkedIn"></a>' +
      '<a href="https://luma.com/raisable" target="_blank" rel="noopener" aria-label="Raisable events on Luma"><img src="assets/img/LG_LUMA_ICON.png" alt="Luma"></a>' +
      '</div></div>';
  }
  function successHTML(d) {
    if (d.type === 'corporate') {
      return '<h3 class="success-h">Thanks — <em>let’s scope it together.</em></h3>' +
        '<div class="success-body"><p>We’ll reach out within one business day to set up a 30-minute call — and come to it with founders matched to your focus.</p></div>' +
        socialRow();
    }
    if (d.type === 'investor') {
      return '<h3 class="success-h">Thanks — <em>let’s talk.</em></h3>' +
        '<div class="success-body"><p>We’ll reach out to set up a 20-minute intro. You’ll also get our next founder digest.</p></div>' +
        socialRow();
    }
    if (d.priority === 'series_a_hot') {
      return '<h3 class="success-h">You’re exactly who <em>we’re building this for.</em></h3>' +
        '<div class="success-body"><p>Your company looks like a strong fit for the 2027 Raisable Robotics Track. We’ll reach out within two business days to set up a call.</p></div>' +
        socialRow();
    }
    var eventsOnly = /events/i.test(d.format_interest || '');
    return '<h3 class="success-h">Application received — <em>you’re on the list.</em></h3>' +
      '<div class="success-body"><p>' + (eventsOnly
        ? 'We review every application personally and will reach out when an upcoming event fits your company.'
        : 'We review every application personally. You’ll hear from us first about the 2027 track and our upcoming events.') +
      '</p></div>' + socialRow();
  }
  function showSuccess(d) {
    var body = modal.querySelector('[data-success-body]');
    body.innerHTML = successHTML(d);
    showStep('success');
  }

  /* ---------- Submit (all three forms) ---------- */
  var founderNext = null; // set by the founder stepper below

  function handleSubmit(form, e) {
    e.preventDefault();
    var status = form.querySelector('.form-status');
    var type = form.getAttribute('data-form');
    // Enter pressed on an early founder step = "Next", not a submit
    if (type === 'founder' && form.querySelector('.btn-submit').hidden) {
      if (founderNext) founderNext();
      return;
    }
    var scope = form.querySelector('.fstep:not([hidden])') || form;
    if (!validateSection(scope)) {
      track('form_error', { type: type });
      return;
    }
    var data = collectPayload(form, 'complete');
    // spam: honeypot filled or submitted too fast → pretend success, send nothing
    var tooFast = !form.__restored && Date.now() - (form.__startedAt || openedAt) < MIN_FILL_MS;
    if ((data.company_fax || '').trim() || tooFast) {
      showSuccess(data);
      return;
    }
    delete data.company_fax;
    var btn = form.querySelector('.btn-submit');
    btn.disabled = true;
    status.textContent = 'Sending…';
    status.className = 'form-status';
    post(data).then(function (res) {
      if (res && res.ok === false) throw new Error('bad status');
      track('form_submit', { type: type, priority: data.priority, event_campaign: fromEvent ? (utm.utm_campaign || '') : '' });
      track('generate_lead', { type: type, priority: data.priority, event_campaign: fromEvent ? (utm.utm_campaign || '') : '' }); // GA4 recommended lead event ("Generate leads" reports); the key event is form_submit
      try {
        sessionStorage.removeItem(storageKey(form));
        sessionStorage.removeItem('rsbl_rb_submission_id'); // next submission gets its own id
      } catch (err) {}
      form.__restored = false;
      form.__startedAt = 0;
      form.reset();
      form.querySelectorAll('[data-max]').forEach(function (g) { if (g.__sync) g.__sync(); });
      form.querySelectorAll('[data-referrer-field], [data-cvc-note], [data-freemail]').forEach(function (el) { el.hidden = true; });
      if (fromEvent) {
        var heard = form.querySelector('select[name="heard_from"]');
        if (heard) heard.value = 'Event / Conference';
      }
      status.textContent = '';
      showSuccess(data);
    }).catch(function () {
      status.textContent = 'Something went wrong — please try again in a moment.';
      status.className = 'form-status err';
      track('form_error', { type: type, reason: 'network' });
    }).then(function () { btn.disabled = false; });
  }

  modal.querySelectorAll('form[data-form]').forEach(function (form) {
    form.addEventListener('submit', function (e) { handleSubmit(form, e); });
  });

  /* ---------- Founder: 3 steps ---------- */
  var founderForm = modal.querySelector('form[data-form="founder"]');
  if (founderForm) {
    var fsteps = founderForm.querySelectorAll('.fstep');
    var total = fsteps.length;
    var current = 1;
    var partialSent = false;
    var progressEl = founderForm.querySelector('[data-progress]');
    var barEl = founderForm.querySelector('[data-bar]');
    var backBtn = founderForm.querySelector('[data-step-back]');
    var nextBtn = founderForm.querySelector('[data-step-next]');
    var submitBtn = founderForm.querySelector('.btn-submit');

    var renderStep = function (silent) {
      fsteps.forEach(function (fs) { fs.hidden = parseInt(fs.getAttribute('data-fstep'), 10) !== current; });
      progressEl.textContent = current;
      if (barEl) barEl.style.transform = 'scaleX(' + (current / total) + ')';
      backBtn.hidden = current === 1;
      nextBtn.hidden = current === total;
      submitBtn.hidden = current !== total;
      modal.scrollTop = 0;
      if (silent) return; // the first render on page load is not a step the visitor took
      track('form_step', { type: 'founder', step: current });
    };

    founderNext = function () { nextBtn.click(); };
    nextBtn.addEventListener('click', function () {
      var section = founderForm.querySelector('.fstep[data-fstep="' + current + '"]');
      if (!validateSection(section)) return;
      if (current === 1 && !partialSent) {
        partialSent = true;
        var partial = collectPayload(founderForm, 'partial');
        if (!(partial.company_fax || '').trim()) {
          delete partial.company_fax;
          post(partial).catch(function () {}); // fire-and-forget
          track('form_partial', { type: 'founder' });
        }
      }
      current = Math.min(total, current + 1);
      renderStep();
    });
    backBtn.addEventListener('click', function () {
      current = Math.max(1, current - 1);
      renderStep();
    });
    renderStep(true);
  }
})();
