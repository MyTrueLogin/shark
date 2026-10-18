// All Locations: Status changes (if #status-changes is on the page), «Compare with» period bar, card change chips,
// US map with a timeline where two draggable points set the compared period,
// leaderboard change chips and the per-location trend modal.
// Data contract: see docs/NETWORK-DATA.md. Pass data either via
//   <script type="application/json" id="network-data">…</script>  or  window.SharkNetwork.setData(data)
import { loadChart } from './chart.js'
import usAtlasUrl from 'us-atlas/states-albers-10m.json?url'

var ST = ['strong', 'average', 'weak', 'sleeping'];
var LBL = { strong: 'Strong', average: 'Average', weak: 'Weak', sleeping: 'Sleeping' };
var COL = { strong: '#059669', average: '#F59E0B', weak: '#F87171', sleeping: '#9A9A9A' };
var NONE = '#E5E9ED';
var C = { navy: '#072C4A', blue: '#005E9D', muted: '#506A7F', soft: '#F0F8FF', line: '#E6EBF0' };
var FJK = "font-family:'Plus Jakarta Sans',sans-serif;", RUB = 'font-family:Rubik,sans-serif;';
var GOOD = { bg: '#BDF0DC', fg: '#074B34' }, BAD = { bg: '#FFDCD6', fg: '#A2281B' }, FLAT = { bg: '#EEF1F4', fg: '#506A7F' };
var STATE_NAMES = { AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California', CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware', DC: 'District of Columbia', FL: 'Florida', GA: 'Georgia', HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois', IN: 'Indiana', IA: 'Iowa', KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana', ME: 'Maine', MD: 'Maryland', MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota', MS: 'Mississippi', MO: 'Missouri', MT: 'Montana', NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire', NJ: 'New Jersey', NM: 'New Mexico', NY: 'New York', NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio', OK: 'Oklahoma', OR: 'Oregon', PA: 'Pennsylvania', RI: 'Rhode Island', SC: 'South Carolina', SD: 'South Dakota', TN: 'Tennessee', TX: 'Texas', UT: 'Utah', VT: 'Vermont', VA: 'Virginia', WA: 'Washington', WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming' };
var NAME_TO_ABBR = {}; Object.keys(STATE_NAMES).forEach(function (k) { NAME_TO_ABBR[STATE_NAMES[k]] = k; });
var KEYS = [], PERIOD = null, LOCS = [], STOPS = [], NOW = 0, TODAY = new Date(), CLIENT = '', TH_ = { strong: 80, average: 50, weak: 25 };
function toStatus(v, perf) {
  if (typeof v === 'number') return ST[Math.max(0, Math.min(3, Math.round(v)))];
  if (typeof v === 'string') { var x = v.toLowerCase(); if (x === 'mediocre') return 'average'; if (LBL[x]) return x; }
  return perf >= TH_.strong ? 'strong' : perf >= TH_.average ? 'average' : perf >= TH_.weak ? 'weak' : 'sleeping';
}
function fmtStopDate(daysAgo, withYear) { var d = new Date(TODAY); d.setDate(d.getDate() - daysAgo); return d.toLocaleDateString('en-US', withYear === false ? { month: 'short', day: 'numeric' } : { month: 'short', day: 'numeric', year: 'numeric' }); }
function autoLabel(n) { if (n === 0) return 'Today'; if (n % 365 === 0) return (n / 365) + (n === 365 ? ' year ago' : ' years ago'); if (n >= 28 && (n % 30 <= 2 || n === 91)) { var m = Math.round(n / 30.4); return m + (m === 1 ? ' month ago' : ' months ago'); } if (n % 7 === 0) return (n / 7) + (n === 7 ? ' week ago' : ' weeks ago'); return n + (n === 1 ? ' day ago' : ' days ago'); }
function setData(data) {
  if (data.today) TODAY = new Date(data.today + 'T00:00:00');
  if (data.thresholds) Object.keys(data.thresholds).forEach(function (k) { TH_[k] = +data.thresholds[k]; });
  CLIENT = data.client || CLIENT;
  STOPS = data.stops.map(function (x) { var n = typeof x === 'number' ? x : +x.daysAgo; return { days: n, key: typeof x === 'object' && (x.label != null || x.key === true), label: x.label || autoLabel(n), date: fmtStopDate(n) }; }).sort(function (a, b) { return b.days - a.days; });
  NOW = STOPS.length - 1;
  if (!STOPS.some(function (s) { return s.key; })) STOPS.forEach(function (s) { s.key = true; });
  STOPS[0].key = STOPS[NOW].key = true;
  KEYS = []; STOPS.forEach(function (s, k) { if (s.key && k < NOW) KEYS.push(k); });
  if (PERIOD === null || PERIOD >= NOW || !STOPS[PERIOD].key) { PERIOD = KEYS[0]; KEYS.forEach(function (k) { if (Math.abs(STOPS[k].days - 30) < Math.abs(STOPS[PERIOD].days - 30)) PERIOD = k; }); }
  LOCS = data.locations.map(function (r) {
    var perf = r.performance.map(Number);
    return { name: r.name, st: r.state, ll: [+r.lat, +r.lon], perf: perf, hist: perf.map(function (p, k) { return toStatus(r.status && r.status[k], p); }) };
  });
}
var rank = function (x) { return ST.indexOf(x); };
function changes(i) {
  var up = [], down = [], same = [];
  LOCS.forEach(function (l) { var a = rank(l.hist[i]), b = rank(l.hist[NOW]); (b < a ? up : b > a ? down : same).push(l); });
  return { up: up, down: down, same: same };
}
function badge(st, small) { return '<span style="display:inline-flex;align-items:center;white-space:nowrap;border-radius:999px;padding:' + (small ? '2px 8px' : '3px 10px') + ';font-size:12px;color:#FAFAFA;background:' + COL[st] + '">' + LBL[st] + '</span>'; }
var UP = '<svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true"><path d="M5 1.5 9 7.5H1z" fill="currentColor"/></svg>';
var DN = '<svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true"><path d="M5 8.5 1 2.5h8z" fill="currentColor"/></svg>';
function chipHtml(d, unit) {
  var t = d > 0 ? GOOD : d < 0 ? BAD : FLAT;
  return '<span style="display:inline-flex;align-items:center;gap:3px;height:22px;padding:0 7px;border-radius:999px;' + RUB + 'font-size:12px;font-weight:500;line-height:1;white-space:nowrap;background:' + t.bg + ';color:' + t.fg + '">' + (d > 0 ? UP : d < 0 ? DN : '±') + Math.abs(d) + (unit || '') + '</span>';
}

// ---------- status changes ----------
var sc = document.getElementById('status-changes');
function seg(items, cur, attr) {
  return '<div style="display:inline-flex;gap:2px;padding:3px;border-radius:10px;background:#EEF1F4">' + items.map(function (it) {
    var on = it[0] === cur;
    return '<button type="button" ' + attr + '="' + it[0] + '" style="border:0;cursor:pointer;border-radius:8px;padding:5px 12px;font-size:13px;font-weight:' + (on ? 600 : 500) + ';' + FJK + 'background:' + (on ? '#fff' : 'transparent') + ';color:' + (on ? C.navy : C.muted) + ';box-shadow:' + (on ? '0 1px 2px rgba(7,44,74,0.12)' : 'none') + '">' + it[1] + '</button>';
  }).join('') + '</div>';
}
function renderSC() {
  if (!sc) return;
  var i = PERIOD, ch = changes(i), net = ch.up.length - ch.down.length;
  var v = net > 0 ? ['Network is improving', GOOD, UP] : net < 0 ? ['Network is declining', BAD, DN] : ['Network is stable', FLAT, '±'];
  var h = '<div style="display:flex;flex-wrap:wrap;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:16px"><div><h2 style="' + FJK + 'margin:0;font-size:22px;font-weight:700;letter-spacing:-0.01em;color:' + C.navy + '">Status changes</h2><p style="margin:4px 0 0;font-size:14px;color:' + C.muted + '">How many locations moved to a stronger or weaker category since ' + STOPS[i].date + '</p></div></div>';
  h += '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,320px),1fr));gap:24px;align-items:start">';
  // left: verdict + counts
  h += '<div style="display:flex;flex-direction:column;gap:16px"><div style="display:inline-flex;align-items:center;gap:8px;width:fit-content;height:32px;padding:0 12px;border-radius:999px;background:' + v[1].bg + ';color:' + v[1].fg + ';' + FJK + 'font-size:15px;font-weight:700">' + v[2] + v[0] + '</div>';
  h += '<div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px">' + [['Improved', ch.up.length, GOOD.fg], ['Declined', ch.down.length, BAD.fg], ['No change', ch.same.length, C.navy]].map(function (x) {
    return '<div style="display:flex;flex-direction:column;gap:2px"><span style="' + RUB + 'font-size:44px;font-weight:600;line-height:1;letter-spacing:-0.02em;color:' + x[2] + '">' + x[1] + '</span><span style="font-size:13px;color:' + C.muted + '">' + x[0] + '</span></div>';
  }).join('') + '</div>';
  // distribution then → now
  h += '<div style="display:flex;flex-direction:column;gap:8px;padding-top:4px">' + ST.map(function (st) {
    var then = LOCS.filter(function (l) { return l.hist[i] === st; }).length, now = LOCS.filter(function (l) { return l.hist[NOW] === st; }).length, d = now - then;
    var good = st === 'sleeping' || st === 'weak' ? -d : d;
    var t = d === 0 ? FLAT : good > 0 ? GOOD : BAD;
    return '<div style="display:grid;grid-template-columns:84px minmax(0,1fr) 64px 44px;align-items:center;gap:10px;font-size:13px;color:' + C.navy + '"><span style="display:flex;align-items:center;gap:6px"><span style="width:8px;height:8px;border-radius:999px;background:' + COL[st] + '"></span>' + LBL[st] + '</span><span style="position:relative;height:8px;border-radius:999px;background:' + C.line + '"><span style="position:absolute;left:0;top:0;bottom:0;width:' + (then / LOCS.length * 100) + '%;border-radius:999px;box-shadow:inset 0 0 0 1.2px ' + COL[st] + ';opacity:.6"></span><span style="position:absolute;left:0;top:0;bottom:0;width:' + (now / LOCS.length * 100) + '%;border-radius:999px;background:' + COL[st] + '"></span></span><span style="' + RUB + 'text-align:right;color:' + C.muted + '">' + then + ' → <b style="color:' + C.navy + ';font-weight:600">' + now + '</b></span><span style="display:flex;justify-content:flex-end"><span style="' + RUB + 'font-size:12px;font-weight:500;padding:2px 6px;border-radius:999px;background:' + t.bg + ';color:' + t.fg + '">' + (d > 0 ? '+' : d < 0 ? '−' : '±') + Math.abs(d) + '</span></span></div>';
  }).join('') + '<div style="display:flex;gap:16px;font-size:11px;color:' + C.muted + '"><span style="display:flex;align-items:center;gap:6px"><span style="width:14px;height:6px;border-radius:999px;box-shadow:inset 0 0 0 1.2px ' + C.muted + '"></span>' + STOPS[i].date + '</span><span style="display:flex;align-items:center;gap:6px"><span style="width:14px;height:6px;border-radius:999px;background:' + C.muted + '"></span>Today</span></div></div></div>';
  // right: moved locations
  var moved = ch.up.concat(ch.down);
  h += '<div style="display:flex;flex-direction:column"><h3 style="' + FJK + 'margin:0 0 6px;font-size:15px;font-weight:700;color:' + C.navy + '">Locations that changed</h3>';
  if (!moved.length) h += '<p style="margin:0;font-size:13px;color:' + C.muted + '">No location changed its category in this period.</p>';
  moved.forEach(function (l) {
    var d = l.perf[NOW] - l.perf[i], isUp = ch.up.indexOf(l) >= 0;
    h += '<button type="button" data-loc="' + LOCS.indexOf(l) + '" style="display:grid;grid-template-columns:18px minmax(0,1fr) auto auto;align-items:center;gap:10px;width:100%;border:0;border-top:1px solid ' + C.line + ';background:transparent;padding:10px 4px;text-align:left;cursor:pointer;font-family:Inter,sans-serif;font-size:14px;color:' + C.navy + '"><span style="color:' + (isUp ? GOOD.fg : BAD.fg) + ';display:flex">' + (isUp ? UP : DN) + '</span><span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + l.name + ' <span style="color:' + C.muted + ';font-size:12px">· ' + l.st + '</span></span><span style="display:flex;align-items:center;gap:6px">' + badge(l.hist[i], 1) + '<span style="color:' + C.muted + '">→</span>' + badge(l.hist[NOW], 1) + '</span>' + chipHtml(d, ' pts') + '</button>';
  });
  h += '</div></div>';
  sc.innerHTML = h;
  sc.querySelectorAll('[data-loc]').forEach(function (b) {
    b.onmouseenter = function () { b.style.background = '#F5F8FB'; };
    b.onmouseleave = function () { b.style.background = 'transparent'; };
    b.onclick = function () { openChart(LOCS[+b.dataset.loc]); };
  });
}

// ---------- global period + card chips ----------
function renderPeriod() {
  var el = document.getElementById('period-bar'); if (!el) return;
  el.innerHTML = '<span style="font-size:13px;color:' + C.muted + '">Compare with</span>' + seg(KEYS.map(function (k) { return [k, STOPS[k].label.replace(/ ago$/, '')]; }).reverse(), PERIOD, 'data-gp') + '<span style="font-size:12px;color:' + C.muted + '">since ' + STOPS[PERIOD].date + '</span>';
  el.querySelectorAll('[data-gp]').forEach(function (b) { b.onclick = function () { PERIOD = +b.dataset.gp; renderPeriod(); renderSC(); renderCards(); paintLeaderboard(); }; });
}
function renderCards() {
  document.querySelectorAll('[data-card]').forEach(function (el) {
    var st = el.dataset.card, then = LOCS.filter(function (l) { return l.hist[PERIOD] === st; }).length, now = LOCS.filter(function (l) { return l.hist[NOW] === st; }).length, d = now - then;
    var good = st === 'weak' || st === 'sleeping' ? -d : d, t = d === 0 ? FLAT : good > 0 ? GOOD : BAD;
    var old = el.querySelector('[data-card-chip]'); if (old) old.remove();
    var c = document.createElement('span'); c.dataset.cardChip = '';
    c.title = 'vs ' + STOPS[PERIOD].date + ' (' + then + ' then)';
    c.style.cssText = 'display:inline-flex;align-items:center;gap:3px;height:24px;margin-bottom:12px;padding:0 8px;border-radius:999px;' + RUB + 'font-size:13px;font-weight:500;line-height:1;white-space:nowrap;background:' + t.bg + ';color:' + t.fg;
    c.innerHTML = (d > 0 ? UP : d < 0 ? DN : '±') + Math.abs(d);
    el.appendChild(c);
  });
}

// ---------- map with timeline ----------
var root = document.getElementById('map-root'), tl = document.getElementById('map-timeline');
var mapIdx = 0, statePaths = null;
function bestIn(abbr, i) {
  var b = null; LOCS.forEach(function (l) { if (l.st === abbr && (b === null || rank(l.hist[i]) < rank(b))) b = l.hist[i]; }); return b;
}
// Timeline period: two points on the track (A = start, B = end, indices into STOPS), both draggable.
// The map shows the market at the point moved last (mapIdx); the chips compare A with B.
var rangeA = 0, rangeB = 0;
function changesBetween(i, j) {
  var up = [], down = [];
  LOCS.forEach(function (l) { var a = rank(l.hist[i]), b = rank(l.hist[j]); if (b < a) up.push(l); else if (b > a) down.push(l); });
  return { up: up, down: down };
}
function setPoint(which, k) {
  if (which === 'a') rangeA = clampN(k, 0, rangeB - 1); else rangeB = clampN(k, rangeA + 1, NOW);
  mapIdx = which === 'a' ? rangeA : rangeB;
  renderTimeline(); paintMap();
}
function renderTimeline() {
  if (!tl) return;
  var A = rangeA, B = rangeB, SPAN = Math.max(1, STOPS[0].days - STOPS[NOW].days);
  var fr = function (k) { return (STOPS[0].days - STOPS[k].days) / SPAN; }, pos = function (k) { return (fr(k) * 100) + '%'; };
  var ch = changesBetween(A, B), active = mapIdx === A ? 'a' : 'b';
  var dateBtn = function (k, which) { var on = which === active; return '<button type="button" data-pick="' + which + '" style="border:0;background:transparent;padding:0;cursor:pointer;' + FJK + 'font-size:16px;font-weight:700;color:' + (on ? C.navy : C.muted) + ';text-decoration:' + (on ? 'underline' : 'none') + ';text-underline-offset:4px">' + (k === NOW ? 'Today' : STOPS[k].date) + '</button>'; };
  var h = '<div style="display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:10px;margin-bottom:18px">';
  h += '<div style="display:flex;flex-wrap:wrap;align-items:baseline;gap:8px"><span style="font-size:13px;color:' + C.muted + '">Market from</span>' + dateBtn(A, 'a') + '<span style="color:' + C.muted + '">→</span>' + dateBtn(B, 'b') + '</div>';
  h += '<span style="display:flex;flex-wrap:wrap;align-items:center;gap:6px;font-size:12px"><span style="display:inline-flex;align-items:center;gap:4px;height:22px;padding:0 8px;border-radius:999px;background:' + GOOD.bg + ';color:' + GOOD.fg + ';font-weight:600;white-space:nowrap">' + UP + ch.up.length + ' improved</span><span style="display:inline-flex;align-items:center;gap:4px;height:22px;padding:0 8px;border-radius:999px;background:' + BAD.bg + ';color:' + BAD.fg + ';font-weight:600;white-space:nowrap">' + DN + ch.down.length + ' declined</span></span>';
  h += '</div>';
  var TH = 36, cnt = STOPS.map(function (_, k) { return ST.map(function (st) { return LOCS.filter(function (l) { return l.hist[k] === st; }).length; }); });
  var svg = '<svg viewBox="0 0 300 ' + TH + '" preserveAspectRatio="none" width="100%" height="' + TH + '" style="position:absolute;inset:0;display:block;border-radius:8px;overflow:hidden">';
  ST.slice().reverse().forEach(function (st) {
    var si = ST.indexOf(st), top = [], bot = [];
    cnt.forEach(function (c, k) {
      var below = 0; for (var j = si + 1; j < ST.length; j++) below += c[j];
      var x = fr(k) * 300;
      bot.push(x + ',' + (TH - below / LOCS.length * TH));
      top.push(x + ',' + (TH - (below + c[si]) / LOCS.length * TH));
    });
    svg += '<polygon points="' + top.join(' ') + ' ' + bot.reverse().join(' ') + '" fill="' + COL[st] + '"/>';
  });
  // outside the period — faded; the period — dashed frame
  svg += '<rect x="0" y="0" width="' + (fr(A) * 300) + '" height="' + TH + '" fill="#FAFAFA" fill-opacity="0.6"/><rect x="' + (fr(B) * 300) + '" y="0" width="' + ((1 - fr(B)) * 300) + '" height="' + TH + '" fill="#FAFAFA" fill-opacity="0.6"/>';
  svg += '<rect x="' + (fr(A) * 300) + '" y="0" width="' + ((fr(B) - fr(A)) * 300) + '" height="' + TH + '" fill="none" stroke="' + C.navy + '" stroke-opacity="0.35" stroke-width="2" stroke-dasharray="4 3" vector-effect="non-scaling-stroke"/>';
  STOPS.slice(1, NOW).forEach(function (_, j) { var k = j + 1; svg += '<line x1="' + (fr(k) * 300) + '" x2="' + (fr(k) * 300) + '" y1="0" y2="' + TH + '" stroke="#fff" stroke-opacity="0.7" stroke-width="1" vector-effect="non-scaling-stroke"/>'; });
  svg += '</svg>';
  h += '<div data-track role="group" aria-label="Map period" style="position:relative;height:' + TH + 'px;cursor:pointer;touch-action:none">' + svg;
  [['a', A], ['b', B]].forEach(function (p) {
    var on = p[0] === active;
    h += '<span style="position:absolute;left:' + pos(p[1]) + ';top:-6px;bottom:-6px;width:3px;transform:translateX(-50%);border-radius:2px;background:' + C.navy + ';box-shadow:0 0 0 2px #fff;transition:left .2s;pointer-events:none"></span>';
    h += '<span data-handle="' + p[0] + '" role="slider" tabindex="0" aria-label="' + (p[0] === 'a' ? 'Period start' : 'Period end') + '" aria-valuemin="0" aria-valuemax="' + NOW + '" aria-valuenow="' + p[1] + '" aria-valuetext="' + STOPS[p[1]].date + '" style="position:absolute;left:' + pos(p[1]) + ';top:-10px;width:14px;height:14px;transform:translateX(-50%);border-radius:999px;background:' + (on ? C.navy : '#fff') + ';box-shadow:0 0 0 2px ' + C.navy + ',0 0 0 4px #fff,0 2px 6px rgba(7,44,74,0.3);transition:left .2s;outline:none;cursor:grab"></span>';
  });
  h += '</div>';
  h += '<div style="position:relative;height:34px;margin:10px 0 0">';
  var shown = [], last = -1; STOPS.forEach(function (st, k) { if (!st.key) return; if (k === 0 || k === NOW || (fr(NOW) - fr(k) >= 0.06 && (last < 0 || fr(k) - fr(last) >= 0.1))) { shown.push(k); last = k; } });
  shown.forEach(function (k) {
    var st = STOPS[k], on = k === A || k === B, tight = k > 0 && k < NOW && fr(NOW) - fr(k) < 0.14, al = k === 0 ? 'left:0;' : k === NOW ? 'right:0;' : 'left:' + pos(k) + ';transform:translateX(' + (tight ? '-100%' : '-50%') + ');';
    h += '<button type="button" data-stop="' + k + '" style="position:absolute;' + al + 'top:0;display:flex;flex-direction:column;align-items:' + (k === 0 ? 'flex-start' : k === NOW || tight ? 'flex-end' : 'center') + ';gap:1px;border:0;background:transparent;padding:0;cursor:pointer;font-family:Inter,sans-serif;white-space:nowrap"><span style="' + FJK + 'font-size:13px;font-weight:' + (on ? 700 : 500) + ';color:' + (on ? C.navy : C.muted) + '">' + st.label + '</span><span style="font-size:11px;color:' + C.muted + '">' + fmtStopDate(st.days, false) + '</span></button>';
  });
  h += '</div>';
  tl.innerHTML = h;
  var tr = tl.querySelector('[data-track]');
  // the track is re-rendered while dragging, so the rect is measured once per gesture
  var at = function (x, r) { var p = clampN((x - r.left) / r.width, 0, 1), best = 0; STOPS.forEach(function (_, k) { if (Math.abs(fr(k) - p) < Math.abs(fr(best) - p)) best = k; }); return best; };
  // the nearer point follows the pointer; ties go to the end point
  var nearer = function (k) { return Math.abs(k - rangeA) < Math.abs(k - rangeB) ? 'a' : 'b'; };
  tr.onpointerdown = function (e) {
    e.preventDefault();
    var r = tr.getBoundingClientRect(), h0 = e.target.closest('[data-handle]'), which = h0 ? h0.dataset.handle : nearer(at(e.clientX, r));
    var mv = function (ev) { var k = at(ev.clientX, r); if (k !== (which === 'a' ? rangeA : rangeB)) setPoint(which, k); };
    var up = function () { window.removeEventListener('pointermove', mv); window.removeEventListener('pointerup', up); var f = tl.querySelector('[data-handle="' + which + '"]'); if (f) f.focus({ preventScroll: true }); };
    window.addEventListener('pointermove', mv); window.addEventListener('pointerup', up);
    mv(e);
  };
  tl.querySelectorAll('[data-handle]').forEach(function (hd) {
    hd.onkeydown = function (e) {
      var d = e.key === 'ArrowLeft' || e.key === 'ArrowDown' ? -1 : e.key === 'ArrowRight' || e.key === 'ArrowUp' ? 1 : 0;
      if (!d) return;
      e.preventDefault();
      var w = hd.dataset.handle; setPoint(w, (w === 'a' ? rangeA : rangeB) + d);
      tl.querySelector('[data-handle="' + w + '"]').focus({ preventScroll: true });
    };
  });
  tl.querySelectorAll('[data-pick]').forEach(function (b) { b.onclick = function () { mapIdx = b.dataset.pick === 'a' ? rangeA : rangeB; renderTimeline(); paintMap(); }; });
  tl.querySelectorAll('[data-stop]').forEach(function (b) { b.onclick = function () { var k = +b.dataset.stop; setPoint(nearer(k), k); }; });
}
function clampN(v, a, b) { return Math.max(a, Math.min(b, v)); }
function setMap(i) { mapIdx = i; renderTimeline(); paintMap(); }
function paintMap() {
  if (!statePaths) return;
  statePaths.attr('fill', function (d) { var ab = NAME_TO_ABBR[d.properties.name]; var st = ab && bestIn(ab, mapIdx); return st ? COL[st] : NONE; });
}

if (root) {
  Promise.all([import('d3'), import('topojson-client'), fetch(usAtlasUrl).then(function (r) { return r.json(); })])
    .then(function (m) { drawMap(m[0], m[1], m[2]); })
    .catch(function (err) { console.error(err); root.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;font-size:13px;color:' + C.muted + '">Map could not be loaded</div>'; });
}
function drawMap(d3, topojson, us) {
  var W = 975, H = 610;
  var states = topojson.feature(us, us.objects.states).features;
  root.innerHTML = '';
  var svg = d3.select(root).append('svg').attr('viewBox', '0 0 ' + W + ' ' + H).attr('width', '100%').attr('height', '100%').style('display', 'block').attr('role', 'img').attr('aria-label', 'Map of US states coloured by presence');
  var g = svg.append('g');
  var path = d3.geoPath();
  statePaths = g.selectAll('path').data(states).join('path').attr('d', path).attr('stroke', '#fff').attr('stroke-width', 1).attr('fill', NONE).style('cursor', 'default').style('transition', 'fill .3s');
  g.append('path').datum(topojson.mesh(us, us.objects.states, function (a, b) { return a !== b; })).attr('fill', 'none').attr('stroke', '#fff').attr('stroke-width', 1).attr('d', path).style('pointer-events', 'none');
  var pop = document.createElement('div');
  pop.style.cssText = 'position:absolute;z-index:3;display:none;pointer-events:none;min-width:220px;max-width:300px;border-radius:10px;background:#fff;box-shadow:0 0 0 1px rgba(0,94,157,0.15),0 8px 24px rgba(7,44,74,0.14);padding:10px 12px;font-family:Inter,sans-serif;font-size:12px;color:' + C.navy;
  root.appendChild(pop);
  function why(l, i) {
    var st = l.hist[i], p = l.perf[i], prev = i > 0 ? l.perf[i - 1] : null;
    var trend = prev === null ? '' : p > prev ? ' Up from ' + prev + '% a week earlier.' : p < prev ? ' Down from ' + prev + '% a week earlier.' : '';
    if (p === 0) return ['No tracking data yet, so the location shows as Sleeping.', 'Check that the Google Business Profile is verified and linked to Shark.'];
    if (st === 'sleeping') return ['Rarely appears in Google Maps for your keywords (Performance ' + p + '%).' + trend, 'Add the main keywords to the profile categories and description, and post weekly.'];
    if (st === 'weak') return ['Shows in only a few parts of the area; nearby competitors rank above it (Performance ' + p + '%).' + trend, 'Collect new reviews and add fresh photos to climb above the local leaders.'];
    if (st === 'average') return ['Visible in parts of the area, but below the leaders (Performance ' + p + '%).' + trend, 'Keep reviews coming and post regularly to reach Strong.'];
    return ['Shows in the top results across most of the area (Performance ' + p + '%).' + trend, 'Keep the profile active to hold the position.'];
  }
  function locRow(l) {
    var w = why(l, mapIdx);
    return '<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;padding-top:6px"><span style="font-weight:600">' + l.name + '</span>' + badge(l.hist[mapIdx], 1) + '</div>' + (mapIdx !== NOW && l.hist[NOW] !== l.hist[mapIdx] ? '<div style="font-size:11px;color:' + C.muted + '">Today: ' + LBL[l.hist[NOW]] + '</div>' : '') + '<div style="margin-top:4px;font-size:12px;line-height:1.4;color:' + C.navy + '"><span style="color:' + C.muted + '">Why: </span>' + w[0] + '</div><div style="margin-top:2px;font-size:12px;line-height:1.4;color:' + C.navy + '"><span style="color:' + C.muted + '">How to improve: </span>' + w[1] + '</div>';
  }
  function showPop(e, html) {
    pop.innerHTML = html; pop.style.display = 'block';
    var r = root.getBoundingClientRect(), x = e.clientX - r.left + 14, y = e.clientY - r.top + 14;
    if (x + pop.offsetWidth > r.width) x = e.clientX - r.left - pop.offsetWidth - 14;
    if (y + pop.offsetHeight > r.height) y = e.clientY - r.top - pop.offsetHeight - 14;
    pop.style.left = x + 'px'; pop.style.top = y + 'px';
  }
  statePaths.on('mousemove', function (e, d) {
    var ab = NAME_TO_ABBR[d.properties.name], ls = LOCS.filter(function (l) { return l.st === ab; });
    d3.select(this).attr('stroke', C.navy).attr('stroke-width', 1.5).raise();
    showPop(e, '<div style="' + FJK + 'font-size:13px;font-weight:700;margin-bottom:' + (ls.length ? 6 : 0) + 'px">' + d.properties.name + ' — ' + (ls.length ? ls.length + (ls.length === 1 ? ' location' : ' locations') : '<span style="font-weight:400;color:' + C.muted + '">no locations</span>') + '</div>' + ls.map(locRow).join(''));
  }).on('mouseleave', function () { d3.select(this).attr('stroke', '#fff').attr('stroke-width', 1); pop.style.display = 'none'; });
  var zoom = d3.zoom().scaleExtent([1, 6]).translateExtent([[0, 0], [W, H]]).on('zoom', function (e) { g.attr('transform', e.transform); });
  svg.call(zoom).on('wheel.zoom', null);
  var zi = document.querySelector('[aria-label="Zoom in"]'), zo = document.querySelector('[aria-label="Zoom out"]');
  if (zi) zi.onclick = function () { svg.transition().duration(250).call(zoom.scaleBy, 1.6); };
  if (zo) zo.onclick = function () { svg.transition().duration(250).call(zoom.scaleBy, 1 / 1.6); };
  paintMap();
}

// ---------- leaderboard performance chips ----------
function paintLeaderboard() {
  document.querySelectorAll('[data-net-chip]').forEach(function (b) { var w = b.parentElement; w.parentElement.insertBefore(w.firstChild, w); w.remove(); });
  if (NOW < 1) return;
  document.querySelectorAll('#location-leaderboard tbody tr[role="link"]').forEach(function (tr) {
    var nm = (tr.children[1].querySelector('a') || {}).textContent || '';
    var l = LOCS.filter(function (x) { return nm.trim() === x.name || nm.trim() === CLIENT + ' - ' + x.name; })[0];
    if (!l) return;
    var cell = tr.children[2], v = cell.querySelector('span');
    var wrap = document.createElement('div'); wrap.style.cssText = 'display:flex;align-items:center;gap:8px';
    cell.insertBefore(wrap, v); wrap.appendChild(v);
    var b = document.createElement('button'); b.type = 'button'; b.dataset.netChip = '';
    b.setAttribute('aria-label', 'Performance change since ' + STOPS[PERIOD].label + ', open trend');
    b.title = 'vs ' + STOPS[PERIOD].label + ' · open trend';
    b.style.cssText = 'border:0;padding:0;background:transparent;cursor:pointer;border-radius:999px;transition:box-shadow .15s';
    b.innerHTML = chipHtml(l.perf[NOW] - l.perf[PERIOD], ' pts');
    b.onmouseenter = function () { b.style.boxShadow = '0 0 0 1.2px rgba(7,44,74,0.25)'; };
    b.onmouseleave = function () { b.style.boxShadow = 'none'; };
    b.onclick = function (e) { e.preventDefault(); e.stopPropagation(); openChart(l); };
    wrap.appendChild(b);
  });
}

// ---------- trend modal ----------
function weekly(l, from) {
  var out = [], seed = 0; for (var c = 0; c < l.name.length; c++) seed += l.name.charCodeAt(c);
  var DAYS = STOPS.map(function (s) { return -s.days; }), step = Math.max(1, Math.round(-from / 26));
  if (NOW < 1) return [{ d: 0, v: l.perf[0] }];
  for (var d = from; d <= 0; d += step) {
    var k = 0; while (k < NOW - 1 && d > DAYS[k + 1]) k++;
    var t = (d - DAYS[k]) / Math.max(1, DAYS[k + 1] - DAYS[k]), v = l.perf[k] + (l.perf[k + 1] - l.perf[k]) * t;
    var n = l.perf[NOW] === 0 && l.perf[0] === 0 ? 0 : Math.sin(d * 0.37 + seed) * 2.2 * Math.sin(Math.PI * t);
    out.push({ d: d, v: Math.max(0, Math.min(100, Math.round(v + n))) });
  }
  if (out[out.length - 1].d !== 0) out.push({ d: 0, v: l.perf[NOW] });
  return out;
}
function fmt(d) { var x = new Date(TODAY); x.setDate(x.getDate() + d); return x.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); }
var modal = document.createElement('div');
modal.style.cssText = 'position:fixed;inset:0;z-index:70;display:none;align-items:center;justify-content:center;background:rgba(7,44,74,0.4);padding:16px';
modal.innerHTML = '<div role="dialog" aria-modal="true" aria-label="Location trend" style="position:relative;box-sizing:border-box;width:100%;max-width:820px;max-height:92vh;display:flex;overflow:hidden;border-radius:16px;background:#FAFAFA;box-shadow:0 16px 48px rgba(7,44,74,0.25);font-family:Inter,sans-serif;color:' + C.navy + '"><button type="button" data-close aria-label="Close" style="position:absolute;z-index:2;right:20px;top:16px;width:36px;height:36px;border:0;border-radius:999px;background:' + C.soft + ';color:' + C.navy + ';font-size:20px;line-height:1;cursor:pointer">×</button><div data-scroll style="flex:1;min-height:0;overflow-y:auto;padding:28px 32px 32px;scrollbar-width:thin;scrollbar-color:#BDC6CE transparent"></div></div>';
document.body.appendChild(modal);
var mscroll = modal.querySelector('[data-scroll]'), chart = null, mState = { l: null, k: null };
function closeM() { modal.style.display = 'none'; }
modal.querySelector('[data-close]').onclick = closeM;
modal.addEventListener('click', function (e) { if (e.target === modal) closeM(); });
document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeM(); });
function openChart(l) { mState.l = l; mState.k = PERIOD; modal.style.display = 'flex'; renderM(); }
function renderM() {
  if (mState.k === null || mState.k >= NOW) mState.k = PERIOD;
  var l = mState.l, startIdx = mState.k, from = -STOPS[startIdx].days, pts = weekly(l, from);
  var avg = weekly({ name: 'avg', perf: STOPS.map(function (_, k) { return Math.round(LOCS.reduce(function (a, x) { return a + x.perf[k]; }, 0) / LOCS.length); }) }, from);
  var d = l.perf[NOW] - l.perf[startIdx];
  var h = '<h2 style="' + FJK + 'margin:0 0 4px;font-size:24px;font-weight:700;letter-spacing:-0.014em;padding-right:48px">' + l.name + '</h2><p style="margin:0 0 18px;font-size:14px;color:' + C.muted + '">' + (STATE_NAMES[l.st] || l.st) + ' · Performance over time</p>';
  h += '<div style="display:flex;flex-wrap:wrap;align-items:flex-end;justify-content:space-between;gap:12px;margin-bottom:12px"><div style="display:flex;align-items:flex-end;gap:10px"><span style="' + RUB + 'font-size:44px;font-weight:600;line-height:1">' + l.perf[NOW] + '%</span><span style="padding-bottom:6px">' + chipHtml(d, ' pts') + '</span><span style="padding-bottom:8px;font-size:13px;color:' + C.muted + '">vs ' + STOPS[startIdx].date + '</span></div>' + seg(KEYS.map(function (k) { return [k, STOPS[k].label.replace(/ ago$/, '')]; }).reverse(), startIdx, 'data-mp') + '</div>';
  h += '<div style="position:relative;height:260px;border-radius:12px;background:#fff;box-shadow:inset 0 0 0 1px rgba(0,94,157,0.15);padding:16px 16px 8px"><canvas aria-label="Performance chart" role="img"></canvas></div>';
  h += '<div style="display:flex;flex-wrap:wrap;gap:16px;margin:10px 0 22px;font-size:12px;color:' + C.muted + '"><span style="display:flex;align-items:center;gap:6px"><span style="width:14px;height:3px;border-radius:2px;background:' + C.navy + '"></span>' + l.name + '</span><span style="display:flex;align-items:center;gap:6px"><span style="width:14px;height:0;border-top:2px dashed #9AB0C2"></span>Network average</span></div>';
  h += '<h3 style="' + FJK + 'margin:0 0 10px;font-size:16px;font-weight:700">Status history</h3><div style="display:flex;flex-wrap:wrap;align-items:center;gap:8px">' + STOPS.map(function (st, k) { return (k ? '<span style="color:' + C.muted + '">→</span>' : '') + '<span style="display:flex;flex-direction:column;gap:4px;align-items:flex-start"><span style="font-size:11px;color:' + C.muted + '">' + st.label + '</span>' + badge(l.hist[k]) + '</span>'; }).join('') + '</div>';
  mscroll.innerHTML = h;
  mscroll.querySelectorAll('[data-mp]').forEach(function (b) { b.onclick = function () { mState.k = +b.dataset.mp; renderM(); }; });
  var cv = mscroll.querySelector('canvas');
  loadChart().then(function (Chart) {
    if (chart) chart.destroy();
    chart = new Chart(cv, {
      type: 'line',
      data: { labels: pts.map(function (p) { return fmt(p.d); }), datasets: [
        { label: l.name, data: pts.map(function (p) { return p.v; }), borderColor: C.navy, backgroundColor: C.navy, borderWidth: 2.6, pointRadius: 0, pointHoverRadius: 4, tension: 0.3 },
        { label: 'Network average', data: avg.map(function (p) { return p.v; }), borderColor: '#9AB0C2', backgroundColor: '#9AB0C2', borderWidth: 1.8, borderDash: [4, 4], pointRadius: 0, pointHoverRadius: 3, tension: 0.3 }
      ] },
      options: {
        responsive: true, maintainAspectRatio: false, animation: { duration: 250 }, interaction: { mode: 'index', intersect: false },
        plugins: { legend: { display: false }, tooltip: { backgroundColor: '#fff', borderColor: 'rgba(0,94,157,0.18)', borderWidth: 1, titleColor: C.navy, bodyColor: C.navy, padding: 10, cornerRadius: 10, boxWidth: 10, boxHeight: 3, titleFont: { family: 'Plus Jakarta Sans', weight: '700', size: 12 }, bodyFont: { family: 'Inter', size: 12 }, callbacks: { label: function (c) { return ' ' + c.dataset.label + '   ' + c.parsed.y + '%'; } } } },
        scales: {
          x: { grid: { display: false }, border: { color: C.line }, ticks: { color: C.muted, font: { family: 'Inter', size: 11 }, maxRotation: 0, autoSkipPadding: 16 } },
          y: { min: 0, max: 100, grid: { color: C.line }, border: { display: false }, ticks: { color: C.muted, font: { family: 'Rubik', size: 11 }, stepSize: 25, callback: function (v) { return v + '%'; } } }
        }
      }
    });
  });
}
function renderAll() { rangeA = 0; rangeB = NOW; mapIdx = NOW; renderPeriod(); renderCards(); renderSC(); renderTimeline(); paintMap(); paintLeaderboard(); }
var src = document.getElementById('network-data');
if (src) { setData(JSON.parse(src.textContent)); renderAll(); }
window.SharkNetwork = { setData: function (d) { setData(d); renderAll(); } };
