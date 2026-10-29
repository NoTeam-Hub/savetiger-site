/* SAVE THE TIGERS — no dependencies. Works with JS off (all key content is in the HTML). */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Always point sticker and share links at the canonical address (savethetiger.site), even on previews. */
  var canonEl = document.querySelector('link[rel="canonical"]');
  var CANON = (canonEl && canonEl.href) || (location.origin + location.pathname);

  /* ---------- Official census data (All India Tiger Estimation) ---------- */
  var CENSUS = [
    { year: 2006, tigers: 1411 },
    { year: 2010, tigers: 1706 },
    { year: 2014, tigers: 2226 },
    { year: 2018, tigers: 2967 },
    { year: 2022, tigers: 3682 }
  ];
  var LATEST = CENSUS[CENSUS.length - 1].tigers;

  function fmt(n) { return Number(n).toLocaleString('en-IN'); }

  /* ---------- Footer year ---------- */
  var yr = document.getElementById('year');
  if (yr) yr.textContent = new Date().getFullYear();
  document.querySelectorAll('.year-copy').forEach(function (el) { el.textContent = new Date().getFullYear(); });

  /* ---------- Share buttons (links are built from this page's real address) ---------- */
  var shareBtns = document.querySelectorAll('[data-share]');
  if (shareBtns.length) {
    var pageUrl = CANON;
    var shareText = 'SAVE THE TIGERS: India has ' + fmt(LATEST) + ' wild tigers (2022 estimate). See the facts and how you can help.';
    var shareFull = pageUrl ? shareText + ' ' + pageUrl : shareText;
    var enc = encodeURIComponent;
    var shareLinks = {
      whatsapp: 'https://wa.me/?text=' + enc(shareFull),
      x: 'https://x.com/intent/post?text=' + enc(shareText) + (pageUrl ? '&url=' + enc(pageUrl) : ''),
      email: 'mailto:?subject=' + enc('SAVE THE TIGERS: tiger conservation in India') + '&body=' + enc(shareFull)
    };
    var shareStatus = document.getElementById('share-status');
    var shareTimer;
    function say(msg) {
      if (!shareStatus) return;
      shareStatus.textContent = msg;
      clearTimeout(shareTimer);
      shareTimer = setTimeout(function () { shareStatus.textContent = ''; }, 6000);
    }
    function copyToClipboard(text, done) {
      function fallback() {
        var ta = document.createElement('textarea');
        ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
        document.body.appendChild(ta); ta.select();
        var ok = false;
        try { ok = document.execCommand('copy'); } catch (e) {}
        document.body.removeChild(ta);
        done(ok);
      }
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text).then(function () { done(true); }, fallback);
      } else { fallback(); }
    }
    shareBtns.forEach(function (btn) {
      var kind = btn.getAttribute('data-share');
      if (shareLinks[kind]) btn.setAttribute('href', shareLinks[kind]);
      if (kind === 'instagram') {
        // Instagram has no web "share this link" address. On phones and tablets, open the device's own share menu
        // (Instagram and other apps appear there). Everywhere else, copy the link and open Instagram.
        var igUrl = btn.getAttribute('href');
        var copyAndOpen = function (openIt) {
          copyToClipboard(pageUrl || shareText, function (ok) {
            say(ok ? 'Link copied. Paste it into your Instagram story, bio or message.' : 'Opening Instagram. Copy this page\'s address from your browser to share it.');
          });
          if (openIt) window.open(igUrl, '_blank', 'noopener');
        };
        btn.addEventListener('click', function (e) {
          var touch = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
          if (touch && navigator.share) {
            e.preventDefault();
            navigator.share({ title: 'SAVE THE TIGERS', text: shareText, url: pageUrl })
              .then(function () { say('Thanks for sharing!'); })
              .catch(function (err) {
                if (err && err.name === 'AbortError') return;   // the visitor closed the share menu
                copyAndOpen(true);
              });
          } else {
            copyAndOpen(false);                                  // the link itself opens Instagram in a new tab
          }
        });
      }
    });
  }

  /* ---------- Open a legal section when its footer link / #hash is used ---------- */
  function openLegalFromHash() {
    var id = location.hash.slice(1);
    if (!id) return;
    var el = document.getElementById(id);
    if (el && el.tagName === 'DETAILS' && el.classList.contains('legal-item')) {
      el.open = true;
      if (el.scrollIntoView) el.scrollIntoView({ block: 'center', behavior: reduceMotion ? 'auto' : 'smooth' });
    }
  }
  window.addEventListener('hashchange', openLegalFromHash);
  openLegalFromHash();

  /* ---------- Mobile nav ---------- */
  var toggle = document.querySelector('.nav-toggle');
  var links = document.getElementById('nav-links');
  if (toggle && links) {
    toggle.addEventListener('click', function () {
      var open = links.classList.toggle('open');
      toggle.setAttribute('aria-expanded', String(open));
    });
    links.addEventListener('click', function (e) {
      if (e.target.tagName === 'A') {
        links.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
      }
    });
  }

  /* ---------- Highlight the menu paw for the section being read ---------- */
  if ('IntersectionObserver' in window && links) {
    var menuLinks = Array.prototype.slice.call(links.querySelectorAll('a[href^="#"]'));
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        menuLinks.forEach(function (a) {
          var on = a.getAttribute('href') === '#' + en.target.id;
          a.classList.toggle('active', on);
          if (on) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current');
        });
      });
    }, { rootMargin: '-40% 0px -55% 0px' });
    menuLinks.forEach(function (a) {
      var sec = document.querySelector(a.getAttribute('href'));
      if (sec) spy.observe(sec);
    });
  }

  /* ---------- Count-up numbers (start from the real value in HTML; animate once on view) ---------- */
  function countUp(el) {
    var target = parseInt(el.getAttribute('data-count'), 10);
    if (!target) return;
    var dur = 1400, start = null;
    function step(ts) {
      if (start === null) start = ts;
      var p = Math.min((ts - start) / dur, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = fmt(Math.round(target * eased));
      if (p < 1) requestAnimationFrame(step); else el.textContent = fmt(target);
    }
    requestAnimationFrame(step);
  }
  var counters = document.querySelectorAll('[data-count]');
  if (!reduceMotion && 'IntersectionObserver' in window) {
    var cio = new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { countUp(en.target); obs.unobserve(en.target); }
      });
    }, { threshold: 0.4 });
    counters.forEach(function (el) { cio.observe(el); });
  }

  /* ---------- Line chart (inline SVG, built from CENSUS) ---------- */
  var chartEl = document.getElementById('chart');
  if (chartEl) {
    var W = 640, H = 300, L = 54, R = 28, T = 30, B = 44;
    var yMax = 4000;
    var iw = W - L - R, ih = H - T - B;
    function x(i) { return L + (iw * i) / (CENSUS.length - 1); }
    function y(v) { return T + ih - (ih * v) / yMax; }

    var svg = '<svg viewBox="0 0 ' + W + ' ' + H + '" aria-hidden="true" focusable="false">' +
      '<defs>' +
      '<linearGradient id="chartLine" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#E8590C"/><stop offset="1" stop-color="#FF9A1F"/></linearGradient>' +
      '<linearGradient id="chartArea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FF9A1F" stop-opacity=".28"/><stop offset="1" stop-color="#FF9A1F" stop-opacity="0"/></linearGradient>' +
      '</defs>';

    for (var g = 0; g <= 4; g++) {
      var gv = g * 1000, gy = y(gv);
      svg += '<line class="grid" x1="' + L + '" x2="' + (W - R) + '" y1="' + gy + '" y2="' + gy + '"/>' +
             '<text class="axis" x="' + (L - 10) + '" y="' + (gy + 4) + '" text-anchor="end">' + fmt(gv) + '</text>';
    }

    var pts = CENSUS.map(function (d, i) { return x(i).toFixed(1) + ',' + y(d.tigers).toFixed(1); });
    svg += '<polygon class="area" points="' + L + ',' + y(0) + ' ' + pts.join(' ') + ' ' + (W - R) + ',' + y(0) + '"/>';
    svg += '<polyline class="line" pathLength="1" points="' + pts.join(' ') + '"/>';

    CENSUS.forEach(function (d, i) {
      svg += '<circle class="pt" cx="' + x(i).toFixed(1) + '" cy="' + y(d.tigers).toFixed(1) + '" r="6"/>' +
             '<text class="val" x="' + x(i).toFixed(1) + '" y="' + (y(d.tigers) - 14).toFixed(1) + '">' + fmt(d.tigers) + '</text>' +
             '<text class="axis" x="' + x(i).toFixed(1) + '" y="' + (H - 16) + '" text-anchor="middle">' + d.year + '</text>';
    });
    svg += '</svg>';
    chartEl.innerHTML = svg;

    if (!reduceMotion && 'IntersectionObserver' in window) {
      chartEl.classList.add('anim');
      var chio = new IntersectionObserver(function (entries, obs) {
        entries.forEach(function (en) {
          if (en.isIntersecting) { chartEl.classList.add('in'); obs.disconnect(); }
        });
      }, { threshold: 0.35 });
      chio.observe(chartEl);
    }
  }

  /* ---------- Embeddable stickers ---------- */
  var stickersEl = document.getElementById('stickers');
  if (stickersEl) {
    var SITE = CANON;
    var FONT = "system-ui,-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
    var THEMES = {
      dark:  { bg: '#0B130E', fg: '#EAF2EC', muted: '#9db3a4', accent: '#FF9A1F', border: '#1F3A2A', onAccent: '#1a0d02' },
      light: { bg: '#FFF8EE', fg: '#1F2A22', muted: '#6b5a46', accent: '#D9560B', border: '#F0D9BC', onAccent: '#FFF8EE' }
    };
    var currentTheme = 'dark';
    var COUNT = fmt(LATEST);

    function paw(size, color, stripe) {
      return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 64 64" aria-hidden="true" style="display:block;flex:none">' +
        '<g fill="' + color + '">' +
        '<ellipse cx="13" cy="27" rx="5.2" ry="7.2" transform="rotate(-24 13 27)"/>' +
        '<ellipse cx="25" cy="16" rx="5.4" ry="7.8" transform="rotate(-9 25 16)"/>' +
        '<ellipse cx="39" cy="16" rx="5.4" ry="7.8" transform="rotate(9 39 16)"/>' +
        '<ellipse cx="51" cy="27" rx="5.2" ry="7.2" transform="rotate(24 51 27)"/>' +
        '<path d="M32 29 C41 29 49 37 49 46 C49 53 43.5 56.5 38 54.5 C34.5 53.3 29.5 53.3 26 54.5 C20.5 56.5 15 53 15 46 C15 37 23 29 32 29 Z"/>' +
        '</g>' +
        '<path d="M17 41 Q24 43 28 50 M47 41 Q40 43 36 50" stroke="' + stripe + '" stroke-width="2.6" fill="none" stroke-linecap="round"/>' +
        '</svg>';
    }
    function open(style, inner, label) {
      return '<a href="' + SITE + '" target="_blank" rel="noopener" aria-label="' + label + '" style="' + style + 'text-decoration:none;font-family:' + FONT + ';">' + inner + '</a>';
    }

    var STICKERS = [
      { name: 'Protector pill', size: 'Fits nav bars & footers', build: function (t) {
        return open('display:inline-flex;align-items:center;gap:8px;padding:8px 14px 8px 10px;border-radius:999px;background:' + t.bg + ';border:1px solid ' + t.border + ';color:' + t.fg + ';font-size:12px;font-weight:700;letter-spacing:.08em;line-height:1;',
          paw(18, t.accent, t.bg) + '<span>I PROTECT TIGERS</span>', 'I protect tigers — Save the Tigers');
      } },
      { name: 'Census stamp', size: '120 × 120 px', build: function (t) {
        return open('display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;width:120px;height:120px;box-sizing:border-box;border-radius:50%;background:' + t.bg + ';border:2px solid ' + t.accent + ';color:' + t.fg + ';text-align:center;line-height:1.1;',
          paw(26, t.accent, t.bg) + '<span style="font-size:8px;font-weight:800;letter-spacing:.14em;">SAVE THE TIGERS</span><span style="font-size:20px;font-weight:900;color:' + t.accent + ';">' + COUNT + '</span><span style="font-size:7px;letter-spacing:.1em;color:' + t.muted + ';">WILD TIGERS · 2022</span>',
          COUNT + ' wild tigers in India — Save the Tigers');
      } },
      { name: 'Stripe banner', size: '240 × 64 px', build: function (t) {
        return open('display:flex;align-items:center;gap:12px;width:240px;height:64px;box-sizing:border-box;padding:0 14px;border-radius:10px;background:' + t.bg + ';border:1px solid ' + t.border + ';color:' + t.fg + ';',
          '<span style="flex:none;width:8px;height:38px;border-radius:4px;background:repeating-linear-gradient(180deg,' + t.accent + ' 0 6px,' + t.bg + ' 6px 10px);"></span>' +
          '<span style="display:flex;flex-direction:column;gap:3px;line-height:1.1;"><span style="font-size:14px;font-weight:900;letter-spacing:.06em;">STRIPES MATTER</span><span style="font-size:11px;color:' + t.muted + ';">Support wild tigers</span></span>',
          'Stripes matter — support wild tigers');
      } },
      { name: 'Population counter', size: '200 × 96 px', build: function (t) {
        return open('display:flex;flex-direction:column;justify-content:center;gap:2px;width:200px;height:96px;box-sizing:border-box;padding:0 16px;border-radius:12px;background:' + t.bg + ';border:1px solid ' + t.border + ';color:' + t.fg + ';line-height:1.1;',
          '<span style="font-size:9px;letter-spacing:.16em;color:' + t.muted + ';font-weight:700;">WILD TIGERS · INDIA</span><span style="font-size:32px;font-weight:900;color:' + t.accent + ';">' + COUNT + '</span><span style="font-size:9px;letter-spacing:.14em;font-weight:800;">SAVE THE TIGERS →</span>',
          COUNT + ' wild tigers in India — Save the Tigers');
      } },
      { name: 'Minimal ally', size: 'For any website', build: function (t) {
        return open('display:inline-flex;align-items:center;gap:10px;padding:9px 14px 9px 11px;border-radius:8px;background:' + t.bg + ';border:1px solid ' + t.border + ';color:' + t.fg + ';line-height:1.2;',
          paw(20, t.accent, t.bg) + '<span style="display:flex;flex-direction:column;"><span style="font-size:11px;font-weight:800;letter-spacing:.1em;">PROUD TIGER ALLY</span><span style="font-size:10px;color:' + t.muted + ';">' + COUNT + ' wild tigers in India (2022)</span></span>',
          'Proud tiger ally — Save the Tigers');
      } },
      { name: 'Roar square', size: '110 × 110 px', build: function (t) {
        return open('display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;width:110px;height:110px;box-sizing:border-box;border-radius:16px;background:' + t.accent + ';color:' + t.onAccent + ';text-align:center;line-height:1;',
          paw(26, t.onAccent, t.accent) + '<span style="font-size:22px;font-weight:900;letter-spacing:.06em;">ROAR</span><span style="font-size:11px;font-weight:800;letter-spacing:.1em;">FOR ' + COUNT + '</span>',
          'Roar for ' + COUNT + ' tigers — Save the Tigers');
      } },
      { name: 'Paw badge', size: '100 × 100 px', build: function (t) {
        return open('display:flex;flex-direction:column;align-items:center;justify-content:center;gap:5px;width:100px;height:100px;box-sizing:border-box;border-radius:50%;background:' + t.accent + ';color:' + t.onAccent + ';border:3px solid ' + t.bg + ';box-shadow:0 0 0 2px ' + t.accent + ';line-height:1;',
          paw(40, t.onAccent, t.accent) + '<span style="font-size:10px;font-weight:900;letter-spacing:.14em;">TEAM TIGER</span>',
          'Team Tiger — Save the Tigers');
      } },
      { name: 'Slim ribbon', size: '250 × 36 px', build: function (t) {
        return open('display:inline-flex;align-items:center;gap:8px;width:250px;height:36px;box-sizing:border-box;padding:0 12px;border-radius:6px;background:' + t.bg + ';border:1px solid ' + t.border + ';color:' + t.fg + ';font-size:11px;font-weight:800;letter-spacing:.1em;white-space:nowrap;overflow:hidden;',
          paw(16, t.accent, t.bg) + '<span>SAVE THE TIGERS</span><span style="margin-left:auto;color:' + t.accent + ';">' + COUNT + '</span>',
          'Save the Tigers — ' + COUNT + ' wild tigers in India');
      } },
      { name: 'Pledge card', size: '220 × 120 px', build: function (t) {
        return open('display:flex;flex-direction:column;justify-content:center;gap:6px;width:220px;height:120px;box-sizing:border-box;padding:0 16px;border-radius:12px;background:' + t.bg + ';border:1px solid ' + t.border + ';border-left:6px solid ' + t.accent + ';color:' + t.fg + ';line-height:1.2;',
          '<span style="font-size:10px;letter-spacing:.2em;font-weight:800;color:' + t.accent + ';">MY TIGER PLEDGE</span><span style="font-size:15px;font-weight:800;">Respect wildlife.<br>Report poaching.</span><span style="font-size:10px;color:' + t.muted + ';letter-spacing:.08em;">SAVE THE TIGERS &rarr;</span>',
          'My tiger pledge — Save the Tigers');
      } }
    ];

    function copyText(text, done) {
      function fallback() {
        var ta = document.createElement('textarea');
        ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
        document.body.appendChild(ta); ta.select();
        var ok = false;
        try { ok = document.execCommand('copy'); } catch (e) {}
        document.body.removeChild(ta);
        done(ok);
      }
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text).then(function () { done(true); }, fallback);
      } else { fallback(); }
    }

    function render() {
      var t = THEMES[currentTheme];
      stickersEl.innerHTML = '';
      STICKERS.forEach(function (s) {
        var html = s.build(t);
        var card = document.createElement('div');
        card.className = 'sticker-card';
        card.innerHTML =
          '<div class="sticker-preview' + (currentTheme === 'light' ? ' light-bg' : '') + '">' + html + '</div>' +
          '<div class="sticker-meta"><h4>' + s.name + '</h4><span>' + s.size + '</span></div>';
        var btn = document.createElement('button');
        btn.type = 'button'; btn.className = 'copy-btn'; btn.textContent = 'Copy embed code';
        btn.addEventListener('click', function () {
          copyText(html, function (ok) {
            var status = document.getElementById('copy-status');
            btn.textContent = ok ? 'Copied!' : 'Press Ctrl+C to copy';
            btn.classList.toggle('done', ok);
            if (status) status.textContent = ok ? s.name + ' embed code copied' : 'Copy failed';
            setTimeout(function () { btn.textContent = 'Copy embed code'; btn.classList.remove('done'); }, 1800);
          });
        });
        card.appendChild(btn);
        stickersEl.appendChild(card);
      });
      fit();
    }

    // Only the first row of stickers is visible until "Show more" is pressed.
    var moreBtn = document.getElementById('stickers-toggle');
    var expanded = false;
    function fit() {
      var cards = stickersEl.children;
      var cols = getComputedStyle(stickersEl).gridTemplateColumns.split(' ').length || 1;
      for (var i = 0; i < cards.length; i++) cards[i].hidden = !expanded && i >= cols;
      if (moreBtn) {
        moreBtn.hidden = cards.length <= cols;
        moreBtn.textContent = expanded ? 'Show fewer stickers' : 'Show ' + (cards.length - cols) + ' more stickers';
        moreBtn.setAttribute('aria-expanded', expanded ? 'true' : 'false');
      }
    }
    if (moreBtn) moreBtn.addEventListener('click', function () { expanded = !expanded; fit(); });
    window.addEventListener('resize', fit);

    document.querySelectorAll('.theme-switch button').forEach(function (b) {
      b.addEventListener('click', function () {
        currentTheme = b.getAttribute('data-theme');
        document.querySelectorAll('.theme-switch button').forEach(function (o) {
          var on = o === b;
          o.classList.toggle('on', on);
          o.setAttribute('aria-checked', String(on));
        });
        render();
      });
    });
    render();
  }

  /* ---------- Tiny, privacy-friendly view counter (GoatCounter; only active when a site code is set in site.config.json) ---------- */
  var vc = document.getElementById('visit-counter');
  if (vc && vc.getAttribute('data-gc') && window.fetch) {
    var loadCount = function () {
      fetch('https://' + vc.getAttribute('data-gc') + '.goatcounter.com/counter//.json')
        .then(function (r) { return r.ok ? r.json() : Promise.reject(); })
        .then(function (d) {
          if (d && d.count && parseInt(String(d.count).replace(/\D/g, ''), 10) > 0) {
            document.getElementById('visit-count').textContent = d.count;
            vc.hidden = false;
          }
        })
        .catch(function () { /* stay hidden if the counter is unavailable */ });
    };
    if ('requestIdleCallback' in window) requestIdleCallback(loadCount); else setTimeout(loadCount, 1500);
  }

  /* ---------- Support block: QR fallback + thank-you dialog ---------- */
  var qr = document.getElementById('upi-qr');
  if (qr) {
    qr.addEventListener('error', function () {
      qr.hidden = true;
      var msg = document.querySelector('.qr-missing');
      if (msg) msg.hidden = false;
    });
  }
  var tipBtn = document.getElementById('tip-sent');
  var thanks = document.getElementById('thanks');
  var thanksClose = document.getElementById('thanks-close');
  if (tipBtn && thanks) {
    tipBtn.addEventListener('click', function () {
      if (typeof thanks.showModal === 'function') thanks.showModal();
      else thanks.setAttribute('open', '');
    });
    function closeThanks() {
      if (typeof thanks.close === 'function') thanks.close();
      else thanks.removeAttribute('open');
    }
    if (thanksClose) thanksClose.addEventListener('click', closeThanks);
    thanks.addEventListener('click', function (e) { if (e.target === thanks) closeThanks(); });
  }
})();
