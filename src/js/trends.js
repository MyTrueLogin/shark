// Single Location: trend chips (cards with [data-trend] and leaderboard rows), the collapsible
// «Trends» block (#trends-block) and the Trends modal with competitor comparison.
// Public API: window.SharkTrends.open(metric, competitor?)
//
// NOTE: history series are generated from the current values in the leaderboard (demo data).
// With a real backend replace `companies[].s` with the daily series from the API (91 points, oldest → today).
import { loadChart } from './chart.js'

var N = 91, TODAY = new Date(2026, 9, 10);
var C = { navy: '#072C4A', blue: '#005E9D', line: '#BDC6CE', soft: '#F0F8FF', bg: '#FAFAFA', muted: '#506A7F' };
var GOOD = { bg: '#BDF0DC', fg: '#074B34', ring: 'rgba(6,118,71,0.35)' };
var BAD = { bg: '#FFDCD6', fg: '#A2281B', ring: 'rgba(162,40,27,0.35)' };
var FLAT = { bg: '#EEF1F4', fg: '#506A7F', ring: 'rgba(80,106,127,0.35)' };
var LINE_COLORS = ['#005E9D', '#3FA0E0', '#8FB8D6', '#C08A2E', '#7A8FA0'];
var FJK = "font-family:'Plus Jakarta Sans',sans-serif;", RUB = 'font-family:Rubik,sans-serif;';

function pts(d) { return String(Math.abs(Math.round(d))); }
var METRICS = {
  performance: { label: 'Performance', unit: '%', fmt: function (v) { return Math.round(v) + '%'; }, dfmt: pts, up: true },
  reputation: { label: 'Reputation', unit: '%', fmt: function (v) { return Math.round(v) + '%'; }, dfmt: pts, up: true },
  rank: { label: 'Market position', fmt: function (v) { return '#' + Math.round(v); }, dfmt: function (d) { return String(Math.abs(Math.round(d))); }, up: false },
  rating: { label: 'Rating', fmt: function (v) { return v.toFixed(1); }, dfmt: function (d) { return Math.abs(d).toFixed(1); }, up: true },
  reviews: { label: 'Reviews', fmt: function (v) { return String(Math.round(v)); }, dfmt: function (d) { return String(Math.abs(Math.round(d))); }, up: true }
};
var ORDER = ['performance', 'reputation', 'rank', 'rating', 'reviews'];
var PERIODS = { '3m': { label: '3 months', from: 0, step: 7 }, '4w': { label: '4 weeks', from: 63, step: 1 }, '7d': { label: '7 days', from: 84, step: 1 } };

function rng(seed) { var h = 2166136261; for (var i = 0; i < seed.length; i++) { h ^= seed.charCodeAt(i); h = Math.imul(h, 16777619); } return function () { h += 0x6D2B79F5; var t = h; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
function bridge(r, anchors, noise, lo, hi, round) {
  var out = [];
  for (var i = 0; i < N; i++) {
    var a = anchors[0], b = anchors[anchors.length - 1];
    for (var k = 0; k < anchors.length - 1; k++) if (i >= anchors[k][0] && i <= anchors[k + 1][0]) { a = anchors[k]; b = anchors[k + 1]; break; }
    var t = (i - a[0]) / Math.max(1, b[0] - a[0]);
    var v = a[1] + (b[1] - a[1]) * t + (r() - 0.5) * 2 * noise * Math.sin(Math.PI * t);
    out.push(clamp(round(v), lo, hi));
  }
  return out;
}
function cumulative(r, end, g90, g30) {
  var days = new Array(N).fill(0), i;
  for (i = 0; i < g30; i++) days[61 + Math.floor(r() * 30)]++;
  for (i = 0; i < g90 - g30; i++) days[1 + Math.floor(r() * 60)]++;
  var out = new Array(N); out[N - 1] = end;
  for (i = N - 1; i > 0; i--) out[i - 1] = out[i] - days[i];
  return out;
}
var int = Math.round, one = function (v) { return Math.round(v * 10) / 10; };

var rows = [].slice.call(document.querySelectorAll('table tbody tr[role="link"]'));
var companies = rows.map(function (tr) {
  var td = tr.children;
  var num = function (el) { return parseFloat((el && el.textContent || '0').replace(/[^0-9.]/g, '')) || 0; };
  return {
    tr: tr, td: td,
    name: (td[1].querySelector('a') || td[1]).textContent.trim(),
    rank: num(td[0].querySelector('span')),
    perf: num(td[2].querySelector('span')),
    rating: num([].slice.call(td[4].querySelectorAll('span.frub')).pop()),
    reviews: num(td[5].querySelector('span'))
  };
});
var you = companies.filter(function (c) { return c.rank === 11; })[0] || companies[0];
if (you) { you.isYou = true; you.label = 'Your business'; }

companies.forEach(function (c) {
  var r = rng(c.name);
  if (c.isYou) {
    c.s = {
      performance: bridge(r, [[0, 63], [60, 64], [90, c.perf]], 3, 0, 100, int),
      reputation: bridge(r, [[0, 61], [60, 62], [90, 60]], 2, 0, 100, int),
      rank: bridge(r, [[0, 14], [60, 13], [90, c.rank]], 1, 1, 21, int),
      rating: bridge(r, [[0, 5], [90, c.rating]], 0, 1, 5, one),
      reviews: cumulative(r, c.reviews, 4, 3)
    };
  } else {
    var rep = clamp(int(c.rating * 10 + Math.log(c.reviews + 1) * 6), 5, 98);
    var g90 = int(c.reviews * (0.03 + r() * 0.16)) + Math.floor(r() * 3);
    c.s = {
      performance: bridge(r, [[0, clamp(c.perf + int((r() - 0.5) * 16), 0, 100)], [90, c.perf]], 4, 0, 100, int),
      reputation: bridge(r, [[0, clamp(rep + int((r() - 0.5) * 8), 0, 100)], [90, rep]], 2, 0, 100, int),
      rank: bridge(r, [[0, clamp(c.rank + int((r() - 0.5) * 6), 1, 21)], [90, c.rank]], 1.2, 1, 21, int),
      rating: bridge(r, [[0, clamp(one(c.rating + (r() - 0.5) * 0.4), 1, 5)], [90, c.rating]], 0.08, 1, 5, one),
      reviews: cumulative(r, c.reviews, g90, Math.min(g90, int(g90 * (0.25 + r() * 0.3))))
    };
  }
});
var others = companies.filter(function (c) { return !c.isYou; });
var market = { name: 'Market average', isAvg: true, s: {} };
ORDER.forEach(function (m) {
  market.s[m] = [];
  for (var i = 0; i < N; i++) market.s[m].push(others.reduce(function (a, c) { return a + c.s[m][i]; }, 0) / Math.max(1, others.length));
});

function idx(p) { var P = PERIODS[p], out = []; for (var i = N - 1; i >= P.from; i -= P.step) out.unshift(i); return out; }
function delta(c, m, p) { var ix = idx(p), s = c.s[m]; return s[ix[ix.length - 1]] - s[ix[0]]; }
function tone(d, m) { var g = METRICS[m].up ? d : -d; return Math.abs(d) < 0.05 ? FLAT : g > 0 ? GOOD : BAD; }
function dateOf(i) { var d = new Date(TODAY); d.setDate(d.getDate() - (N - 1 - i)); return d; }
function fmtDate(i) { return dateOf(i).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); }
var ARROW_UP = '<svg width="9" height="9" viewBox="0 0 10 10" aria-hidden="true"><path d="M5 1.5 9 7.5H1z" fill="currentColor"/></svg>';
var ARROW_DN = '<svg width="9" height="9" viewBox="0 0 10 10" aria-hidden="true"><path d="M5 8.5 1 2.5h8z" fill="currentColor"/></svg>';

function chip(c, m, p, size) {
  var d = delta(c, m, p), t = tone(d, m), flat = t === FLAT, b = document.createElement('button');
  var sm = size === 'sm';
  b.type = 'button';
  b.setAttribute('aria-label', METRICS[m].label + ' change over ' + PERIODS[p].label + ', open trend');
  b.title = 'vs ' + PERIODS[p].label + ' ago · open trend';
  // no change — no indicator (hidden, so callers can still place it)
  b.style.cssText = (flat ? 'display:none;' : 'display:inline-flex;') + 'align-items:center;gap:3px;flex-shrink:0;border:0;cursor:pointer;border-radius:999px;' + RUB + 'font-weight:500;line-height:1;white-space:nowrap;transition:box-shadow .15s;background:' + t.bg + ';color:' + t.fg + ';' + (sm ? 'height:20px;padding:0 6px;font-size:11px;' : 'height:24px;padding:0 8px;font-size:13px;');
  var up = m === 'rank' ? d < 0 : d > 0;
  b.innerHTML = (up ? ARROW_UP : ARROW_DN) + '<span>' + METRICS[m].dfmt(d) + '</span>';
  b.onmouseenter = function () { b.style.boxShadow = 'inset 0 0 0 1.2px ' + t.ring; };
  b.onmouseleave = function () { b.style.boxShadow = 'none'; };
  b.onclick = function (e) { e.preventDefault(); e.stopPropagation(); open(m, c.isYou ? null : c); };
  return b;
}

// ---------- card + table indicators ----------
document.querySelectorAll('[data-trend]').forEach(function (el) {
  var m = el.dataset.trend, ch = chip(you, m, '4w');
  if (m === 'rank') { if (el.hasAttribute('data-inline')) { ch.style.height = '24px'; el.appendChild(ch); } else { ch.style.cssText += ';position:absolute;right:16px;top:184px;height:24px'; el.parentElement.appendChild(ch); } }
  else { el.style.display = 'flex'; el.style.alignItems = 'flex-end'; el.style.gap = '8px'; ch.style.marginBottom = '10px'; el.appendChild(ch); }
});
companies.forEach(function (c) {
  var rk = c.td[0].querySelector('div'); if (rk) rk.appendChild(chip(c, 'rank', '4w', 'sm'));
  var rv = c.td[5].querySelector('div'); if (rv) rv.appendChild(chip(c, 'reviews', '4w', 'sm'));
});

// ---------- collapsible block ----------
var slot = document.getElementById('trends-block');
if (slot) {
  var head = slot.querySelector('[data-toggle]'), body = slot.querySelector('[data-body]'), chev = slot.querySelector('[data-chev]');
  head.addEventListener('click', function () {
    var openNow = body.style.display !== 'none';
    body.style.display = openNow ? 'none' : 'grid';
    chev.style.transform = openNow ? 'rotate(0deg)' : 'rotate(180deg)';
    head.setAttribute('aria-expanded', String(!openNow));
    if (!openNow && !body.childElementCount) buildMinis(body);
  });
}
function spark(cv, c, m) {
  var ix = idx('3m');
  loadChart().then(function (Chart) {
    new Chart(cv, {
      type: 'line',
      data: { labels: ix, datasets: [
        { data: ix.map(function (i) { return c.s[m][i]; }), borderColor: C.navy, borderWidth: 2, pointRadius: 0, tension: 0.3 },
        { data: ix.map(function (i) { return market.s[m][i]; }), borderColor: C.line, borderWidth: 1.5, borderDash: [3, 3], pointRadius: 0, tension: 0.3 }
      ] },
      options: { responsive: true, maintainAspectRatio: false, animation: false, events: [], plugins: { legend: { display: false }, tooltip: { enabled: false } }, scales: { x: { display: false }, y: { display: false, reverse: m === 'rank', grace: '10%' } } }
    });
  });
}
function buildMinis(body) {
  ['performance', 'rank', 'rating', 'reviews'].forEach(function (m) {
    var card = document.createElement('button');
    card.type = 'button';
    card.style.cssText = 'display:flex;flex-direction:column;gap:8px;text-align:left;cursor:pointer;border:0;border-radius:12px;background:#fff;padding:14px 16px;box-shadow:inset 0 0 0 1px rgba(0,94,157,0.15);transition:box-shadow .15s;font-family:Inter,sans-serif;color:' + C.navy;
    card.onmouseenter = function () { card.style.boxShadow = 'inset 0 0 0 1.2px ' + C.blue; };
    card.onmouseleave = function () { card.style.boxShadow = 'inset 0 0 0 1px rgba(0,94,157,0.15)'; };
    card.onclick = function () { open(m); };
    var v = you.s[m][N - 1];
    card.innerHTML = '<span style="' + FJK + 'font-size:14px;font-weight:700">' + METRICS[m].label + '</span><span data-row style="display:flex;align-items:center;gap:8px"><span style="' + RUB + 'font-size:28px;font-weight:600;line-height:1">' + METRICS[m].fmt(v) + '</span></span><span style="position:relative;display:block;height:44px"><canvas data-spark></canvas></span><span style="font-size:11px;color:' + C.muted + '">vs market average · 3 months</span>';
    var ch = chip(you, m, '3m'); ch.onclick = null; ch.style.pointerEvents = 'none';
    card.querySelector('[data-row]').appendChild(ch);
    body.appendChild(card);
    spark(card.querySelector('[data-spark]'), you, m);
  });
}

// ---------- modal ----------
var state = { m: 'performance', p: '3m', sel: [] };
var modal = document.createElement('div');
modal.style.cssText = 'position:fixed;inset:0;z-index:70;display:none;align-items:center;justify-content:center;background:rgba(7,44,74,0.4);padding:16px';
modal.innerHTML = '<div role="dialog" aria-modal="true" aria-label="Trends" style="position:relative;box-sizing:border-box;width:100%;max-width:960px;max-height:92vh;display:flex;overflow:hidden;border-radius:16px;background:' + C.bg + ';box-shadow:0 16px 48px rgba(7,44,74,0.25);font-family:Inter,sans-serif;color:' + C.navy + '"><button type="button" data-close aria-label="Close" style="position:absolute;z-index:2;right:20px;top:16px;width:36px;height:36px;border:0;border-radius:999px;background:' + C.soft + ';color:' + C.navy + ';font-size:20px;line-height:1;cursor:pointer">×</button><div data-scroll style="flex:1;min-height:0;overflow-y:auto;padding:28px 32px 32px;scrollbar-width:thin;scrollbar-color:#BDC6CE transparent"></div></div>';
document.body.appendChild(modal);
var scroll = modal.querySelector('[data-scroll]');
modal.querySelector('[data-close]').onclick = close;
modal.addEventListener('click', function (e) { if (e.target === modal) close(); });
document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !e.defaultPrevented) close(); });
function close() { modal.style.display = 'none'; }
function open(m, focus) {
  state.m = m || 'performance';
  var top = others.slice().sort(function (a, b) { return a.rank - b.rank; }).slice(0, 2);
  state.sel = focus ? [focus] : top;
  if (focus && top.indexOf(focus) < 0) state.sel = [focus, top[0]];
  modal.style.display = 'flex';
  render();
}

function seg(items, cur, key) {
  return '<div style="display:inline-flex;gap:2px;padding:3px;border-radius:10px;background:#EEF1F4">' + items.map(function (it) {
    var on = it[0] === cur;
    return '<button type="button" data-' + key + '="' + it[0] + '" style="border:0;cursor:pointer;border-radius:8px;padding:6px 12px;font-size:13px;font-weight:' + (on ? 600 : 500) + ';' + FJK + 'background:' + (on ? '#fff' : 'transparent') + ';color:' + (on ? C.navy : C.muted) + ';box-shadow:' + (on ? '0 1px 2px rgba(7,44,74,0.12)' : 'none') + '">' + it[1] + '</button>';
  }).join('') + '</div>';
}
function colorOf(c) { return c.isYou ? C.navy : c.isAvg ? C.line : LINE_COLORS[state.sel.indexOf(c) % LINE_COLORS.length]; }

function render() {
  var m = state.m, p = state.p, M = METRICS[m], ix = idx(p);
  var series = [you, market].concat(state.sel);
  var html = '<h2 style="' + FJK + 'margin:0 0 4px;font-size:26px;font-weight:700;letter-spacing:-0.014em;padding-right:48px">Trends</h2><p style="margin:0 0 20px;font-size:14px;color:' + C.muted + '">How this location and its competitors changed over time.</p>';
  html += '<div style="display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:12px;margin-bottom:16px">' + seg(ORDER.map(function (k) { return [k, METRICS[k].label]; }), m, 'm') + seg(Object.keys(PERIODS).map(function (k) { return [k, PERIODS[k].label]; }), p, 'p') + '</div>';
  html += '<div style="display:flex;flex-wrap:wrap;align-items:flex-end;gap:12px;margin-bottom:12px"><span style="' + RUB + 'font-size:44px;font-weight:600;line-height:1">' + M.fmt(you.s[m][N - 1]) + '</span><span data-headchip style="padding-bottom:6px"></span><span style="padding-bottom:9px;font-size:13px;color:' + C.muted + '">Your business, vs ' + fmtDate(ix[0]) + '</span></div>';
  html += '<div data-chart style="position:relative;border-radius:12px;background:#fff;box-shadow:inset 0 0 0 1px rgba(0,94,157,0.15);padding:16px 16px 8px"></div>';
  html += '<div data-legend style="display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin:12px 0 24px"></div>';
  html += '<h3 style="' + FJK + 'margin:0 0 4px;font-size:18px;font-weight:700">' + (m === 'reviews' ? 'Who gains reviews fastest' : m === 'rank' ? 'Biggest position changes' : 'Biggest changes in ' + M.label.toLowerCase()) + '</h3><p style="margin:0 0 10px;font-size:13px;color:' + C.muted + '">Over the last ' + PERIODS[p].label + '. Click a row to show it on the chart.</p><div data-list style="display:flex;flex-direction:column"></div>';
  scroll.innerHTML = html;
  scroll.querySelector('[data-headchip]').appendChild(chipStatic(you, m, p));
  scroll.querySelectorAll('[data-m]').forEach(function (b) { b.onclick = function () { state.m = b.dataset.m; render(); }; });
  scroll.querySelectorAll('[data-p]').forEach(function (b) { b.onclick = function () { state.p = b.dataset.p; render(); }; });
  drawChart(scroll.querySelector('[data-chart]'), series, m, ix);
  drawLegend(scroll.querySelector('[data-legend]'), series);
  drawList(scroll.querySelector('[data-list]'), m, p);
}
function chipStatic(c, m, p) { var b = chip(c, m, p); b.onclick = null; b.style.cursor = 'default'; b.onmouseenter = null; return b; }

var bigChart = null, crosshair = {
  id: 'crosshair',
  afterDatasetsDraw: function (ch) {
    var a = ch.tooltip && ch.tooltip.getActiveElements(); if (!a || !a.length) return;
    var x = a[0].element.x, ctx = ch.ctx, ya = ch.scales.y;
    ctx.save(); ctx.strokeStyle = 'rgba(7,44,74,0.25)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x, ya.top); ctx.lineTo(x, ya.bottom); ctx.stroke(); ctx.restore();
  }
};
function yScale(series, m, ix) {
  var v = []; series.forEach(function (c) { ix.forEach(function (i) { v.push(c.s[m][i]); }); });
  var grid = { color: '#E6EBF0' }, border = { display: false };
  if (m === 'rank') {
    return { reverse: true, min: Math.max(1, Math.min.apply(null, v) - 1), max: Math.min(21, Math.max.apply(null, v) + 1), grid: grid, border: border, ticks: { color: C.muted, font: { family: 'Rubik', size: 11 }, maxTicksLimit: 6, precision: 0, callback: function (t) { return t >= 1 && t === Math.round(t) ? '#' + t : ''; } } };
  }
  var lo = Math.min.apply(null, v), hi = Math.max.apply(null, v), pad = Math.max((hi - lo) * 0.1, m === 'rating' ? 0.1 : 2), cap = m === 'rating' ? 5 : m === 'reviews' ? Infinity : 100;
  return { reverse: false, min: Math.max(0, lo - pad), max: Math.min(cap, hi + pad), grid: grid, border: border, ticks: { color: C.muted, font: { family: 'Rubik', size: 11 }, maxTicksLimit: 5, precision: m === 'rating' ? 1 : 0, callback: function (val) { return METRICS[m].fmt(val); } } };
}
function drawChart(el, series, m, ix) {
  el.innerHTML = '<div style="position:relative;height:260px"><canvas role="img" aria-label="' + METRICS[m].label + ' chart"></canvas></div>';
  var cv = el.querySelector('canvas');
  loadChart().then(function (Chart) {
    if (bigChart) bigChart.destroy();
    bigChart = new Chart(cv, {
      type: 'line',
      data: {
        labels: ix.map(fmtDate),
        datasets: series.map(function (c) {
          return { label: c.label || c.name, data: ix.map(function (i) { return c.s[m][i]; }), borderColor: colorOf(c), backgroundColor: colorOf(c), borderWidth: c.isYou ? 2.6 : 1.8, borderDash: c.isAvg ? [4, 4] : [], pointRadius: 0, pointHoverRadius: 4, pointHoverBorderWidth: 2, pointHoverBorderColor: '#fff', tension: 0.3, order: c.isYou ? 0 : 1 };
        })
      },
      options: {
        responsive: true, maintainAspectRatio: false, animation: { duration: 250 },
        interaction: { mode: 'index', intersect: false },
        layout: { padding: { top: 4, right: 4 } },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#fff', borderColor: 'rgba(0,94,157,0.18)', borderWidth: 1, titleColor: C.navy, bodyColor: C.navy, padding: 10, cornerRadius: 10, boxWidth: 10, boxHeight: 3, usePointStyle: false,
            titleFont: { family: 'Plus Jakarta Sans', weight: '700', size: 12 }, bodyFont: { family: 'Inter', size: 12 },
            itemSort: function (a, b) { return METRICS[m].up === (m !== 'rank') ? b.parsed.y - a.parsed.y : a.parsed.y - b.parsed.y; },
            callbacks: { label: function (ctx) { return ' ' + ctx.dataset.label + '   ' + METRICS[m].fmt(ctx.parsed.y); } }
          }
        },
        scales: {
          x: { grid: { display: false }, border: { color: '#E6EBF0' }, ticks: { color: C.muted, font: { family: 'Inter', size: 11 }, maxRotation: 0, autoSkipPadding: 16 } },
          y: yScale(series, m, ix)
        }
      },
      plugins: [crosshair]
    });
  });
}

function drawLegend(el, series) {
  series.forEach(function (c) {
    var item = document.createElement('span');
    item.style.cssText = 'display:inline-flex;align-items:center;gap:6px;height:28px;padding:0 10px;border-radius:999px;background:#fff;box-shadow:inset 0 0 0 1px rgba(0,94,157,0.15);font-size:12px';
    item.innerHTML = '<span style="width:12px;height:3px;border-radius:2px;background:' + colorOf(c) + '"></span><span style="max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + (c.label || c.name) + '</span>';
    if (!c.isYou && !c.isAvg) {
      var x = document.createElement('button'); x.type = 'button'; x.setAttribute('aria-label', 'Remove ' + c.name);
      x.style.cssText = 'border:0;background:transparent;cursor:pointer;padding:0 0 0 2px;color:' + C.muted + ';font-size:14px;line-height:1';
      x.textContent = '×'; x.onclick = function () { state.sel.splice(state.sel.indexOf(c), 1); render(); };
      item.appendChild(x);
    }
    el.appendChild(item);
  });
  if (state.sel.length < LINE_COLORS.length) el.appendChild(combo());
}

function combo() {
  var wrap = document.createElement('div');
  wrap.style.cssText = 'position:relative';
  var trig = document.createElement('button'); trig.type = 'button';
  trig.setAttribute('aria-haspopup', 'listbox');
  trig.style.cssText = 'display:inline-flex;align-items:center;gap:6px;height:28px;border:0;border-radius:999px;padding:0 12px;background:' + C.soft + ';color:' + C.blue + ';font-size:12px;font-weight:600;cursor:pointer;font-family:Inter,sans-serif;transition:box-shadow .15s';
  trig.innerHTML = '<span style="font-size:14px;line-height:1">+</span>Add competitor';
  trig.onmouseenter = function () { trig.style.boxShadow = 'inset 0 0 0 1.2px rgba(0,94,157,0.35)'; };
  trig.onmouseleave = function () { trig.style.boxShadow = 'none'; };
  var pop = document.createElement('div');
  pop.style.cssText = 'position:fixed;left:0;top:0;z-index:80;display:none;width:320px;max-width:80vw;box-sizing:border-box;border-radius:12px;background:#fff;box-shadow:0 0 0 1px rgba(0,94,157,0.15),0 12px 32px rgba(7,44,74,0.16);padding:8px';
  pop.innerHTML = '<div style="display:flex;align-items:center;gap:8px;height:36px;padding:0 10px;border-radius:8px;background:#F5F8FB;box-shadow:inset 0 0 0 1px #E6EBF0"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="' + C.muted + '" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"></circle><path d="m20 20-3.5-3.5"></path></svg><input data-q type="text" placeholder="Search competitors" aria-label="Search competitors" role="combobox" aria-autocomplete="list" style="flex:1;min-width:0;border:0;outline:0;background:transparent;font-family:Inter,sans-serif;font-size:13px;color:' + C.navy + '"></div><div data-opts role="listbox" style="max-height:248px;overflow-y:auto;margin-top:6px;scrollbar-width:thin;scrollbar-color:#BDC6CE transparent"></div>';
  wrap.appendChild(trig); wrap.appendChild(pop);
  var q = pop.querySelector('[data-q]'), opts = pop.querySelector('[data-opts]'), hi = 0, items = [];
  var esc = function (s) { return s.replace(/[&<>]/g, function (ch) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;' }[ch]; }); };
  function mark(name, term) {
    if (!term) return esc(name);
    var i = name.toLowerCase().indexOf(term);
    return i < 0 ? esc(name) : esc(name.slice(0, i)) + '<b style="font-weight:700;color:' + C.blue + '">' + esc(name.slice(i, i + term.length)) + '</b>' + esc(name.slice(i + term.length));
  }
  function paint() {
    var term = q.value.trim().toLowerCase();
    items = others.filter(function (c) { return state.sel.indexOf(c) < 0 && (!term || c.name.toLowerCase().indexOf(term) >= 0); }).sort(function (a, b) { return a.rank - b.rank; });
    hi = Math.min(hi, Math.max(0, items.length - 1));
    opts.innerHTML = items.length ? '' : '<div style="padding:14px 10px;font-size:13px;color:' + C.muted + '">No competitors match “' + esc(q.value.trim()) + '”</div>';
    items.forEach(function (c, n) {
      var o = document.createElement('div');
      o.setAttribute('role', 'option'); o.setAttribute('aria-selected', String(n === hi));
      o.style.cssText = 'display:grid;grid-template-columns:32px minmax(0,1fr) auto;align-items:center;gap:8px;padding:8px 10px;border-radius:8px;cursor:pointer;font-size:13px;color:' + C.navy + ';background:' + (n === hi ? C.soft : 'transparent');
      var d = delta(c, state.m, state.p), t = tone(d, state.m);
      o.innerHTML = '<span style="' + RUB + 'color:' + C.muted + '">#' + c.rank + '</span><span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + mark(c.name, term) + '</span><span style="' + RUB + 'font-size:12px;color:' + t.fg + '">' + METRICS[state.m].fmt(c.s[state.m][N - 1]) + '</span>';
      o.onmouseenter = function () { hi = n; [].forEach.call(opts.children, function (x, k) { x.style.background = k === hi ? C.soft : 'transparent'; }); };
      o.onmousedown = function (e) { e.preventDefault(); pick(c); };
      opts.appendChild(o);
    });
  }
  function pick(c) { state.sel.push(c); closePop(); render(); }
  function placePop() {
    var r = trig.getBoundingClientRect(), w = pop.offsetWidth, ph = pop.offsetHeight, vw = window.innerWidth, vh = window.innerHeight;
    pop.style.left = Math.max(8, Math.min(r.left, vw - w - 8)) + 'px';
    var below = r.bottom + 6, above = r.top - 6 - ph;
    pop.style.top = (below + ph <= vh - 8 || above < 8 ? Math.min(below, vh - ph - 8) : above) + 'px';
  }
  function onScroll(e) { if (!pop.contains(e.target)) closePop(); }
  function openPop() { pop.style.display = 'block'; q.value = ''; hi = 0; paint(); placePop(); q.focus(); window.addEventListener('scroll', onScroll, true); window.addEventListener('resize', closePop); }
  function closePop() { pop.style.display = 'none'; document.removeEventListener('mousedown', outside, true); window.removeEventListener('scroll', onScroll, true); window.removeEventListener('resize', closePop); }
  function outside(e) { if (!wrap.contains(e.target)) closePop(); }
  trig.onclick = function (e) { e.stopPropagation(); if (pop.style.display === 'block') return closePop(); openPop(); document.addEventListener('mousedown', outside, true); };
  q.oninput = function () { hi = 0; paint(); };
  q.onkeydown = function (e) {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); hi = clamp(hi + (e.key === 'ArrowDown' ? 1 : -1), 0, items.length - 1); paint(); var a = opts.children[hi]; if (a) opts.scrollTop = Math.max(0, a.offsetTop - opts.clientHeight / 2); }
    else if (e.key === 'Enter') { e.preventDefault(); if (items[hi]) pick(items[hi]); }
    else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); closePop(); trig.focus(); }
  };
  return wrap;
}

function drawList(el, m, p) {
  var list = companies.slice().sort(function (a, b) { var da = delta(a, m, p), db = delta(b, m, p); return METRICS[m].up ? db - da : da - db; });
  var top = list.slice(0, 8); if (top.indexOf(you) < 0) top.push(you);
  top.forEach(function (c) {
    var on = c.isYou || state.sel.indexOf(c) >= 0;
    var row = document.createElement('button'); row.type = 'button';
    row.style.cssText = 'display:grid;grid-template-columns:28px 14px minmax(0,1fr) 72px 96px;align-items:center;gap:10px;width:100%;border:0;border-top:1px solid #E6EBF0;background:' + (c.isYou ? C.soft : 'transparent') + ';padding:10px 8px;text-align:left;cursor:' + (c.isYou ? 'default' : 'pointer') + ';font-family:Inter,sans-serif;color:' + C.navy + ';font-size:14px';
    row.innerHTML = '<span style="' + RUB + 'color:' + C.muted + '">' + (list.indexOf(c) + 1) + '</span><span style="width:10px;height:10px;border-radius:3px;background:' + (on ? colorOf(c) : 'transparent') + ';box-shadow:inset 0 0 0 1.2px ' + (on ? colorOf(c) : C.line) + '"></span><span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap' + (c.isYou ? ';font-weight:600' : '') + '">' + (c.isYou ? c.name + ' · You' : c.name) + '</span><span style="' + RUB + 'text-align:right">' + METRICS[m].fmt(c.s[m][N - 1]) + '</span><span data-c style="display:flex;justify-content:flex-end"></span>';
    row.querySelector('[data-c]').appendChild(chipStatic(c, m, p));
    if (!c.isYou) {
      row.onmouseenter = function () { row.style.background = '#F5F8FB'; };
      row.onmouseleave = function () { row.style.background = 'transparent'; };
      row.onclick = function () { var i = state.sel.indexOf(c); if (i >= 0) state.sel.splice(i, 1); else if (state.sel.length < LINE_COLORS.length) state.sel.push(c); render(); };
    }
    el.appendChild(row);
  });
}

window.SharkTrends = { open: open };
