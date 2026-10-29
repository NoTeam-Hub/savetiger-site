// Interactions for the map pages. Everything works without this file (the tables carry the same data);
// this adds selection, filtering, zoom, the year switch and highlighting.
(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var fmt = function (n) { return Number(n).toLocaleString('en-IN'); };
  var root = $('[data-map]');
  if (!root) return;
  var kind = root.getAttribute('data-map');
  var svg = $('svg.map', root);
  var panel = $('#panel');

  function setPanel(fields) {
    if (!panel) return;
    var empty = $('.panel-empty', panel), body = $('.panel-body', panel);
    if (!fields) { empty.hidden = false; body.hidden = true; return; }
    empty.hidden = true; body.hidden = false;
    Object.keys(fields).forEach(function (k) {
      var el = $('[data-f="' + k + '"]', panel);
      if (el) el.textContent = fields[k];
    });
  }
  function activate(el, fn) {
    el.addEventListener('click', fn);
    el.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fn(e); }
    });
  }

  /* ---------- zoom / pan (reserves map) ---------- */
  var zoom = null;
  function initZoom() {
    var vb = svg.getAttribute('viewBox').split(/\s+/).map(Number);
    var base = { x: vb[0], y: vb[1], w: vb[2], h: vb[3] };
    var cur = { x: base.x, y: base.y, w: base.w, h: base.h };
    var apply = function () { svg.setAttribute('viewBox', cur.x + ' ' + cur.y + ' ' + cur.w + ' ' + cur.h); };
    var clamp = function () {
      cur.x = Math.min(Math.max(cur.x, base.x), base.x + base.w - cur.w);
      cur.y = Math.min(Math.max(cur.y, base.y), base.y + base.h - cur.h);
    };
    var to = function (cx, cy, k) {
      k = Math.min(Math.max(k, 1), 6);
      cur.w = base.w / k; cur.h = base.h / k;
      cur.x = cx - cur.w / 2; cur.y = cy - cur.h / 2;
      clamp(); apply();
    };
    var k = function () { return base.w / cur.w; };
    $$('[data-zoom]', root).forEach(function (b) {
      b.addEventListener('click', function () {
        var a = b.getAttribute('data-zoom');
        var cx = cur.x + cur.w / 2, cy = cur.y + cur.h / 2;
        if (a === 'in') to(cx, cy, k() * 1.6);
        else if (a === 'out') to(cx, cy, k() / 1.6);
        else to(base.x + base.w / 2, base.y + base.h / 2, 1);
      });
    });
    // drag to pan
    var drag = null;
    svg.addEventListener('pointerdown', function (e) {
      if (k() <= 1 || e.target.closest('.dot')) return;
      drag = { x: e.clientX, y: e.clientY, cx: cur.x, cy: cur.y };
      svg.setPointerCapture(e.pointerId);
    });
    svg.addEventListener('pointermove', function (e) {
      if (!drag) return;
      var r = svg.getBoundingClientRect();
      cur.x = drag.cx - ((e.clientX - drag.x) / r.width) * cur.w;
      cur.y = drag.cy - ((e.clientY - drag.y) / r.height) * cur.h;
      clamp(); apply();
    });
    var end = function () { drag = null; };
    svg.addEventListener('pointerup', end);
    svg.addEventListener('pointercancel', end);
    zoom = {
      fit: function (pts) {
        if (!pts.length) return to(base.x + base.w / 2, base.y + base.h / 2, 1);
        var x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
        pts.forEach(function (p) { x0 = Math.min(x0, p[0]); y0 = Math.min(y0, p[1]); x1 = Math.max(x1, p[0]); y1 = Math.max(y1, p[1]); });
        var pad = 36;
        var kk = Math.min(base.w / (x1 - x0 + pad * 2), base.h / (y1 - y0 + pad * 2), 4);
        to((x0 + x1) / 2, (y0 + y1) / 2, kk);
      },
      center: function (p) { if (k() > 1) { cur.x = p[0] - cur.w / 2; cur.y = p[1] - cur.h / 2; clamp(); apply(); } }
    };
  }
  function pos(g) {
    var m = /translate\(([-\d.]+)[ ,]([-\d.]+)\)/.exec(g.getAttribute('transform'));
    return [parseFloat(m[1]), parseFloat(m[2])];
  }

  /* ---------- 1. reserves ---------- */
  if (kind === 'reserves') {
    initZoom();
    var dots = $$('.dot', svg), rows = $$('#res-table tbody tr');
    var byId = {};
    dots.forEach(function (d) { byId[d.getAttribute('data-id')] = d; });
    var selected = null;
    var select = function (id, fromRow) {
      selected = id;
      dots.forEach(function (d) { d.classList.toggle('sel', d.getAttribute('data-id') === id); });
      rows.forEach(function (r) { r.classList.toggle('sel', r.getAttribute('data-id') === id); });
      var row = $('#res-table tr[data-id="' + id + '"]');
      var c = row.children;
      setPanel({ name: c[0].textContent, state: c[1].textContent, notified: c[2].textContent, area: c[3].textContent, ls: c[4].textContent });
      zoom.center(pos(byId[id]));
      if (fromRow) svg.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    };
    dots.forEach(function (d) { activate(d, function () { select(d.getAttribute('data-id')); }); });
    rows.forEach(function (r) { r.addEventListener('click', function () { select(r.getAttribute('data-id'), true); }); });

    var sel = $('#state-filter'), shown = $('#shown');
    sel.addEventListener('change', function () {
      var s = sel.value, vis = [];
      dots.forEach(function (d) {
        var ok = !s || d.getAttribute('data-s') === s;
        d.classList.toggle('dim', !ok);
        d.setAttribute('tabindex', ok ? '0' : '-1');
        if (ok) vis.push(pos(d));
      });
      var n = 0;
      rows.forEach(function (r) {
        var ok = !s || r.getAttribute('data-s') === s;
        r.classList.toggle('hide', !ok);
        if (ok) n++;
      });
      shown.textContent = 'Showing ' + n + ' of ' + rows.length;
      zoom.fit(s ? vis : []);
      if (selected && s && byId[selected].classList.contains('dim')) { selected = null; $$('.sel', root).forEach(function (e) { e.classList.remove('sel'); }); setPanel(null); }
    });
  }

  /* ---------- 2. population by state ---------- */
  if (kind === 'states') {
    var years = JSON.parse(root.getAttribute('data-years'));
    var idx = years.length - 1;
    var BIN = function (v) { return v === null ? 'bn' : v === 0 ? 'b0' : v < 20 ? 'b1' : v < 100 ? 'b2' : v < 300 ? 'b3' : v < 600 ? 'b4' : 'b5'; };
    var states = $$('.st[data-v]', svg);
    var val = function (el, i) { var p = el.getAttribute('data-v').split(',')[i]; return p === '' ? null : parseInt(p, 10); };
    var focusEl = null, lockEl = null;
    var show = function (el) {
      if (!el) { setPanel(null); return; }
      var v = val(el, idx), p = idx > 0 ? val(el, idx - 1) : null, ch = '';
      if (idx === 0) ch = 'First census year in this series.';
      else if (v === null) ch = 'No figure was reported for ' + years[idx] + '.';
      else if (p === null) ch = 'No figure was reported for ' + years[idx - 1] + ', so there is nothing to compare with.';
      else ch = (v >= p ? '+' : '−') + fmt(Math.abs(v - p)) + ' since ' + years[idx - 1] + '.';
      setPanel({ year: 'Estimate, ' + years[idx], name: el.getAttribute('data-n'), value: v === null ? 'No figure' : fmt(v), change: ch });
    };
    var paint = function () {
      states.forEach(function (el) {
        var v = val(el, idx);
        el.setAttribute('class', 'st ' + BIN(v) + (el === lockEl ? ' sel' : ''));
        el.setAttribute('aria-label', el.getAttribute('data-n') + ', ' + years[idx] + ': ' + (v === null ? 'no figure reported' : fmt(v) + ' tigers'));
        var t = $('title', el); if (t) t.textContent = el.getAttribute('data-n') + ': ' + (v === null ? 'no figure reported' : fmt(v));
      });
      $$('#years button').forEach(function (b, i) { b.classList.toggle('on', i === idx); b.setAttribute('aria-checked', i === idx); b.tabIndex = i === idx ? 0 : -1; });
      $$('#state-table tr').forEach(function (r) {
        $$('th,td', r).forEach(function (c, i) { c.classList.toggle('cur', i === idx + 1); });
      });
      show(lockEl || focusEl);
    };
    states.forEach(function (el) {
      el.addEventListener('mouseenter', function () { focusEl = el; if (!lockEl) show(el); });
      el.addEventListener('mouseleave', function () { focusEl = null; show(lockEl); });
      el.addEventListener('focus', function () { focusEl = el; if (!lockEl) show(el); });
      activate(el, function () {
        lockEl = lockEl === el ? null : el;
        $$('#state-table tbody tr').forEach(function (r) { r.classList.toggle('sel', !!lockEl && r.getAttribute('data-s') === el.getAttribute('data-s')); });
        paint();
      });
    });
    $$('#years button').forEach(function (b, i) {
      b.addEventListener('click', function () { idx = i; paint(); });
      b.addEventListener('keydown', function (e) {
        var d = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
        if (!d) return;
        e.preventDefault();
        idx = (idx + d + years.length) % years.length; paint();
        $$('#years button')[idx].focus();
      });
    });
    paint();
  }

  /* ---------- 3. landscapes ---------- */
  if (kind === 'landscapes') {
    var cards = $$('.ls-card'), btns = $$('.ls-btn');
    var pinned = null;
    var apply = function (k) {
      svg.setAttribute('class', 'map map-landscapes' + (k ? ' focus f-' + k : ''));
      cards.forEach(function (c) { c.classList.toggle('on', c.getAttribute('data-ls') === k); });
    };
    var refresh = function () {
      btns.forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-ls') === pinned ? 'true' : 'false'); });
      apply(pinned);
    };
    var toggle = function (k) { pinned = pinned === k ? null : k; refresh(); };
    btns.forEach(function (b) { b.addEventListener('click', function () { toggle(b.getAttribute('data-ls')); }); });
    cards.forEach(function (c) {
      var k = c.getAttribute('data-ls');
      c.addEventListener('mouseenter', function () { apply(k); });
      c.addEventListener('mouseleave', function () { apply(pinned); });
      c.addEventListener('focus', function () { apply(k); });
      c.addEventListener('blur', function () { apply(pinned); });
      activate(c, function () { toggle(k); });
    });
  }
})();
