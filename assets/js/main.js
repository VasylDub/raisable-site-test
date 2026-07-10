/* Raisable.vc — main site interactions */
(function () {
  'use strict';

  /* ============================================================
     CONFIG — Why Raisable proof band (fill before launch).
     Leave a stat '' to keep it hidden. Do NOT invent numbers.
     e.g. { founders: '120+', raised: '$25M+', intros: '400+' }
     ============================================================ */
  var WHY_STATS = { founders: '', raised: '', intros: '' };

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function pushEvent(payload) {
    if (window.dataLayer) { window.dataLayer.push(payload); }
    if (window.gtag) {
      var params = {};
      Object.keys(payload).forEach(function (k) { if (k !== 'event') params[k] = payload[k]; });
      window.gtag('event', payload.event || 'event', params);
    } else if (window.console && console.debug) { console.debug('[analytics]', payload); }
  }

  /* ---------- Nav: solid on scroll + mobile menu ---------- */
  var nav = document.getElementById('nav');
  var toggle = document.querySelector('.nav-toggle');

  function onScroll() {
    if (nav) nav.classList.toggle('is-solid', window.scrollY > 40);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  if (toggle) {
    toggle.addEventListener('click', function () {
      var open = nav.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', String(open));
    });
    document.querySelectorAll('.nav-links a').forEach(function (a) {
      a.addEventListener('click', function () {
        nav.classList.remove('is-open');
        toggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  /* ---------- Hero video: slow, calm playback ---------- */
  var video = document.getElementById('hero-video');
  if (video) {
    video.playbackRate = 0.85;
    if (reduceMotion) { video.removeAttribute('autoplay'); video.pause(); }
  }

  /* ---------- Count-up numbers ---------- */
  function countUp(el) {
    var target = parseInt(el.getAttribute('data-count'), 10);
    var suffix = el.getAttribute('data-suffix') || '';
    var t0 = null;
    var dur = 1400;
    function step(t) {
      if (!t0) t0 = t;
      var p = Math.min((t - t0) / dur, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(target * eased) + suffix;
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  var counters = document.querySelectorAll('[data-count]');
  if (counters.length && !reduceMotion && 'IntersectionObserver' in window) {
    var cObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { countUp(e.target); cObs.unobserve(e.target); }
      });
    }, { threshold: 0.4 });
    counters.forEach(function (el) { cObs.observe(el); });
  }

  /* ---------- Reveal on scroll ---------- */
  /* [data-reveal-watch] elements get .is-visible without .reveal's styling —
     used by the compare tracks so each column triggers when IT enters view */
  var reveals = document.querySelectorAll('.reveal, [data-reveal-watch]');
  if (reveals.length && 'IntersectionObserver' in window && !reduceMotion) {
    var rObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('is-visible'); rObs.unobserve(e.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    reveals.forEach(function (el) { rObs.observe(el); });
    // Safety net: some embedded/webview browsers never deliver IO callbacks.
    // If nothing has revealed after 4s, the observer is broken — show everything.
    setTimeout(function () {
      if (!document.querySelector('.reveal.is-visible')) {
        reveals.forEach(function (el) { el.classList.add('is-visible'); });
        counters.forEach(function (el) {
          el.textContent = el.getAttribute('data-count') + (el.getAttribute('data-suffix') || '');
        });
      }
    }, 4000);
  } else {
    reveals.forEach(function (el) { el.classList.add('is-visible'); });
  }

  /* ---------- Marquees: duplicate tracks for seamless loops ---------- */
  if (!reduceMotion) {
    document.querySelectorAll('.rooms-track, [data-marquee]').forEach(function (track) {
      var originals = track.children.length;
      track.innerHTML += track.innerHTML;
      // duplicated half is decorative
      Array.prototype.slice.call(track.children, originals).forEach(function (node) {
        node.setAttribute('aria-hidden', 'true');
        node.querySelectorAll('img').forEach(function (img) { img.alt = ''; });
        if (node.tagName === 'IMG') node.alt = '';
      });
    });
  }

  /* ---------- Testimonial carousel (2-up pages) ---------- */
  var carousel = document.querySelector('[data-carousel]');
  if (carousel) {
    var qTrack = carousel.querySelector('.quotes-track');
    var prev = carousel.querySelector('[data-prev]');
    var next = carousel.querySelector('[data-next]');
    var dots = carousel.querySelector('.quotes-dots');
    var total = qTrack.children.length;
    var page = 0;

    function perPage() {
      return window.matchMedia('(max-width: 900px)').matches ? 1 : 2;
    }
    function pages() { return Math.ceil(total / perPage()); }

    function render() {
      var pp = perPage();
      var max = pages() - 1;
      if (page > max) page = max;
      var card = qTrack.children[0];
      var gap = 20;
      var offset = page * pp * (card.getBoundingClientRect().width + gap);
      qTrack.style.transform = 'translateX(-' + offset + 'px)';
      dots.textContent = (page + 1) + ' / ' + (max + 1);
    }

    function step(dir) {
      var n = pages();
      page = (page + dir + n) % n; // wrap-around slider
      render();
    }

    /* autoplay: advance every 4s; pause on hover/focus, none under reduced motion */
    var autoTimer = null;
    function startAuto() {
      if (reduceMotion || autoTimer) return;
      autoTimer = setInterval(function () { step(1); }, 4000);
    }
    function stopAuto() {
      if (autoTimer) { clearInterval(autoTimer); autoTimer = null; }
    }

    prev.addEventListener('click', function () { step(-1); stopAuto(); startAuto(); });
    next.addEventListener('click', function () { step(1); stopAuto(); startAuto(); });
    carousel.addEventListener('mouseenter', stopAuto);
    carousel.addEventListener('mouseleave', startAuto);
    carousel.addEventListener('focusin', stopAuto);
    carousel.addEventListener('focusout', startAuto);
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) stopAuto(); else startAuto();
    });
    window.addEventListener('resize', render);
    render();
    startAuto();
  }

  /* ---------- Programs: cursor spotlight on the plates ---------- */
  if (!reduceMotion && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    document.querySelectorAll('.program-row').forEach(function (row) {
      row.addEventListener('mousemove', function (e) {
        var r = row.getBoundingClientRect();
        row.style.setProperty('--mx', (e.clientX - r.left) + 'px');
        row.style.setProperty('--my', (e.clientY - r.top) + 'px');
      });
    });
  }

  /* ---------- Mentors: teaser row dissolve + hidden rows toggle ---------- */
  var mentorsGrid = document.getElementById('mentors-grid');
  var moreBtn = document.querySelector('[data-show-mentors]');
  var mentorsPeek = document.querySelector('.mentors-peek');
  if (mentorsGrid && moreBtn) {
    var mLabel = moreBtn.querySelector('[data-more-label]');
    var setMentorsExpanded = function (expanded) {
      mentorsGrid.classList.toggle('is-collapsed', !expanded);
      mentorsGrid.querySelectorAll('.person-more').forEach(function (card) {
        card.hidden = !expanded;
        if (expanded) card.classList.add('row-in');
      });
      moreBtn.setAttribute('aria-expanded', String(expanded));
      moreBtn.classList.toggle('is-open', expanded);
      if (mLabel) mLabel.textContent = expanded ? 'Show less' : 'Show more mentors';
    };
    moreBtn.addEventListener('click', function () {
      setMentorsExpanded(mentorsGrid.classList.contains('is-collapsed'));
    });
    if (mentorsPeek) {
      mentorsPeek.addEventListener('click', function () { setMentorsExpanded(true); });
    }
  }

  /* ---------- Programs: collapsed descriptions + hidden rows toggle ---------- */
  var progList = document.querySelector('.programs');
  var moreProg = document.querySelector('[data-show-programs]');
  var peekBtn = document.querySelector('.programs-peek');
  if (progList && moreProg) {
    var progLabel = moreProg.querySelector('[data-more-label]');
    var setProgramsExpanded = function (expanded) {
      progList.classList.toggle('is-collapsed', !expanded);
      document.querySelectorAll('.programs .program-more').forEach(function (row) {
        row.hidden = !expanded;
        if (expanded) row.classList.add('row-in');
      });
      moreProg.setAttribute('aria-expanded', String(expanded));
      moreProg.classList.toggle('is-open', expanded);
      if (progLabel) progLabel.textContent = expanded ? 'Show less' : 'Show more';
    };
    moreProg.addEventListener('click', function () {
      setProgramsExpanded(progList.classList.contains('is-collapsed'));
    });
    if (peekBtn) {
      peekBtn.addEventListener('click', function () { setProgramsExpanded(true); });
    }
  }

  /* ---------- Why Raisable: proof band + analytics (per TZ) ---------- */
  var proof = document.getElementById('why-proof');
  if (proof) {
    var anyStat = false;
    Object.keys(WHY_STATS).forEach(function (k) {
      var el = proof.querySelector('[data-stat="' + k + '"]');
      if (el && WHY_STATS[k]) {
        el.querySelector('strong').textContent = WHY_STATS[k];
        el.hidden = false;
        anyStat = true;
      }
    });
    var statsWrap = proof.querySelector('[data-proof-stats]');
    if (statsWrap) statsWrap.hidden = !anyStat;
    var hasLogos = proof.querySelectorAll('.proof-logos img').length > 0;
    var hasQuote = !!proof.querySelector('.proof-quote blockquote');
    if (!anyStat && !hasLogos && !hasQuote) {
      // never ship a bare "weeks" with no proof behind it
      proof.hidden = true;
      var pill = document.querySelector('[data-trackb-pill]');
      if (pill) pill.textContent = 'a focused sprint';
    }
  }

  var whySection = document.getElementById('why');
  if (whySection && 'IntersectionObserver' in window) {
    var whyObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          pushEvent({ event: 'section_view', section: 'why_raisable' });
          whyObs.disconnect();
        }
      });
    }, { threshold: 0.25 });
    whyObs.observe(whySection);
  }

  var whyCta = document.querySelector('[data-why-cta]');
  if (whyCta) {
    whyCta.addEventListener('click', function () {
      pushEvent({ event: 'form_open', type: 'who', section: 'why_raisable' });
    });
  }

  /* ---------- Member panel: framed card (photo+name+role, bio+badges below,
     teal border trace + shimmer). Hover on pointer devices; tap-to-toggle
     with tap-outside-to-close on touch. One panel per grid. ---------- */
  (function () {
    var grids = document.querySelectorAll('.team-grid-4, .amb-cards');
    if (!grids.length) return;
    var hasHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    document.documentElement.classList.add('member-panels-on');
    var controllers = [];
    grids.forEach(function (grid) {
      var members = grid.querySelectorAll('[data-member-panel]');
      if (!members.length) return;
      var panel = document.createElement('div');
      panel.className = 'member-panel';
      panel.innerHTML =
        '<svg class="panel-trace" preserveAspectRatio="none" aria-hidden="true">' +
        '<rect class="tr-line" pathLength="100"/><rect class="tr-dot" pathLength="100"/>' +
        '<rect class="tr-shine" pathLength="100"/></svg>' +
        '<div class="panel-head" hidden></div>' +
        '<p class="panel-bio"></p><div class="panel-foot">' +
        '<a class="panel-li" target="_blank" rel="noopener" aria-label="LinkedIn profile" hidden>' +
        '<img src="assets/img/LG_LINKEDIN_ICON.svg" alt="LinkedIn"></a>' +
        '<div class="panel-tags"></div></div>';
      grid.appendChild(panel);
      var pHead = panel.querySelector('.panel-head');
      var pBio = panel.querySelector('.panel-bio');
      var pTags = panel.querySelector('.panel-tags');
      var pLi = panel.querySelector('.panel-li');
      var hideTimer = null;
      var current = null;
      var PAD = 14;

      function showPanel(el) {
        clearTimeout(hideTimer);
        var isMobile = window.matchMedia('(max-width: 560px)').matches;
        if (current && current !== el) current.classList.remove('is-spot');
        current = el;
        if (!isMobile) el.classList.add('is-spot');
        var bio = null;
        el.querySelectorAll('p').forEach(function (p) {
          if (!bio && !p.classList.contains('team-role')) bio = p;
        });
        var bioText = bio ? bio.textContent.replace(/\s+/g, ' ').trim() : '';
        if (!bioText) {
          var role = el.querySelector('.amb-role');
          var loc = el.querySelector('.amb-loc');
          bioText = [role && role.textContent.trim(), loc && loc.textContent.trim()]
            .filter(Boolean).join(' · ');
        }
        pBio.textContent = bioText;
        pBio.hidden = !pBio.textContent;
        var tags = el.querySelector('.team-exp');
        // strip loading=lazy: source badges sit in a display:none block, so lazy
        // clones never fetch; load them eagerly inside the panel
        pTags.innerHTML = tags ? tags.outerHTML.replace(/ loading="lazy"/g, '') : '';
        var li = el.querySelector('.li-link');
        pLi.hidden = !li;
        if (li) pLi.href = li.href;
        var cRect = grid.getBoundingClientRect();
        var r = el.getBoundingClientRect();
        if (isMobile) {
          // phones (2-up): the card is too narrow to wrap, so the panel becomes
          // the full card — photo + name + role cloned in, bio + badges below,
          // all in one frame anchored where the tapped card sits
          var wrap = el.querySelector('.team-photo-wrap');
          var h3 = el.querySelector('h3');
          var role = el.querySelector('.team-role');
          pHead.innerHTML =
            (wrap ? wrap.outerHTML.replace(/ loading="lazy"/g, '') : '') +
            (h3 ? '<h3>' + h3.innerHTML + '</h3>' : '') +
            (role ? '<p class="team-role">' + role.innerHTML + '</p>' : '');
          pHead.hidden = false;
          panel.classList.add('is-mobile');
          panel.style.left = '0px';
          panel.style.width = cRect.width + 'px';
          panel.style.top = (r.top - cRect.top) + 'px';
          panel.style.paddingTop = '';
        } else {
          pHead.hidden = true;
          pHead.innerHTML = '';
          panel.classList.remove('is-mobile');
          panel.style.top = (r.top - cRect.top - PAD) + 'px';
          panel.style.left = (r.left - cRect.left - PAD) + 'px';
          panel.style.width = (r.width + PAD * 2) + 'px';
          panel.style.paddingTop = (r.height + PAD + 8) + 'px';
        }
        var w = panel.offsetWidth, h = panel.offsetHeight;
        var svg = panel.querySelector('.panel-trace');
        svg.setAttribute('viewBox', '0 0 ' + w + ' ' + h);
        panel.querySelectorAll('.panel-trace rect').forEach(function (rc) {
          rc.setAttribute('x', 1); rc.setAttribute('y', 1);
          rc.setAttribute('width', w - 2); rc.setAttribute('height', h - 2);
          rc.setAttribute('rx', 13);
        });
        panel.classList.add('is-on');
        if (isMobile) {
          requestAnimationFrame(function () {
            var pr = panel.getBoundingClientRect();
            if (pr.top < 70 || pr.bottom > window.innerHeight) {
              window.scrollTo({ top: window.scrollY + pr.top - 84, behavior: 'smooth' });
            }
          });
        }
      }
      function hideNow() {
        clearTimeout(hideTimer);
        panel.classList.remove('is-on');
        if (current) { current.classList.remove('is-spot'); current = null; }
      }
      function scheduleHide() {
        clearTimeout(hideTimer);
        hideTimer = setTimeout(hideNow, 150);
      }

      if (hasHover) {
        members.forEach(function (el) {
          el.addEventListener('mouseenter', function () { showPanel(el); });
          el.addEventListener('mouseleave', scheduleHide);
          el.addEventListener('focusin', function () { showPanel(el); });
          el.addEventListener('focusout', scheduleHide);
        });
        panel.addEventListener('mouseenter', function () { clearTimeout(hideTimer); });
        panel.addEventListener('mouseleave', scheduleHide);
      } else {
        members.forEach(function (el) {
          el.setAttribute('tabindex', '0');
          el.addEventListener('click', function () {
            if (current === el) hideNow(); else showPanel(el);
          });
        });
        controllers.push({
          panel: panel,
          holds: function (t) { return panel.contains(t) || (current && current.contains(t)); },
          hide: hideNow
        });
      }
    });
    if (!hasHover && controllers.length) {
      document.addEventListener('click', function (e) {
        controllers.forEach(function (c) {
          if (c.panel.classList.contains('is-on') && !c.holds(e.target)) c.hide();
        });
      });
    }
  })();

  /* ---------- Footer year ---------- */
  var year = document.querySelector('[data-year]');
  if (year) year.textContent = new Date().getFullYear();
})();
