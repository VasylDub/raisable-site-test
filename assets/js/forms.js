/* ============================================================
   Raisable intake forms v2 — "Who are you?" modal + 3 forms
   Spec: TZ — Raisable Website Intake Forms · v2
   ============================================================ */
(function () {
  'use strict';

  /* ---------- Config (front-end) ---------- */
  // Apps Script relay Web App URL. Empty = fall back to Formspree so no lead is lost
  // before the relay is deployed.
  var FORM_ENDPOINT = 'https://script.google.com/macros/s/AKfycbzjXFmkOy9jGCG8TuO1PCh7ZhMrq96sFLHlHHGtcJlFB1MTqhiGZIcXWTTzpiPZoXm0aA/exec';
  var FALLBACK_ENDPOINT = 'https://formspree.io/f/mrewovpk';
  var CALENDAR_URL_CALL = 'https://calendar.app.google/sFcnmXxz7LxbKPodA';
  var CALENDAR_URL_STRATEGY_500 = 'https://calendar.app.google/BeoJqfbJL3KaHH7V6';

  var modal = document.getElementById('apply-modal');
  if (!modal) return;

  var steps = modal.querySelectorAll('.modal-step');
  var lastTrigger = null;
  var openedAt = 0;

  /* ---------- Analytics stub ---------- */
  function track(event, data) {
    var payload = Object.assign({ event: event }, data || {});
    if (window.dataLayer) { window.dataLayer.push(payload); }
    else if (window.console && console.debug) { console.debug('[analytics]', payload); }
  }

  /* ---------- submission_id (upsert key) ---------- */
  function uuid() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      var r = Math.random() * 16 | 0;
      return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
  }
  function submissionId() {
    var id = sessionStorage.getItem('rsbl_submission_id');
    if (!id) { id = uuid(); sessionStorage.setItem('rsbl_submission_id', id); }
    return id;
  }

  /* ---------- Modal open / close / routing ---------- */
  function showStep(name) {
    steps.forEach(function (s) { s.hidden = s.getAttribute('data-step') !== name; });
    modal.scrollTop = 0;
    var focusable = modal.querySelector('.modal-step:not([hidden]) input, .modal-step:not([hidden]) button.who-option');
    if (focusable) focusable.focus({ preventScroll: true });
  }

  function openModal(step) {
    showStep(step || 'who');
    if (!modal.open) modal.showModal();
    openedAt = Date.now();
    if (step === 'founder' || step === 'investor' || step === 'corporate') {
      track('form_open', { type: step });
    }
  }

  document.querySelectorAll('[data-open-apply]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      lastTrigger = btn;
      openModal(btn.getAttribute('data-role') || 'who');
    });
  });

  modal.querySelectorAll('[data-choose]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var step = btn.getAttribute('data-choose');
      showStep(step);
      openedAt = openedAt || Date.now();
      track('form_open', { type: step });
    });
  });

  modal.querySelectorAll('[data-back]').forEach(function (btn) {
    btn.addEventListener('click', function () { showStep('who'); });
  });

  modal.querySelector('[data-close-modal]').addEventListener('click', function () { modal.close(); });
  modal.addEventListener('click', function (e) { if (e.target === modal) modal.close(); });
  modal.addEventListener('close', function () {
    if (lastTrigger) { lastTrigger.focus(); lastTrigger = null; }
  });

  // Deep links: #apply/founder | #apply/investor | #apply/partner
  function routeFromHash() {
    var m = location.hash.match(/^#apply\/(founder|investor|partner|corporate)?$/);
    if (!m) return;
    var map = { partner: 'corporate' };
    openModal(m[1] ? (map[m[1]] || m[1]) : 'who');
  }
  window.addEventListener('hashchange', routeFromHash);
  routeFromHash();

  /* ---------- Shared helpers ---------- */
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
    if (input.hasAttribute('required') && !v && input.type !== 'checkbox') {
      setError(input, 'This field is required.'); return false;
    }
    if (input.type === 'checkbox' && input.hasAttribute('required') && !input.checked) {
      setError(input, 'Required.'); return false;
    }
    if (v && input.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) {
      setError(input, 'Please enter a valid email.'); return false;
    }
    if (v && kind === 'linkedin') {
      if (!/linkedin\.com\//i.test(v)) { setError(input, 'Please paste a linkedin.com link.'); return false; }
      input.value = normalizeUrl(v);
    }
    if (v && kind === 'url') input.value = normalizeUrl(v);
    if (v && input.minLength > 0 && v.length < input.minLength) {
      setError(input, 'A bit longer, please.'); return false;
    }
    clearError(input);
    return true;
  }

  function validateGroupBoxes(container) {
    // checkbox/chip groups with data-min
    var ok = true;
    container.querySelectorAll('[data-chips], [data-checks]').forEach(function (group) {
      if (group.closest('[hidden]')) return;
      var min = parseInt(group.getAttribute('data-min') || '0', 10);
      var checked = group.querySelectorAll('input:checked').length;
      var wrap = group.closest('.field');
      var err = wrap.querySelector('.field-error');
      if (min && checked < min) {
        if (!err) {
          err = document.createElement('p');
          err.className = 'field-error';
          wrap.appendChild(err);
        }
        err.textContent = 'Pick at least ' + (min === 1 ? 'one' : min) + '.';
        ok = false;
      } else if (err) { err.remove(); }
    });
    return ok;
  }

  function validateRadios(container) {
    var ok = true;
    container.querySelectorAll('[data-radios]').forEach(function (group) {
      if (group.hidden || group.closest('[hidden]')) return;
      var name = group.getAttribute('data-radios');
      var form = group.closest('form');
      var any = form.querySelector('input[name="' + name + '"]:checked');
      var required = group.querySelector('input[required]') || group.hasAttribute('data-required');
      var err = group.querySelector('.field-error');
      if (required && !any) {
        if (!err) {
          err = document.createElement('p');
          err.className = 'field-error';
          group.appendChild(err);
        }
        err.textContent = 'Choose one.';
        ok = false;
      } else if (err) { err.remove(); }
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
    if (!validateRadios(section)) ok = false;
    if (!validateGroupBoxes(section)) ok = false;
    if (firstBad) firstBad.scrollIntoView({ block: 'center', behavior: 'smooth' });
    return ok;
  }

  /* blur validation */
  modal.querySelectorAll('input, textarea, select').forEach(function (input) {
    if (input.classList.contains('gotcha')) return;
    input.addEventListener('blur', function () { validateInput(input); });
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

  /* max-N checkbox groups */
  modal.querySelectorAll('[data-checks][data-max]').forEach(function (group) {
    var max = parseInt(group.getAttribute('data-max'), 10);
    var help = group.closest('.field').querySelector('[data-max-help]');
    group.addEventListener('change', function () {
      var checked = group.querySelectorAll('input:checked').length;
      var atMax = checked >= max;
      group.querySelectorAll('input:not(:checked)').forEach(function (box) { box.disabled = atMax; });
      if (help) help.hidden = !atMax;
    });
  });

  /* "Other" industry free text */
  modal.querySelectorAll('[data-chips]').forEach(function (group) {
    var other = group.parentElement.querySelector('.chip-other');
    if (!other) return;
    group.addEventListener('change', function () {
      var otherBox = group.querySelector('input[value="Other"]');
      other.hidden = !(otherBox && otherBox.checked);
    });
  });

  /* conditional fields */
  function bindConditional(form) {
    var round = form.querySelector('[data-conditional="round_size"]');
    if (round) {
      form.querySelectorAll('input[name="fundraising_status"]').forEach(function (r) {
        r.addEventListener('change', function () {
          var show = /Preparing|Actively/.test(r.value) && r.checked;
          round.hidden = !show;
          if (!show) round.querySelectorAll('input').forEach(function (b) { b.checked = false; });
        });
      });
    }
    var fund = form.querySelector('[data-conditional="fund_name"]');
    if (fund) {
      form.querySelectorAll('input[name="investor_type"]').forEach(function (r) {
        r.addEventListener('change', function () {
          var show = r.checked && r.value !== 'Angel investor';
          fund.hidden = !show;
          var input = fund.querySelector('input');
          if (show) input.setAttribute('required', ''); else { input.removeAttribute('required'); clearError(input); }
        });
      });
    }
    // corporate free-mail soft warning
    var work = form.querySelector('[data-validate="workmail"]');
    if (work) {
      work.addEventListener('blur', function () {
        var warn = fieldWrap(work).querySelector('[data-freemail]');
        var free = /@(gmail|yahoo|hotmail|outlook|icloud|proton|mail)\./i.test(work.value);
        if (warn) warn.hidden = !free;
      });
    }
  }
  modal.querySelectorAll('form[data-form]').forEach(bindConditional);

  /* ---------- sessionStorage persistence ---------- */
  function storageKey(form) { return 'rsbl_form_' + form.getAttribute('data-form'); }

  function saveForm(form) {
    var data = {};
    new FormData(form).forEach(function (v, k) {
      if (k === 'company_fax') return;
      if (data[k]) { data[k] = [].concat(data[k], v); } else { data[k] = v; }
    });
    try { sessionStorage.setItem(storageKey(form), JSON.stringify(data)); } catch (e) {}
  }

  function restoreForm(form) {
    var raw;
    try { raw = sessionStorage.getItem(storageKey(form)); } catch (e) { return; }
    if (!raw) return;
    var data;
    try { data = JSON.parse(raw); } catch (e) { return; }
    Object.keys(data).forEach(function (k) {
      var values = [].concat(data[k]);
      form.querySelectorAll('[name="' + k + '"]').forEach(function (input) {
        if (input.type === 'checkbox' || input.type === 'radio') {
          input.checked = values.indexOf(input.value) !== -1 || (input.type === 'checkbox' && values.indexOf('on') !== -1 && k === 'consent');
          if (input.checked) input.dispatchEvent(new Event('change', { bubbles: true }));
        } else {
          input.value = values[0];
          input.dispatchEvent(new Event('input', { bubbles: true }));
        }
      });
    });
  }

  modal.querySelectorAll('form[data-form]').forEach(function (form) {
    restoreForm(form);
    form.addEventListener('input', function () { saveForm(form); });
    form.addEventListener('change', function () { saveForm(form); });
  });

  /* ---------- Payload + submit ---------- */
  function collectPayload(form, leadStatus) {
    var data = {
      type: form.getAttribute('data-form'),
      submission_id: submissionId(),
      lead_status: leadStatus,
      submitted_at: new Date().toISOString(),
      page_url: location.href.split('#')[0],
      referrer: document.referrer || '',
      form_opened_at: new Date(openedAt || Date.now()).toISOString()
    };
    var params = new URLSearchParams(location.search);
    ['utm_source', 'utm_medium', 'utm_campaign'].forEach(function (k) {
      data[k] = params.get(k) || '';
    });
    var multi = {};
    new FormData(form).forEach(function (v, k) {
      if (k === 'company_fax') { data[k] = v; return; }
      if (multi[k]) { multi[k] = [].concat(multi[k], v); } else { multi[k] = v; }
    });
    Object.keys(multi).forEach(function (k) {
      data[k] = Array.isArray(multi[k]) ? multi[k].join('; ') : multi[k];
    });
    if (data.industries_other && /Other/.test(data.industries || '')) {
      data.industries = data.industries.replace('Other', 'Other: ' + data.industries_other);
    }
    delete data.industries_other;
    return data;
  }

  function post(data) {
    if (FORM_ENDPOINT) {
      // Apps Script relay: text/plain JSON avoids a CORS preflight
      return fetch(FORM_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(data)
      });
    }
    var fd = new FormData();
    Object.keys(data).forEach(function (k) { fd.append(k, data[k]); });
    return fetch(FALLBACK_ENDPOINT, {
      method: 'POST',
      body: fd,
      headers: { Accept: 'application/json' }
    });
  }

  /* ---------- Priority tagging (§8) ---------- */
  function computeTags(d) {
    var formatSet = /Founder Circle|Silicon Valley Bootcamp|Structured program/.test(d.format_interest || '');
    var asap = /^ASAP/.test(d.timeline || '');
    var buyer = 'none';
    if (formatSet && asap) buyer = 'hot';
    else if (formatSet || asap) buyer = 'warm';

    var priority = 'standard';
    if (d.type === 'founder') {
      var mrrHigh = /\$25K–\$100K|Over \$100K/.test(d.mrr_band || '');
      var raising = /Preparing|Actively/.test(d.fundraising_status || '');
      var actively = /Actively/.test(d.fundraising_status || '');
      if (buyer === 'hot' || (mrrHigh && raising) || (asap && actively)) priority = 'hot';
      else if ((d.us_plans || '') === 'Visiting in the next 1–3 months') priority = 'bootcamp';
    } else if (d.type === 'investor') {
      if (/Curated deal flow/.test(d.engagement || '')) priority = 'hot';
    } else if (d.type === 'corporate') {
      if (/Exploring a branded accelerator/.test(d.partner_goal || '')) priority = 'hot';
    }
    return { priority: priority, buyer_intent: buyer };
  }

  /* ---------- Success screens ---------- */
  // Google's calendar.app.google short links send X-Frame-Options: DENY, so they
  // can't be embedded in an <iframe>. Render a prominent button instead — reliable
  // everywhere and better on mobile. (To embed inline later, swap CALENDAR_URL_*
  // for a Google Appointment Scheduling embed URL ending in ?gv=true and restore
  // the iframe.)
  function calendarBlock(url) {
    return '<a class="btn btn-primary success-cal-btn" href="' + url +
      '" target="_blank" rel="noopener">Pick a time&nbsp;<span class="arr">→</span></a>' +
      '<p class="success-cal-note">Opens our booking calendar in a new tab.</p>';
  }

  function successHTML(type, tags, data) {
    if (type === 'founder') {
      if (tags.priority === 'hot' || tags.buyer_intent === 'hot') {
        return '<h3 class="success-h">You’re exactly <em>who we work with.</em></h3>' +
          '<div class="success-body"><p>Let’s not wait — grab a time and let’s talk.</p></div>' +
          calendarBlock(CALENDAR_URL_CALL) +
          '<p class="success-secondary">Ready to dive straight in? ' +
          '<a href="' + CALENDAR_URL_STRATEGY_500 + '" target="_blank" rel="noopener">Book a paid strategy session →</a></p>';
      }
      var bootcampLine = tags.priority === 'bootcamp'
        ? '<p class="success-note">You’re heading to the Bay soon — our in-person Bootcamp may be a fit. We’ll flag it when we reach out.</p>'
        : '';
      return '<h3 class="success-h">Application received.</h3>' + bootcampLine +
        '<div class="success-body"><p>We review every application personally. If there’s a fit, you’ll hear from us within a few days.</p></div>' +
        '<div class="success-links">' +
        '<a href="https://www.youtube.com/@RaisableFounders" target="_blank" rel="noopener">Meanwhile — subscribe on YouTube →</a>' +
        '<a href="https://luma.com/raisable" target="_blank" rel="noopener">Follow our event calendar →</a></div>';
    }
    if (type === 'investor') {
      return '<h3 class="success-h">Thanks — <em>let’s talk.</em></h3>' +
        '<div class="success-body"><p>Pick a time that works for you.</p></div>' +
        calendarBlock(CALENDAR_URL_CALL);
    }
    var aaas = /Exploring a branded accelerator/.test(data.partner_goal || '')
      ? '<div class="success-links"><a href="https://accelerator.raisable.vc" target="_blank" rel="noopener">' +
        'In the meantime — see how our Accelerator-as-a-Service works →</a></div>'
      : '';
    return '<h3 class="success-h">Thanks — <em>let’s build.</em></h3>' +
      '<div class="success-body"><p>Pick a time that works for you.</p></div>' +
      calendarBlock(CALENDAR_URL_CALL) + aaas;
  }

  function showSuccess(type, tags, data) {
    modal.querySelector('[data-success-body]').innerHTML = successHTML(type, tags, data);
    showStep('success');
  }

  /* ---------- Founder multi-step ---------- */
  var founderForm = modal.querySelector('form[data-form="founder"]');
  if (founderForm) {
    var fsteps = founderForm.querySelectorAll('.fstep');
    var current = 1;
    var partialSent = false;
    var progressEl = founderForm.querySelector('[data-progress]');
    var barEl = founderForm.querySelector('[data-bar]');
    var backBtn = founderForm.querySelector('[data-step-back]');
    var nextBtn = founderForm.querySelector('[data-step-next]');
    var submitBtn = founderForm.querySelector('.btn-submit');

    function renderStep() {
      fsteps.forEach(function (fs) {
        fs.hidden = parseInt(fs.getAttribute('data-fstep'), 10) !== current;
      });
      progressEl.textContent = current;
      if (barEl) barEl.style.transform = 'scaleX(' + (current / 4) + ')';
      backBtn.hidden = current === 1;
      nextBtn.hidden = current === 4;
      submitBtn.hidden = current !== 4;
      modal.scrollTop = 0;
      track('form_step', { type: 'founder', step: current });
    }

    function goNext() {
      if (current >= 4) return;
      var section = founderForm.querySelector('.fstep[data-fstep="' + current + '"]');
      if (!validateSection(section)) return;
      if (current === 1 && !partialSent) {
        partialSent = true;
        var partial = collectPayload(founderForm, 'partial');
        post(partial).catch(function () {}); // fire-and-forget; never block or surface errors
        track('form_partial', { type: 'founder' });
      }
      current = Math.min(4, current + 1);
      renderStep();
    }

    nextBtn.addEventListener('click', goNext);

    backBtn.addEventListener('click', function () {
      current = Math.max(1, current - 1);
      renderStep();
    });

    // Enter in a text input on steps 1–3 should mean "Next", not submit the form
    founderForm.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter' || e.target.tagName === 'TEXTAREA' || e.target.type === 'submit') return;
      if (current < 4) { e.preventDefault(); goNext(); }
    });

    renderStep();
  }

  /* ---------- Submit (all forms) ---------- */
  modal.querySelectorAll('form[data-form]').forEach(function (form) {
    var type = form.getAttribute('data-form');
    var status = form.querySelector('.form-status');
    var submitBtn = form.querySelector('.btn-submit');

    form.addEventListener('submit', function (e) {
      e.preventDefault();

      // Founder: submits only from step 4 (guards against implicit submission)
      if (type === 'founder' && form.querySelector('.fstep[data-fstep="4"]').hidden) return;

      var scope = type === 'founder'
        ? form.querySelector('.fstep[data-fstep="4"]')
        : form;
      if (!validateSection(scope)) {
        status.textContent = 'Please fill in the highlighted fields.';
        status.className = 'form-status err';
        track('form_error', { type: type, reason: 'validation' });
        return;
      }

      var data = collectPayload(form, 'complete');
      var tags = computeTags(data);
      data.priority = tags.priority;
      data.buyer_intent = tags.buyer_intent;

      submitBtn.disabled = true;
      status.textContent = 'Sending…';
      status.className = 'form-status';

      post(data).then(function (res) {
        if (!res.ok) throw new Error('http ' + res.status);
        track('form_submit', { type: type, priority: tags.priority, buyer_intent: tags.buyer_intent });
        try {
          sessionStorage.removeItem(storageKey(form));
          sessionStorage.removeItem('rsbl_submission_id');
        } catch (err) {}
        form.reset();
        showSuccess(type, tags, data);
      }).catch(function () {
        status.textContent = 'Something went wrong — please try again or email og@raisable.vc';
        status.className = 'form-status err';
        track('form_error', { type: type, reason: 'network' });
      }).finally(function () {
        submitBtn.disabled = false;
      });
    });
  });
})();
