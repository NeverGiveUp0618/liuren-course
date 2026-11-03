/* 六壬神课（原名六壬课程，2026-10-22 改名）· 路由 / 渲染 / 起盘台 / 搜索 / 阅读位置
   ⚠️ 内容全在 data/*.js（由 build.py 从 content/*.md 生成），本文件不放内容。 */
'use strict';
var $ = function (s, r) { return (r || document).querySelector(s); };
var $$ = function (s, r) { return [].slice.call((r || document).querySelectorAll(s)); };
var M = window.DATA_META || { counts: {}, plan: [], list: [] };

/* 占断八门入站自检：只在当前页面内放行，刷新后必须重新作答。 */
(function initEntryGate() {
  var order = ['先锋门', '直事门', '外事门', '内事门', '发端门', '移易门', '归计门', '变体门'];
  var gate = $('#entryGate');
  if (!gate) return;
  var card = $('.entry-gate-card', gate), opts = $('#entryGateOptions'), msg = $('#entryGateMsg');
  var progress = $('#entryGateProgress'), at = 0, locked = false;
  document.body.classList.add('entry-locked');
  function reshuffleOptions() {
    var before = $$('.entry-gate-option', gate), old = before.map(function (x) { return x.textContent; }).join('|');
    var next = before.slice(), tries = 0, i, j, t;
    do {
      for (i = next.length - 1; i > 0; i--) { j = Math.floor(Math.random() * (i + 1)); t = next[i]; next[i] = next[j]; next[j] = t; }
    } while (next.map(function (x) { return x.textContent; }).join('|') === old && ++tries < 8);
    if (next.length > 1 && next.map(function (x) { return x.textContent; }).join('|') === old) { t = next[0]; next[0] = next[1]; next[1] = t; }
    next.forEach(function (x) { opts.appendChild(x); });
  }
  order.forEach(function (_, i) {
    var s = document.createElement('i'); s.className = 'entry-gate-step';
    s.setAttribute('aria-label', '第' + (i + 1) + '门'); progress.appendChild(s);
  });
  order.forEach(function (name) {
    var b = document.createElement('button'); b.type = 'button'; b.className = 'entry-gate-option'; b.textContent = name;
    b.onclick = function () {
      if (locked || b.disabled) return;
      if (name !== order[at]) {
        locked = true; card.classList.add('wrong'); msg.textContent = '顺序不对，重新从先锋门开始';
        setTimeout(function () {
          at = 0; locked = false; card.classList.remove('wrong');
          $$('.entry-gate-step', gate).forEach(function (x) { x.classList.remove('on'); });
          $$('.entry-gate-option', gate).forEach(function (x) { x.disabled = false; x.classList.remove('picked'); });
          reshuffleOptions(); msg.textContent = '已重新打乱，现在请选择第 1 门';
        }, 650);
        return;
      }
      b.disabled = true; b.classList.add('picked');
      $$('.entry-gate-step', gate)[at].classList.add('on'); at += 1;
      if (at === order.length) {
        locked = true; msg.textContent = '顺序正确，进入六壬神课'; gate.classList.add('done');
        setTimeout(function () { gate.hidden = true; document.body.classList.remove('entry-locked'); }, 300);
      } else msg.textContent = '正确，请选择第 ' + (at + 1) + ' 门';
    };
    opts.appendChild(b);
  });
  reshuffleOptions();
})();

var K = {
  read: 'liuren_course_read', last: 'liuren_course_last', pos: 'liuren_course_pos',
  basicread: 'liuren_basic_course_read', basicpos: 'liuren_basic_course_pos',
  counts: 'liuren_course_counts', theme: 'liuren_course_theme',
  progopen: 'liuren_course_progopen',
  qseen: 'liuren_course_qseen', qopen: 'liuren_course_qopen',
  mfseen: 'liuren_course_mfseen', tjseen: 'liuren_course_tjseen'
};
// ⚠️ 这个项目原本没有 esc——课例的标题/占类是从 md 抄来的纯文本，
//    但插进 innerHTML 前照样得转义，别图省事直接拼。
function esc(t) {
  return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}
function load(k, d) { try { return JSON.parse(localStorage.getItem(k)) || d; } catch (e) { return d; } }
function save(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }

/* 案例圆点延迟 5 分钟再点亮：误触进入、立刻返回、快速翻页都不算读过。 */
var seenTimer = null;
function markSeenLater(storageKey, itemKey, screen, routeId) {
  clearTimeout(seenTimer);
  var delay = Number(window.__READ_DELAY_MS) || 5 * 60 * 1000;
  seenTimer = setTimeout(function () {
    seenTimer = null;
    if (cur.scr !== screen || String(cur.id) !== String(routeId) || document.hidden) return;
    var seen = load(storageKey, {});
    if (!seen[itemKey]) { seen[itemKey] = Date.now(); save(storageKey, seen); }
  }, delay);
}

/* 课程“已读”也要防误触：必须在同一课前台累计停留满 5 分钟，且阅读位置
   到达 90%，两个条件同时满足才写成完成。五分钟以前仍记录阅读位置，但最多
   记到 89%，这样快速拖到底不会立刻点亮“已读”。切课后重新计时。 */
var lessonReadGate = { timer: null, screen: '', id: '', key: '', ready: false,
                       elapsed: 0, started: 0, maxPct: 0 };
function lessonReadDelay() { return Number(window.__READ_DELAY_MS) || 5 * 60 * 1000; }
function saveLessonPct(pct) {
  var g = lessonReadGate;
  if (!g.key || !g.id || cur.scr !== g.screen || String(cur.id) !== String(g.id)) return;
  g.maxPct = Math.max(g.maxPct, pct);
  var shown = g.ready ? g.maxPct : Math.min(89, g.maxPct);
  var r = load(g.key, {});
  if (shown > (r[g.id] || 0)) { r[g.id] = shown; save(g.key, r); }
}
function finishLessonReadDelay() {
  var g = lessonReadGate;
  g.timer = null;
  if (cur.scr !== g.screen || String(cur.id) !== String(g.id) || document.hidden) return;
  g.elapsed = lessonReadDelay(); g.started = 0; g.ready = true;
  saveLessonPct(g.maxPct);
}
function resumeLessonReadDelay() {
  var g = lessonReadGate;
  if (!g.id || g.ready || g.timer || document.hidden || cur.scr !== g.screen || String(cur.id) !== String(g.id)) return;
  g.started = Date.now();
  g.timer = setTimeout(finishLessonReadDelay, Math.max(0, lessonReadDelay() - g.elapsed));
}
function pauseLessonReadDelay() {
  var g = lessonReadGate;
  if (g.started) { g.elapsed += Date.now() - g.started; g.started = 0; }
  clearTimeout(g.timer); g.timer = null;
}
function startLessonReadDelay(screen, id, key) {
  pauseLessonReadDelay();
  var old = load(key, {})[id] || 0;
  lessonReadGate = { timer: null, screen: screen, id: id, key: key,
                     ready: old >= 90, elapsed: 0, started: 0, maxPct: old };
  resumeLessonReadDelay();
}
function stopLessonReadDelay() {
  pauseLessonReadDelay();
  lessonReadGate = { timer: null, screen: '', id: '', key: '', ready: false,
                     elapsed: 0, started: 0, maxPct: 0 };
}
document.addEventListener('visibilitychange', function () {
  if (document.hidden) pauseLessonReadDelay(); else resumeLessonReadDelay();
});

/* ── 课例编号迁移（一次性）────────────────────────────────
   2026-08-25 把课例号按占类重排成每类连续（求财 1-24、求官 25-46…），
   ⚠️ qseen/qopen 是**按例号存的**，不迁移的话「看过/展开过」的记录会全部错位。
   OLD[i] ＝ 新号 i+1 对应的旧号；跑过一次就打上 K.qnum 标记，不再重复。
   以后再重排，把 QNUM 往上抬一版并换掉 OLD 即可。 */
K.qnum = 'liuren_course_qnum';
var QNUM = 'v2';
var QOLD = [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,186,187,189,22,23,24,25,26,27,28,29,30,31,32,33,34,155,161,162,163,164,169,170,171,183,35,36,37,38,39,40,41,42,43,44,45,46,127,128,129,130,131,132,133,134,135,136,137,138,139,140,141,142,143,47,48,49,50,51,52,53,54,55,56,57,58,59,60,61,62,179,180,181,63,64,65,66,67,68,69,70,71,72,73,74,75,76,77,78,79,80,81,82,83,84,85,86,87,88,89,90,91,145,146,150,151,152,153,92,93,94,95,96,97,98,99,100,101,182,184,185,102,103,104,105,106,107,144,147,148,149,108,109,110,111,112,113,114,115,116,117,174,175,176,118,119,120,121,122,123,124,125,126,188,154,156,157,158,159,160,165,166,167,168,172,173,177,178];
(function migrateQuizNums() {
  try {
    if (localStorage.getItem(K.qnum) === QNUM) return;
    var o2n = {};
    for (var i = 0; i < QOLD.length; i++) o2n[QOLD[i]] = i + 1;
    [K.qseen, K.qopen].forEach(function (k) {
      var v = load(k, null);
      if (!v) return;
      var out = {};
      Object.keys(v).forEach(function (n) { var nn = o2n[+n]; if (nn) out[nn] = v[n]; });
      save(k, out);
    });
    localStorage.setItem(K.qnum, QNUM);
  } catch (e) {}
})();

/* ── 按需加载 data-course.js ───────────────────────────────
   ⚠️ 必须带 ?v=：微信 X5 会无视 query 按路径缓存，但其余浏览器靠它拿到新内容；
   只 bump sw 版本救不了这个按需加载的大文件。 */
var VER = encodeURIComponent(M.built || '0');
/* ⚠️ 2026-10-22：微信 X5 无视 ?v=、按**路径**缓存，用户在微信里整页都是旧版（截图为证）。
   所以 build.py 把静态文件复制进 b/<内容哈希>/，index.html 改指向那里，并在页面里设 window.ASSET。
   按需加载的文件也得走这个前缀，否则数据包照样被 X5 钉在旧版。本地直接开源文件时 ASSET 为空。 */
var ASSET = window.ASSET || '';
var _loading = null;
function needCourse() {
  if (window.DATA_COURSE) return Promise.resolve(window.DATA_COURSE);
  if (_loading) return _loading;
  _loading = new Promise(function (res, rej) {
    var s = document.createElement('script');
    s.src = ASSET + 'data/data-course.js?v=' + VER;
    s.onload = function () { res(window.DATA_COURSE); };
    s.onerror = function () { _loading = null; rej(new Error('课文加载失败')); };
    document.head.appendChild(s);
  });
  return _loading;
}
var _basicLoading = null;
function needBasicCourse() {
  if (window.DATA_BASIC_COURSE) return Promise.resolve(window.DATA_BASIC_COURSE);
  if (_basicLoading) return _basicLoading;
  _basicLoading = new Promise(function (res, rej) {
    var s = document.createElement('script');
    s.src = ASSET + 'data/data-basic-course.js?v=' + VER;
    s.onload = function () { res(window.DATA_BASIC_COURSE); };
    s.onerror = function () { _basicLoading = null; rej(new Error('初中级课文加载失败')); };
    document.head.appendChild(s);
  });
  return _basicLoading;
}
var _refLoading = null;
function needRef() {
  if (window.DATA_REF) return Promise.resolve(window.DATA_REF);
  if (_refLoading) return _refLoading;
  _refLoading = new Promise(function (res, rej) {
    var el = document.createElement('script');
    var retried = false;
    el.src = ASSET + 'data/data-ref.js?v=' + VER;      // ⚠️ 同 data-course.js，按需加载必须带 ?v=
    el.onload = function () { res(window.DATA_REF); };
    el.onerror = function () {
      // 用户可能仍拿着微信缓存的旧 index/app，而旧哈希目录已过期。此时退回
      // 根目录的最新版数据，避免明明联网却显示“网络失败”。
      if (!retried && ASSET) {
        retried = true;
        el.src = 'data/data-ref.js?v=' + VER + '&fallback=1';
        return;
      }
      _refLoading = null; rej(new Error('速查表加载失败'));
    };
    document.head.appendChild(el);
  });
  return _refLoading;
}
var _mindmapLoading = null;
function needMindmap() {
  if (window.DATA_MINDMAP) return Promise.resolve(window.DATA_MINDMAP);
  if (_mindmapLoading) return _mindmapLoading;
  _mindmapLoading = new Promise(function (res, rej) {
    var el = document.createElement('script'), retried = false;
    el.src = ASSET + 'data/data-mindmap.js?v=' + VER;
    el.onload = function () { res(window.DATA_MINDMAP); };
    el.onerror = function () {
      if (!retried && ASSET) { retried = true; el.src = 'data/data-mindmap.js?v=' + VER + '&fallback=1'; return; }
      _mindmapLoading = null; rej(new Error('导图加载失败'));
    };
    document.head.appendChild(el);
  });
  return _mindmapLoading;
}
/* 总览导图：根→5 大块→节点；节点点开看关键词，再点「进入」跳课文。 */
function mmGo(v) { show('lesson', v); }
/* 导图（图形版）：左→右的树，带连线；可拖动、双指/滚轮缩放；点节点展开关键词。 */
function renderMindmap(box, mm) {
  if (!mm || !mm.branches) { box.innerHTML = ''; return; }
  box.innerHTML = '<div class="mm-bar"><button class="on" data-m="g">图</button><button data-m="l">列表</button>' +
    '<span class="mm-tip">拖动平移 · 双指/滚轮缩放 · 点节点看要点</span><button class="mm-fit">复位</button></div>' +
    '<div class="mm-view"><svg class="mm-svg"></svg></div><div class="mm-list" hidden></div>';
  var view = $('.mm-view', box), svg = $('.mm-svg', box), list = $('.mm-list', box);
  renderMindmapList(list, mm);
  $$('.mm-bar [data-m]', box).forEach(function (b) {
    b.onclick = function () {
      $$('.mm-bar [data-m]', box).forEach(function (x) { x.classList.toggle('on', x === b); });
      view.hidden = b.dataset.m !== 'g'; list.hidden = b.dataset.m === 'g';
    };
  });
  var NS = 'http://www.w3.org/2000/svg', open = {}, T = { x: 0, y: 0, k: 1 }, fitted = false;
  function el(tag, attrs, txt) {
    var e = document.createElementNS(NS, tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (txt != null) e.textContent = txt;
    return e;
  }
  function tw(s, fs) { var w = 0; for (var i = 0; i < s.length; i++) w += s.charCodeAt(i) > 255 ? fs : fs * 0.58; return w; }
  function links(n) {
    var r = [];
    [['go', n.go], ['go2', n.go2]].forEach(function (p, i) {
      if (p[1] == null || p[1] === '') return;
      r.push({ v: p[1], t: (typeof p[1] === 'number') ? '进入第 ' + p[1] + ' 章 ›' : '进入' + (n.go2 ? (i ? '（下）' : '（上）') : '') + ' ›' });
    });
    return r;
  }
  function wrap(s, n) { var o = []; s = s.replace(/：/, '：\n').split('\n'); s.forEach(function (p) { for (var i = 0; i < p.length; i += n) o.push(p.slice(i, i + n)); }); return o; }
  function draw() {
    svg.innerHTML = '';
    var g = el('g', {}), FS = 13, KH = 26, GAP = 40;
    // 1) 建树：根→大块→节点→（要点 / 章节小标题→更细） ；open 控制展开
    function build() {
      var root = { t: mm.title, d: 0, ch: [], key: 'r' };
      mm.branches.forEach(function (b, bi) {
        var B = { t: b.t, sub: b.range, d: 1, c: bi % 5, key: 'b' + bi, ch: [], par: root }; root.ch.push(B);
        b.nodes.forEach(function (n, ni) {
          var key = bi + '-' + ni, N = { t: n.t, d: 2, c: bi % 5, key: key, ch: [], par: B, tog: true, on: !!open[key] };
          B.ch.push(N);
          if (!N.on) return;
          n.kw.forEach(function (k) { N.ch.push({ t: k, d: 3, c: bi % 5, kind: 'kw', ch: [], par: N }); });
          (n.sec || []).forEach(function (s, si) {
            var sk = key + '/' + si, S = { t: s.t, d: 3, c: bi % 5, kind: 'sec', key: sk, ch: [], par: N, tog: !!(s.sub && s.sub.length), on: !!open[sk] };
            N.ch.push(S);
            if (S.on) s.sub.forEach(function (u) { S.ch.push({ t: u, d: 4, c: bi % 5, kind: 'kw', ch: [], par: S }); });
          });
          links(n).forEach(function (l) { N.ch.push({ t: l.t, d: 3, c: bi % 5, kind: 'go', v: l.v, ch: [], par: N }); });
        });
      });
      return root;
    }
    var root = build(), maxd = {};
    var FSZ = [15, 14, 13, 12, 12];
    (function walk(n) { n.w = tw(n.t, FSZ[n.d]) + (n.d === 0 ? 24 : n.d < 3 ? 24 : 18); maxd[n.d] = Math.max(maxd[n.d] || 0, n.w); n.ch.forEach(walk); })(root);
    var xs = [0];
    for (var d = 1; d <= 4; d++) xs[d] = xs[d - 1] + (maxd[d - 1] || 0) + GAP;
    var y = 0;
    (function place(n) {
      if (!n.ch.length) { var h = n.d <= 2 ? 40 : KH; n.y = y + h / 2; y += h; if (n.d === 1) y += 0; return; }
      n.ch.forEach(place);
      n.y = (n.ch[0].y + n.ch[n.ch.length - 1].y) / 2;
      if (n.d === 1) y += 14;
    })(root);
    var lines = [], nodes = [];
    (function coll(n) { n.ch.forEach(function (c) { lines.push([n, c]); coll(c); }); nodes.push(n); })(root);
    lines.forEach(function (p) {
      var a = p[0], b = p[1], ax = xs[a.d] + maxd[a.d] * 0 + a.w, bx = xs[b.d], m = (ax + bx) / 2, c = b.c == null ? 0 : b.c;
      g.appendChild(el('path', { d: 'M' + ax + ',' + a.y + 'C' + m + ',' + a.y + ' ' + m + ',' + b.y + ' ' + bx + ',' + b.y, class: 'mm-ln', style: '--c:var(--mm' + c + ')' }));
    });
    nodes.forEach(function (n) {
      var x = xs[n.d], c = n.c == null ? 0 : n.c, st = '--c:var(--mm' + c + ')', gg = el('g', {});
      if (n.d === 0) {
        var ls = wrap(n.t, 9), rh = ls.length * 20 + 16, rw = 0; ls.forEach(function (l) { rw = Math.max(rw, tw(l, 15)); });
        n.w = rw + 24;
        gg.appendChild(el('rect', { x: x, y: n.y - rh / 2, width: n.w, height: rh, rx: 8, class: 'mm-rt' }));
        ls.forEach(function (l, i) { gg.appendChild(el('text', { x: x + n.w / 2, y: n.y - rh / 2 + 23 + i * 20, 'text-anchor': 'middle', class: 'mm-t0' }, l)); });
      } else if (n.d === 1) {
        gg.appendChild(el('rect', { x: x, y: n.y - 17, width: n.w, height: 34, rx: 8, class: 'mm-br', style: st }));
        gg.appendChild(el('text', { x: x + n.w / 2, y: n.y + 1, 'text-anchor': 'middle', class: 'mm-t1' }, n.t));
        gg.appendChild(el('text', { x: x + n.w / 2, y: n.y + 28, 'text-anchor': 'middle', class: 'mm-t3' }, n.sub));
      } else if (n.d === 2) {
        gg.setAttribute('class', 'mm-nd' + (n.on ? ' on' : '')); gg.style.cursor = 'pointer';
        gg.appendChild(el('rect', { x: x, y: n.y - 15, width: n.w, height: 30, rx: 8, class: 'mm-no', style: st }));
        gg.appendChild(el('text', { x: x + n.w / 2, y: n.y + 5, 'text-anchor': 'middle', class: 'mm-t2' }, n.t));
        gg.addEventListener('click', function () { if (moved) return; open[n.key] = !open[n.key]; draw(); });
      } else {
        var cls = n.kind === 'go' ? 'mm-gob' : n.kind === 'sec' ? 'mm-sec' + (n.on ? ' on' : '') : 'mm-kw';
        gg.appendChild(el('rect', { x: x, y: n.y - 11, width: n.w, height: 22, rx: 11, class: cls, style: st }));
        gg.appendChild(el('text', { x: x + 9, y: n.y + 4, class: n.kind === 'go' ? 'mm-t5' : (n.kind === 'sec' && n.on ? 'mm-t5' : 'mm-t4') }, n.t));
        if (n.kind === 'go') { gg.style.cursor = 'pointer'; gg.addEventListener('click', function () { if (!moved) mmGo(n.v); }); }
        if (n.kind === 'sec' && n.tog) { gg.style.cursor = 'pointer'; gg.addEventListener('click', function () { if (moved) return; open[n.key] = !open[n.key]; draw(); }); }
      }
      g.appendChild(gg);
    });
    svg.appendChild(g);
    var right = 0; nodes.forEach(function (n) { right = Math.max(right, xs[n.d] + n.w); });
    svg._g = g; svg._bb = { w: right, h: y, fitW: xs[3] };
    apply();
  }
  function apply() { if (svg._g) svg._g.setAttribute('transform', 'translate(' + T.x + ',' + T.y + ') scale(' + T.k + ')'); }
  function fit() {
    var W = view.clientWidth || 340, H = view.clientHeight || 460, bb = svg._bb;
    var k = Math.min(1, (W - 16) / (bb.fitW || bb.w), (H - 16) / bb.h);   // 默认只摆到「要点」列之前，宽度按前三列估
    T.k = Math.max(0.35, k); T.x = 8; T.y = 8; apply();
  }
  var moved = false, pts = {}, last = null;
  function dist() { var a = Object.keys(pts).map(function (k) { return pts[k]; }); return Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y); }
  function zoomAt(cx, cy, f) {
    var r = view.getBoundingClientRect(), px = cx - r.left, py = cy - r.top;
    var nk = Math.max(0.25, Math.min(3, T.k * f)); f = nk / T.k;
    T.x = px - (px - T.x) * f; T.y = py - (py - T.y) * f; T.k = nk; apply();
  }
  view.addEventListener('pointerdown', function (e) {
    pts[e.pointerId] = { x: e.clientX, y: e.clientY }; last = { x: e.clientX, y: e.clientY }; moved = false;
    if (Object.keys(pts).length === 2) view._d = dist();
  });
  view.addEventListener('pointermove', function (e) {
    if (!pts[e.pointerId]) return;
    var n = Object.keys(pts).length;
    pts[e.pointerId] = { x: e.clientX, y: e.clientY };
    if (n === 2) {
      var d = dist(); if (view._d) { var a = Object.keys(pts).map(function (k) { return pts[k]; }); zoomAt((a[0].x + a[1].x) / 2, (a[0].y + a[1].y) / 2, d / view._d); }
      view._d = d; moved = true; return;
    }
    var dx = e.clientX - last.x, dy = e.clientY - last.y;
    if (!moved && Math.hypot(dx, dy) < 4) return;
    moved = true; T.x += dx; T.y += dy; last = { x: e.clientX, y: e.clientY }; apply();
  });
  function up(e) { delete pts[e.pointerId]; view._d = 0; last = { x: e.clientX, y: e.clientY }; setTimeout(function () { if (!Object.keys(pts).length) moved = false; }, 30); }
  view.addEventListener('pointerup', up); view.addEventListener('pointercancel', up); view.addEventListener('pointerleave', up);
  view.addEventListener('wheel', function (e) { e.preventDefault(); zoomAt(e.clientX, e.clientY, e.deltaY < 0 ? 1.12 : 1 / 1.12); }, { passive: false });
  $('.mm-fit', box).onclick = fit;
  draw();
  // 容器首次可见后再适配（details 折叠时宽度为 0）
  var tries = 0;
  (function wait() { if (view.clientWidth > 0 || tries++ > 20) { if (!fitted) { fitted = true; fit(); } } else setTimeout(wait, 150); })();
}

function renderMindmapList(box, mm) {
  if (!mm || !mm.branches) { box.innerHTML = ''; return; }
  var html = '<div class="mm-root"><b>' + esc(mm.title) + '</b><p>' + esc(mm.intro) + '</p></div>';
  mm.branches.forEach(function (b, i) {
    html += '<div class="mm-b mm-c' + (i % 5) + ' open"><button class="mm-bh"><b>' + esc(b.t) + '</b><span>' + esc(b.range) + '</span></button><div class="mm-ns">';
    b.nodes.forEach(function (n) {
      html += '<div class="mm-n"><button class="mm-nt">' + esc(n.t) + '</button><div class="mm-d"><span>' +
        n.kw.map(esc).join('</span><span>') + '</span><button class="mm-go" data-go="' + n.go + '">进入' + (n.go2 ? '（上）' : '') + ' ›</button>' +
        (n.go2 ? '<button class="mm-go" data-go="' + n.go2 + '">进入（下） ›</button>' : '') + '</div></div>';
    });
    html += '</div></div>';
  });
  box.innerHTML = html;
  $$('.mm-bh', box).forEach(function (h) { h.onclick = function () { h.parentNode.classList.toggle('open'); }; });
  $$('.mm-nt', box).forEach(function (h) { h.onclick = function () { h.parentNode.classList.toggle('open'); }; });
  $$('.mm-go', box).forEach(function (g) { g.onclick = function () { show('lesson', g.dataset.go); }; });
}
var _reviewLoading = null;
function needReview() {
  if (window.DATA_REVIEW) return Promise.resolve(window.DATA_REVIEW);
  if (_reviewLoading) return _reviewLoading;
  _reviewLoading = new Promise(function (res, rej) {
    var el = document.createElement('script'), retried = false;
    el.src = ASSET + 'data/data-review.js?v=' + VER;
    el.onload = function () { res(window.DATA_REVIEW); };
    el.onerror = function () {
      if (!retried && ASSET) { retried = true; el.src = 'data/data-review.js?v=' + VER + '&fallback=1'; return; }
      _reviewLoading = null; rej(new Error('复习卡加载失败'));
    };
    document.head.appendChild(el);
  });
  return _reviewLoading;
}
/* 十一步断课流程（第 17 课）：复习时当目录用，点每一步直达对应课。 */
var FLOW = [
  ['起盘', [['①定四柱', 'L01'], ['②定月将、起天盘', 'L02'], ['③定贵人、排十二天将', 'L03'], ['④日干寄宫、起四课', 'L04'],
            ['⑤九宗门取三传', 'L05'], ['⑥遁干六亲旬空年命', 'L07']]],
  ['立局', [['⑦立太极点', 'L14'], ['⑧扫七处', 'L13']]],
  ['读事', [['⑨定类神', 'L12'], ['⑩读三传', 'L15']]],
  ['落断', [['⑪定应期', 'L16']]]
];
var RV_TEST = false;   // false＝速览（默认，刷完课程快速过要点）；true＝自测（先遮住答案）
function renderReview(all) {
  var out = $('#refList'), kw = $('#rq').value.trim(), words = kw.split(/\s+/).filter(Boolean);
  var hit = (all || []).filter(function (r) {
    return words.every(function (w) { return (r.title + r.text).indexOf(w) >= 0; });
  });
  var html = '';
  if (!words.length) {
    html += '<details class="rv-flow rv-mm" open><summary>总览导图 · 先有整体思路</summary><div id="mmBox"></div></details>';
    html += '<details class="rv-flow" open><summary>十一步断课流程 · 点一步直达那一课</summary>' + FLOW.map(function (st) {
      return '<div class="rv-stage"><b>' + st[0] + '</b><span>' + st[1].map(function (x) {
        return '<button data-go="' + x[1] + '">' + esc(x[0]) + '</button>'; }).join('') + '</span></div>';
    }).join('') + '</details>';
    html += '<div class="rv-tip"><span><button id="rvMode">' + (RV_TEST ? '改为速览' : '改为自测') + '</button></span>' +
      '<span>' + (RV_TEST ? '先答「问」，再点开看答案' : '速览：问与结论全显示，点开看总表') + '</span><button id="rvAll">全部展开</button></div>';
  }
  if (!hit.length) { out.innerHTML = html + '<p class="muted">没找到。换个词试试。</p>'; return; }
  var cur = '';
  hit.forEach(function (r) {
    var g = r.kind === 'main' ? '大六壬通解课程' : '大六壬初中级课程';
    if (g !== cur) { cur = g; html += '<div class="refpart">' + g + '</div>'; }
    html += '<div class="refi rv"><button class="refh"><b>' + esc(r.title) + '</b></button>' +
      '<div class="rv-q"><i>问</i>' + r.q + '</div>' +
      '<div class="rv-a"><i>答</i>' + r.concl + '</div>' +
      '<div class="refb">' +
      (r.table ? '<div class="rv-t">' + esc(r.tt) + '</div>' + r.table : '') +
      (r.rule ? '<div class="rv-r"><b>' + esc(r.rt) + '</b>' + r.rule + '</div>' : '') +
      '<button class="refj" data-id="' + r.id + '" data-k="' + r.kind + '">到第 ' + r.num + ' 课看全文 ›</button></div></div>';
  });
  out.innerHTML = html;
  out.classList.toggle('rv-test', RV_TEST);
  var mmb = $('#mmBox', out);
  if (mmb) needMindmap().then(function (mm) { renderMindmap(mmb, mm); });
  var md_ = $('#rvMode', out);
  if (md_) md_.onclick = function () { RV_TEST = !RV_TEST; renderReview(all); };
  $$('.rv-stage button', out).forEach(function (b) { b.onclick = function () { show('lesson', b.dataset.go); }; });
  var all_ = $('#rvAll', out);
  if (all_) all_.onclick = function () {
    var open = all_.textContent === '全部展开';
    $$('.refi.rv', out).forEach(function (d) { d.classList.toggle('open', open); });
    all_.textContent = open ? '全部收起' : '全部展开';
  };
  $$('.refi', out).forEach(function (d) {
    var head = d.querySelector('.refh'), q = d.querySelector('.rv-q');
    head.onclick = function () { d.classList.toggle('open'); };
    if (q) q.onclick = head.onclick;
    var j = d.querySelector('.refj');
    if (j) j.onclick = function (e) { e.stopPropagation(); show(j.dataset.k === 'basic' ? 'basiclesson' : 'lesson', j.dataset.id); };
  });
}
var _basicRefLoading = null;
function needBasicRef() {
  if (window.DATA_BASIC_REF) return Promise.resolve(window.DATA_BASIC_REF);
  if (_basicRefLoading) return _basicRefLoading;
  _basicRefLoading = new Promise(function (res, rej) {
    var el = document.createElement('script');
    var retried = false;
    el.src = ASSET + 'data/data-basic-ref.js?v=' + VER;
    el.onload = function () { res(window.DATA_BASIC_REF); };
    el.onerror = function () {
      if (!retried && ASSET) {
        retried = true;
        el.src = 'data/data-basic-ref.js?v=' + VER + '&fallback=1';
        return;
      }
      _basicRefLoading = null; rej(new Error('初中级速查加载失败'));
    };
    document.head.appendChild(el);
  });
  return _basicRefLoading;
}
var _geLoading = null;
function needGe() {
  if (window.DATA_GE) return Promise.resolve(window.DATA_GE);
  if (_geLoading) return _geLoading;
  _geLoading = new Promise(function (res, rej) {
    var el = document.createElement('script');
    el.src = ASSET + 'data/data-ge.js?v=' + VER;      // ⚠️ 按需加载必须带 ?v=
    el.onload = function () { res(window.DATA_GE); };
    el.onerror = function () { _geLoading = null; rej(new Error('格局详解加载失败')); };
    document.head.appendChild(el);
  });
  return _geLoading;
}
var _extraLoading = null;
function needExtra() {
  if (window.DATA_EXTRA) return Promise.resolve(window.DATA_EXTRA);
  if (_extraLoading) return _extraLoading;
  _extraLoading = new Promise(function (res, rej) {
    var el = document.createElement('script');
    el.src = ASSET + 'data/data-extra.js?v=' + VER;   // ⚠️ 按需加载必须带 ?v=
    el.onload = function () { res(window.DATA_EXTRA); };
    el.onerror = function () { _extraLoading = null; rej(new Error('附篇加载失败')); };
    document.head.appendChild(el);
  });
  return _extraLoading;
}
var _xfLoading = null;
function needXf() {
  if (window.DATA_XF) return Promise.resolve(window.DATA_XF);
  if (_xfLoading) return _xfLoading;
  _xfLoading = new Promise(function (res, rej) {
    var el = document.createElement('script');
    el.src = ASSET + 'data/data-xf.js?v=' + VER;      // ⚠️ 按需加载必须带 ?v=
    el.onload = function () { res(window.DATA_XF); };
    el.onerror = function () { _xfLoading = null; rej(new Error('象法速查加载失败')); };
    document.head.appendChild(el);
  });
  return _xfLoading;
}
var _bifaLoading = null;
function needBifa() {
  if (window.DATA_BIFA) return Promise.resolve(window.DATA_BIFA);
  if (_bifaLoading) return _bifaLoading;
  _bifaLoading = new Promise(function (res, rej) {
    var el = document.createElement('script');
    el.src = ASSET + 'data/data-bifa.js?v=' + VER;   // ⚠️ 按需加载必须带 ?v=（1.4MB，别进首屏）
    el.onload = function () { res(window.DATA_BIFA); };
    el.onerror = function () { _bifaLoading = null; rej(new Error('毕法赋加载失败')); };
    document.head.appendChild(el);
  });
  return _bifaLoading;
}
var _jsLoading = null;
function needJinsuo() {
  if (window.DATA_JINSUO) return Promise.resolve(window.DATA_JINSUO);
  if (_jsLoading) return _jsLoading;
  _jsLoading = new Promise(function (res, rej) {
    var el = document.createElement('script');
    el.src = ASSET + 'data/data-jinsuo.js?v=' + VER;   // ⚠️ 按需加载必须带 ?v=
    el.onload = function () { res(window.DATA_JINSUO); };
    el.onerror = function () { _jsLoading = null; rej(new Error('金锁玉匙加载失败')); };
    document.head.appendChild(el);
  });
  return _jsLoading;
}
var _bodyLoading = {};
/* ⭐ 2026-10-23：课例、毕法赋的正文按块拆进 data/q/、data/bf/，点开哪条才加载哪块。
   列表文件里只有标题和检索文字，所以首次进列表快得多。 */
function withBody(kind, it, cb) {
  var B = window.BODY || {}, k = kind + (it.id || it.n);
  if (it.html || B[k]) { cb(it.html || B[k]); return; }
  var key = kind + '/' + it.c;
  if (!_bodyLoading[key]) {
    _bodyLoading[key] = new Promise(function (res, rej) {
      var el = document.createElement('script');
      el.src = ASSET + 'data/' + key + '.js?v=' + VER;   // ⚠️ 按需加载必须带 ?v=
      el.onload = res;
      el.onerror = function () { _bodyLoading[key] = null; rej(new Error('正文加载失败')); };
      document.head.appendChild(el);
    });
  }
  _bodyLoading[key].then(function () { cb((window.BODY || {})[k] || ''); });
}
var _quizLoading = null;
function needQuiz() {
  if (window.DATA_QUIZ) return Promise.resolve(window.DATA_QUIZ);
  if (_quizLoading) return _quizLoading;
  _quizLoading = new Promise(function (res, rej) {
    var el = document.createElement('script');
    el.src = ASSET + 'data/data-quiz.js?v=' + VER;    // ⚠️ 同上，按需加载的大文件必须带 ?v=
    el.onload = function () { res(window.DATA_QUIZ); };
    el.onerror = function () { _quizLoading = null; rej(new Error('课例加载失败')); };
    document.head.appendChild(el);
  });
  return _quizLoading;
}
var _mufuLoading = null;
function needMufu() {
  if (window.DATA_MUFU) return Promise.resolve(window.DATA_MUFU);
  if (_mufuLoading) return _mufuLoading;
  _mufuLoading = new Promise(function (res, rej) {
    var el = document.createElement('script');
    el.src = ASSET + 'data/data-mufu.js?v=' + VER;
    el.onload = function () { res(window.DATA_MUFU); };
    el.onerror = function () { _mufuLoading = null; rej(new Error('王牧夫案例加载失败')); };
    document.head.appendChild(el);
  });
  return _mufuLoading;
}
var _tongjieLoading = null;
function needTongjie() {
  if (window.DATA_TONGJIE) return Promise.resolve(window.DATA_TONGJIE);
  if (_tongjieLoading) return _tongjieLoading;
  _tongjieLoading = new Promise(function (res, rej) {
    var el = document.createElement('script');
    el.src = ASSET + 'data/data-tongjie.js?v=' + VER;
    el.onload = function () { res(window.DATA_TONGJIE); };
    el.onerror = function () { _tongjieLoading = null; rej(new Error('通解案例加载失败')); };
    document.head.appendChild(el);
  });
  return _tongjieLoading;
}
var _tongjieSearchLoading = null;
function needTongjieSearch() {
  if (window.DATA_TONGJIE_SEARCH) return Promise.resolve(window.DATA_TONGJIE_SEARCH);
  if (_tongjieSearchLoading) return _tongjieSearchLoading;
  _tongjieSearchLoading = new Promise(function (res, rej) {
    var el = document.createElement('script');
    el.src = ASSET + 'data/data-tongjie-search.js?v=' + VER;
    el.onload = function () { res(window.DATA_TONGJIE_SEARCH); };
    el.onerror = function () { _tongjieSearchLoading = null; rej(new Error('通解全文索引加载失败')); };
    document.head.appendChild(el);
  });
  return _tongjieSearchLoading;
}
function lessonById(id) {
  var a = window.DATA_COURSE || [];
  for (var i = 0; i < a.length; i++) if (a[i].id === id) return a[i];
  return null;
}
function basicLessonById(id) {
  var a = window.DATA_BASIC_COURSE || [];
  for (var i = 0; i < a.length; i++) if (a[i].id === id) return a[i];
  return null;
}

/* ── 路由 ───────────────────────────────────────────────
   套壳 view.html 的 iframe 与顶层共享同一条 session history。若本站不碰
   history，读到课文深处一次侧滑会直接退出整个 App 回导航首页。
   所以：前进 pushState，回到栈上已有的屏用 history.go(-n) 折叠，
   popstate 只移动指针**绝不截断栈**（截断会让 forward 找不到原来那屏）。 */
var stack = [], pos = 0, cur = { scr: 'home', id: null };
var TITLES = { home: '六壬神课', courses: '课程', course: '大六壬通解课程', lesson: '',
               basiccourse: '大六壬初中级课程', basiclesson: '', outline: '学习路线',
               lab: '起盘台', search: '搜索', ref: '速查',
               qlist: '课例题库', quiz: '课例',
               mflist: '王牧夫入门案例', mufu: '王牧夫案例',
               tjlist: '大六壬通解案例库', tongjie: '通解案例',
               gelist: '格局详解', ge: '格局',
               bflist: '毕法赋', bifa: '毕法', xflist: '象法速查', extra: '附篇', xarch: '附篇',
               jinsuo: '金锁玉匙' };
var ROOTS = { home: 1, courses: 1, qlist: 1, ref: 1 };
var pendingFind = null;

function _apply(scr, id) {
  if (scr !== 'lesson' && scr !== 'basiclesson') stopLessonReadDelay();
  cur = { scr: scr, id: id };
  $$('.screen').forEach(function (el) { el.classList.remove('active'); });
  var el = $('#s-' + scr);
  if (el) el.classList.add('active');
  $('#btnBack').classList.toggle('on', !ROOTS[scr]);
  $$('.tabbar button').forEach(function (b) { b.classList.toggle('on', b.dataset.tab === scr); });
  $('#fabToc').classList.toggle('on', scr === 'lesson' || scr === 'basiclesson');
  $('#tocMask').classList.remove('on');
  $('#ttl').textContent = TITLES[scr] || '六壬神课';
  RENDER[scr] && RENDER[scr](id);
  if (scr !== 'search') save(K.last, { scr: scr, id: id });
  if (scr !== 'lesson' && scr !== 'basiclesson') window.scrollTo(0, 0);
}
function show(scr, id, find) {
  pendingFind = find || null;
  if (scr === cur.scr && id === cur.id) { if (find) _apply(scr, id); return; }
  for (var k = 0; k <= pos && k < stack.length; k++) {
    if (stack[k].scr === scr && stack[k].id === id) {
      if (k < pos) { history.go(k - pos); return; }
      break;
    }
  }
  stack = stack.slice(0, pos + 1);
  stack.push({ scr: scr, id: id });
  pos = stack.length - 1;
  history.pushState({ i: pos }, '', '');
  _apply(scr, id);
}
window.addEventListener('popstate', function (e) {
  var i = (e.state && typeof e.state.i === 'number') ? e.state.i : 0;
  if (i >= stack.length) i = stack.length - 1;
  if (i < 0) i = 0;
  pos = i;
  var t = stack[i] || { scr: 'home', id: null };
  _apply(t.scr, t.id);
});

/* ── 起盘台引擎（第2、3课的两个动作） ───────────────────── */
var Z = '子丑寅卯辰巳午未申酉戌亥'.split('');
var TJN = ['贵', '蛇', '朱', '合', '勾', '青', '空', '虎', '常', '玄', '阴', '后'];
var TJFULL = { 贵: '天乙贵人', 蛇: '螣蛇', 朱: '朱雀', 合: '六合', 勾: '勾陈', 青: '青龙',
               空: '天空', 虎: '白虎', 常: '太常', 玄: '玄武', 阴: '太阴', 后: '天后' };
var GR_D = { 甲: '丑', 戊: '丑', 庚: '丑', 乙: '子', 己: '子', 丙: '亥', 丁: '亥', 辛: '午', 壬: '巳', 癸: '巳' };
var GR_N = { 甲: '未', 戊: '未', 庚: '未', 乙: '申', 己: '申', 丙: '酉', 丁: '酉', 辛: '寅', 壬: '卯', 癸: '卯' };
var ZHOU = '卯辰巳午未申';          // 昼：卯到申用昼贵〔通解上 p23〕
var SHUN = '亥子丑寅卯辰';          // 贵人临此六位顺行（亥天门、巳地户）
var SHEN = { 子: '神后', 丑: '大吉', 寅: '功曹', 卯: '太冲', 辰: '天罡', 巳: '太乙',
             午: '胜光', 未: '小吉', 申: '传送', 酉: '从魁', 戌: '河魁', 亥: '登明' };
var YJM = { 亥: '正月·雨水后', 戌: '二月·春分后', 酉: '三月·谷雨后', 申: '四月·小满后',
            未: '五月·夏至后', 午: '六月·大暑后', 巳: '七月·处暑后', 辰: '八月·秋分后',
            卯: '九月·霜降后', 寅: '十月·小雪后', 丑: '十一月·冬至后', 子: '十二月·大寒后' };
var CELLS = [['巳',1,1],['午',1,2],['未',1,3],['申',1,4],['酉',2,4],['戌',3,4],
             ['亥',4,4],['子',4,3],['丑',4,2],['寅',4,1],['卯',3,1],['辰',2,1]];
function tianpan(yj, zs) {
  var off = (Z.indexOf(yj) - Z.indexOf(zs) + 12) % 12, m = {};
  Z.forEach(function (d) { m[d] = Z[(Z.indexOf(d) + off) % 12]; });
  return m;
}
function tianjiang(gan, shi, tp) {
  var gr = ZHOU.indexOf(shi) >= 0 ? GR_D[gan] : GR_N[gan];
  var dp = Z.filter(function (d) { return tp[d] === gr; })[0];
  var shun = SHUN.indexOf(dp) >= 0, out = {};
  TJN.forEach(function (n, i) {
    var z = Z[((Z.indexOf(gr) + (shun ? i : -i)) % 12 + 12) % 12];
    out[Z.filter(function (k) { return tp[k] === z; })[0]] = n;
  });
  return { tj: out, gr: gr, dp: dp, shun: shun };
}
function panHTML(tp, tj, mid) {
  return '<div class="panwrap"><div class="pan">' + CELLS.map(function (c) {
    return '<div class="gong" style="grid-row:' + c[1] + ';grid-column:' + c[2] + '">' +
      '<span class="tj">' + (tj[c[0]] || '') + '</span>' +
      '<span class="tp">' + (tp[c[0]] || '') + '</span>' +
      '<span class="dp">' + c[0] + '</span></div>';
  }).join('') + '<div class="panmid">' + (mid || '') + '</div></div></div>';
}

/* ── 各屏渲染 ─────────────────────────────────────────── */
var RENDER = {};

RENDER.home = function () {
  var c = M.counts || {};
  $('#hLesson').textContent = c.lesson || 0;
  $('#hPlan').textContent = c.planned || 0;
  $('#hPan').textContent = c.pan || 0;
  $('#buildInfo').textContent = '内容更新于 ' + (M.built || '');
  var mr = $('#mRef'); if (mr) mr.textContent = c.ref || '—';   // ⚠️ 分母读 counts，别写死
  var mbr = $('#mBasicRef'); if (mbr) mbr.textContent = c.basicRef || '—';
  var mq = $('#mQuiz'); if (mq) mq.textContent = c.quiz || '—';
  var mm = $('#mMufu'); if (mm) mm.textContent = c.mufu || '—';
  var mt = $('#mTongjie'); if (mt) mt.textContent = c.tongjie || '—';
  var mtc = $('#mTongjieCourse'); if (mtc) mtc.textContent = c.lesson || '—';
  var mbc = $('#mBasicCourse'); if (mbc) mbc.textContent = c.basicLesson || '—';
  var mg = $('#mGe'); if (mg) mg.textContent = c.ge || '—';
  var mb = $('#mBifa'); if (mb) mb.textContent = c.bifa || '—';
  var mx = $('#mXf'); if (mx) mx.textContent = c.xf || '—';
  var mj = $('#mJs'); if (mj) mj.textContent = c.jinsuo ? (c.jinsuo + '＋' + (c.jinsuob || 0)) : '—';
  var read = load(K.read, {}), done = 0;
  (M.list || []).forEach(function (l) { if ((read[l.id] || 0) >= 90) done++; });
  var total = (M.list || []).length || 1;
  $('#progPct').textContent = done + ' / ' + total + ' 课已读完';
  $('#progBar').style.width = Math.round(done / total * 100) + '%';
  // 25 个课号 chip 占掉大半屏，默认折起来；进度条和"x/25 已读完"照常露在外面
  var pc = $('#progCard'), pt = $('#progTog');
  if (pt && !pt._bound) {
    pt._bound = 1;
    pt.onclick = function () {
      var on = !pc.classList.contains('open');
      pc.classList.toggle('open', on);
      pt.setAttribute('aria-expanded', on ? 'true' : 'false');
      save(K.progopen, on ? 1 : 0);
    };
  }
  if (pc) {
    var on = !!load(K.progopen, 0);
    pc.classList.toggle('open', on);
    if (pt) pt.setAttribute('aria-expanded', on ? 'true' : 'false');
  }
  $('#progChips').innerHTML = (M.list || []).map(function (l) {
    var p = read[l.id] || 0;
    return '<span class="chip' + (p >= 90 ? ' done' : '') + '">第' + l.num + '课 ' +
      (p >= 90 ? '已读' : p > 0 ? p + '%' : '未读') + '</span>';
  }).join('');
  var last = load(K.last, null);
  var box = $('#resume');
  if (last && last.scr === 'lesson' && last.id) {
    var it = (M.list || []).filter(function (x) { return x.id === last.id; })[0];
    box.innerHTML = it ? '<button class="mi" id="btnResume"><b>继续读 · 第' + it.num +
      '课</b><span>' + it.short + '</span></button>' : '';
    var b = $('#btnResume');
    if (b) b.onclick = function () { show('lesson', last.id); };
  } else box.innerHTML = '';
  save(K.counts, { lesson: c.lesson, planned: c.planned, done: done,
                   quiz: c.quiz || 0, qseen: Object.keys(load(K.qseen, {})).length });
};


/* ── 格局详解（中册二十五格）───────────────────────────
   定完课体来查断意。列表一屏放得下，不做折叠也不做筛选。 */

RENDER.gelist = function () {
  needGe().then(paintGe);
  if (window.DATA_GE) paintGe(window.DATA_GE);
};
function paintGe(G) {
  $('#geRows').innerHTML = G.map(function (g) {
    return '<div class="gerow" data-ge="' + g.n + '">' +
      '<span class="gn">' + g.n + '</span>' +
      '<span class="gt">' + esc(g.name) + '</span>' +
      '<span class="gl">' + esc(g.line) + '</span></div>';
  }).join('');
  $$('[data-ge]', $('#geRows')).forEach(function (el) {
    el.onclick = function () { show('ge', +el.dataset.ge); };
  });
}
RENDER.ge = function (n) {
  needGe().then(function (G) { paintGeOne(G, n); });
  if (window.DATA_GE) paintGeOne(window.DATA_GE, n);
};
function paintGeOne(G, n) {
  var it = G.filter(function (x) { return x.n === n; })[0];
  if (!it) return;
  $('#ttl').textContent = it.name;
  var prev = G[n - 2], next = G[n];
  $('#geBody').innerHTML = it.html +
    '<div class="row" style="gap:8px;margin:18px 0 8px">' +
    (prev ? '<button class="btn" id="gePrev">‹ ' + esc(prev.name) + '</button>' : '') +
    (next ? '<button class="btn" id="geNext">' + esc(next.name) + ' ›</button>' : '') + '</div>';
  if (prev) $('#gePrev').onclick = function () { show('ge', prev.n); };
  if (next) $('#geNext').onclick = function () { show('ge', next.n); };
  foldLongDocument($('#geBody'));
}

/* ── 附篇（源流 / 八要素）──────────────────────────────
   整篇一条，直接铺 html。两篇都不是课，也没有自测。
   ⚠️ 内容源 content/94-*.md、95-*.md。 */
RENDER.extra = function (id) {
  needExtra().then(function (E) { paintExtra(E, id); });
  if (window.DATA_EXTRA) paintExtra(window.DATA_EXTRA, id);
};
function paintExtra(E, id) {
  var it = (E || []).filter(function (x) { return x.id === id; })[0];
  if (!it) return;
  $('#ttl').textContent = it.title.replace(/^大六壬\s*·\s*/, '');
  var extraBody = $('#extraBody');
  extraBody.innerHTML = it.html;
  // extra 已在列表页预载时，RENDER 会同步画一次、Promise 微任务再画一次；innerHTML
  // 会清掉卡片却不会清 dataset，必须随正文一起重置增强标记。
  delete extraBody.dataset.z9Restored;
  if (id === 'x83') restoreZongmenGuide(extraBody);
  foldLongDocument(extraBody);
  bindDoc(extraBody);
}

/* ── 旧版附篇 · 宗门九课 ───────────────────────────────
   2026-10-22 把旧 App 搬成 markdown 时，只保住了文字；原来的「四步流程、
   十张折叠卡、随机同类真盘、本案推导」全丢了。这里从已迁入的原文重新识别
   十课边界，把原界面恢复出来。随机盘只调用现行 engine.js（《通解》取上神、
   涉害数克害），不再复活旧 App 的下神算法。 */
var Z9_NAMES = ['元首课', '重审课', '知一课', '涉害课', '遥克课',
                '昴星课', '别责课', '八专课', '伏吟课', '返吟课'];

function restoreZongmenGuide(root) {
  if (!root || root.dataset.z9Restored) return;
  root.dataset.z9Restored = '1';
  var hs = [].slice.call(root.querySelectorAll('h2'));
  var head = hs.filter(function (h) { return /九宗门体系与发用流程/.test(h.textContent); })[0];
  if (!head) return;
  var stop = null, n = head.nextElementSibling;
  while (n) {
    if ((n.tagName === 'H1' && /九宗门发用流程/.test(n.textContent)) ||
        (n.tagName === 'H2' && n !== head)) { stop = n; break; }
    n = n.nextElementSibling;
  }

  // 判断流程：原来是四张带课号的卡，不是散落的 20 多行文字。
  var flowTitle = head.nextElementSibling;
  if (flowTitle && /判断流程/.test(flowTitle.textContent)) flowTitle.className = 'z9-flow-title';
  var cur = flowTitle ? flowTitle.nextElementSibling : null;
  while (cur && cur !== stop) {
    if (cur.tagName === 'P' && /^[1-4]$/.test(cur.textContent.trim())) {
      var after = cur.nextElementSibling, card = document.createElement('div');
      card.className = 'z9-step';
      var num = document.createElement('span'); num.className = 'z9-num'; num.textContent = cur.textContent.trim();
      var body = document.createElement('div'); body.className = 'z9-sc';
      cur.parentNode.insertBefore(card, cur); card.appendChild(num); card.appendChild(body); cur.remove();
      while (after && after !== stop && !(after.tagName === 'P' && (/^[1-4]$/.test(after.textContent.trim()) || Z9_NAMES.indexOf(after.textContent.trim()) >= 0 || /九宗门详解/.test(after.textContent)))) {
        var next = after.nextElementSibling; body.appendChild(after); after = next;
      }
      cur = after; continue;
    }
    cur = cur.nextElementSibling;
  }

  // 先在本节范围内固定十个标题节点。不能用 compareDocumentPosition：部分微信
  // WebView 的精简 DOM 没实现这个方法，会让整段增强在第一张卡前中断。
  var titleNodes = {}, scan = head.nextElementSibling;
  while (scan && scan !== stop) {
    if (scan.tagName === 'P' && Z9_NAMES.indexOf(scan.textContent.trim()) >= 0 && !titleNodes[scan.textContent.trim()]) {
      titleNodes[scan.textContent.trim()] = scan;
    }
    scan = scan.nextElementSibling;
  }
  var first = titleNodes[Z9_NAMES[0]];
  if (!first) return;
  var deck = document.createElement('div'); deck.className = 'z9-deck';
  first.parentNode.insertBefore(deck, first);
  Z9_NAMES.forEach(function (name, nameIndex) {
    var title = titleNodes[name];
    if (!title) return;
    var nextTitle = titleNodes[Z9_NAMES[nameIndex + 1]] || null, walk = title.nextElementSibling;
    var end = nextTitle || stop;
    var tag = title.nextElementSibling, details = document.createElement('details');
    details.className = 'z9-card'; details.dataset.z9 = name.replace(/课$/, '');
    var summary = document.createElement('summary');
    summary.innerHTML = '<span><b>' + esc(name) + '</b><small>' + esc(tag && tag !== end ? tag.textContent.trim() : '') + '</small></span><i>＋</i>';
    var body = document.createElement('div'); body.className = 'z9-body';
    details.appendChild(summary); details.appendChild(body); deck.appendChild(details);
    if (tag && tag !== end) { var afterTag = tag.nextElementSibling; title.remove(); tag.remove(); walk = afterTag; }
    else { walk = title.nextElementSibling; title.remove(); }
    while (walk && walk !== end) { var nx = walk.nextElementSibling; body.appendChild(walk); walk = nx; }
    formatZongmenCard(body);
    var btn = document.createElement('button'); btn.className = 'btn z9-random'; btn.type = 'button';
    btn.textContent = '随机起一个“' + name + '”真盘 ↺';
    btn.onclick = function () { randomZongmenPan(details.dataset.z9, btn); };
    body.appendChild(btn);
  });
}

function formatZongmenCard(body) {
  var ps = [].slice.call(body.children), why = ps.filter(function (p) { return /^为什么叫/.test(p.textContent); })[0];
  if (why) {
    var note = document.createElement('div'); note.className = 'z9-name-note'; why.parentNode.insertBefore(note, why);
    var p = why;
    while (p) {
      var nx = p.nextElementSibling; note.appendChild(p);
      if (/^盘面对应/.test(p.textContent)) break;
      p = nx;
    }
    why.className = 'z9-name-title';
  }
  [].slice.call(body.children).forEach(function (p) {
    if (p.tagName === 'P' && /^记：/.test(p.textContent)) p.className = 'z9-mn';
  });
  var dh = [].slice.call(body.children).filter(function (p) { return p.tagName === 'P' && /^📐/.test(p.textContent); })[0];
  if (dh) {
    var derive = document.createElement('div'); derive.className = 'z9-derive'; dh.parentNode.insertBefore(derive, dh);
    var p2 = dh;
    while (p2) { var nx2 = p2.nextElementSibling; derive.appendChild(p2); p2 = nx2; }
    dh.className = 'z9-derive-hd';
    [].slice.call(derive.children).slice(1).forEach(function (p) {
      p.className = /^💡|^⚠|^举例|^为何/.test(p.textContent.trim()) ? 'z9-deg' : 'z9-dstep';
    });
  }
}

function randomZongmenPan(want, btn) {
  var E = window.LiurenEngine, body = btn.closest('.z9-body');
  var old = $('.z9-example', body); if (old) old.remove();
  var box = document.createElement('div'); box.className = 'z9-example';
  body.insertBefore(box, btn); box.innerHTML = '<p class="muted center">正在搜索同类真盘…</p>';
  if (!E) { box.innerHTML = '<p class="muted center">起课引擎未载入，请刷新后重试。</p>'; return; }
  setTimeout(function () {
    var days = [], i, j;
    for (i = 0; i < 10; i++) for (j = 0; j < 12; j++) if (i % 2 === j % 2) days.push(E.G[i] + E.Z[j]);
    var total = days.length * 144, start = Math.floor(Math.random() * total), found = null;
    function same(o) { return o && (o.ke === want || (want === '知一' && (o.ke === '知一' || o.ke === '比用'))); }
    for (i = 0; i < total; i++) {
      var x = (start + i) % total, d = Math.floor(x / 144), r = x % 144;
      var o = E.qike(days[d], E.Z[Math.floor(r / 12)], E.Z[r % 12]);
      if (same(o)) { found = o; break; }
    }
    if (!found) { box.innerHTML = '<p class="muted center">这一轮没有找到，请再点一次。</p>'; return; }
    box.innerHTML = zongmenPanHTML(found) + zongmenDeriveHTML(found, want);
    bindPan(box); btn.textContent = '换一个“' + want + '课”真盘 ↺';
  }, 20);
}

function zongmenPanHTML(o) {
  var rg = o.rgz.charAt(0), rz = o.rgz.charAt(1), generals = tianjiang(rg, o.zs, o.t).tj;
  function jiang(z) { var dp = Z.filter(function (d) { return o.t[d] === z; })[0]; return generals[dp] || ''; }
  var ke = o.sk.slice().reverse().map(function (c) {
    return '<div class="ke"><span class="tj">' + jiang(c.shang) + '</span><span class="lb">第' + (c.i + 1) + '课</span>' +
      '<span class="up">' + c.shang + '</span><span class="dn">' + c.xia + '</span></div>';
  }).join('');
  var sc = o.chuan.map(function (z, i) {
    return '<div class="cr"><span class="lb">' + '初中末'.charAt(i) + '传</span><span class="z">' + z + '</span>' +
      '<span class="ex">' + (jiang(z) || '—') + '</span></div>';
  }).join('');
  var label = o.ke + (o.ge ? ' · ' + o.ge : '');
  return '<div class="z9-pan-head"><b>' + o.rgz + '日 · ' + o.yj + '将 · ' + o.zs + '时</b><span>' + esc(label) + '</span></div>' +
    '<div class="sanchuan">' + sc + '</div><div class="sike">' + ke + '</div>' +
    panHTML(o.t, generals, o.rgz + '日<br>' + o.yj + '将 · ' + o.zs + '时<br><b>' + esc(label) + '</b>');
}

function zongmenDeriveHTML(o, want) {
  var WX = { 甲:'木',乙:'木',寅:'木',卯:'木',丙:'火',丁:'火',巳:'火',午:'火',戊:'土',己:'土',丑:'土',辰:'土',未:'土',戌:'土',庚:'金',辛:'金',申:'金',酉:'金',壬:'水',癸:'水',子:'水',亥:'水' };
  var KM = { 木:'土',土:'水',水:'火',火:'金',金:'木' };
  function ke(a, b) { return KM[WX[a]] === WX[b]; }
  var down = o.sk.filter(function (c) { return ke(c.xia, c.shang); });
  var up = o.sk.filter(function (c) { return ke(c.shang, c.xia); });
  var reason = '';
  if (o.ke === '伏吟') reason = '月将与占时相同，天地盘重合，先按伏吟法取传。';
  else if (o.ke === '返吟') reason = '月将与占时相冲，天地盘对冲，先按返吟法取传。';
  else if (o.ke === '八专') reason = '日干寄宫与日支同宫，四课归并为两课，按八专法取传。';
  else if (o.ke === '元首') reason = '四课只有一处上克下、没有下贼上，唯一上神发用。';
  else if (o.ke === '重审') reason = '四课只有一处下贼上，矛盾从下发动，按重审法发用。';
  else if (o.ke === '比用' || o.ke === '知一') reason = '四课有多处同向克，先按日干阴阳比用，从多候选中知其一。';
  else if (o.ke === '涉害') reason = '比用后仍有多个候选，再沿途数克害，取涉害最深者。';
  else if (o.ke === '遥克') reason = '四课上下无正克，改查日干与各课上神的隔空相克（' + (o.ge || '遥克') + '）。';
  else if (o.ke === '别责') reason = '四课不备且无正克、无遥克，向干合或支合另责一神。';
  else reason = '四课无正克、无遥克且四课俱全，从酉位按昴星法发用。';
  var counts = '下贼上 ' + down.length + ' 处，上克下 ' + up.length + ' 处';
  return '<div class="z9-case-derive"><b>本案逐步推导</b>' +
    '<p><i>1</i>先查特殊结构：月将 ' + o.yj + '、占时 ' + o.zs + '；日课为 ' + o.rgz + '。</p>' +
    '<p><i>2</i>逐课扫克：' + counts + '。</p>' +
    '<p><i>3</i>' + esc(reason) + ' 初传取 <strong>' + o.chuan[0] + '</strong>。</p>' +
    '<p><i>4</i>依本课取传规则得到：初 <strong>' + o.chuan[0] + '</strong> → 中 <strong>' + o.chuan[1] + '</strong> → 末 <strong>' + o.chuan[2] + '</strong>。</p>' +
    (want === '知一' && o.ke === '比用' ? '<small>本盘引擎标为“比用”，归在知一课的同一宗门内学习。</small>' : '') + '</div>';
}

/* ── App 存档（80–92）列表 ─────────────────────────────
   「六壬神课」App 2026-10-22 退役，还没进课程的屏与数据整体收成附篇。
   ⚠️ 多与课文重复——每篇开头写了与哪几课重复、以课文为准。 */
RENDER.xarch = function () {
  var box = $('#xarchList');
  box.innerHTML = '<div class="muted center">载入中…</div>';
  needExtra().then(function (E) {
    // 附篇＝源流＋旧版 App 资料（八要素在「查」组单列，不重复放）
    var xs = (E || []).filter(function (x) { return /^x\d\d$/.test(x.id) || x.id === 'liuyuan'; })
      .sort(function (a, b) { return (a.id === 'liuyuan' ? -1 : 0) - (b.id === 'liuyuan' ? -1 : 0) || a.num - b.num; });
    box.innerHTML = '<p class="muted">不读也不影响起课断课。标「旧版」的来自旧版六壬神课 App，与课文重复的地方以课文为准。</p>' +
      xs.map(function (x) {
        var t = x.title.replace(/^大六壬\s*·\s*/, '');
        return '<button class="mi" data-x="' + x.id + '"><b>' + esc(t) + (/^x/.test(x.id) ? ' <em class="old">旧版</em>' : '') +
          '</b><span>' + esc(x.line.replace(/\*\*/g, '')) + '</span></button>';
      }).join('');
    $$('[data-x]', box).forEach(function (b) { b.onclick = function () { show('extra', b.dataset.x); }; });
  });
};

/* ── 象法速查 ──────────────────────────────────────────
   265 条断法规则，三库：取象法则 / 分类类神 / 百章歌断诀。
   ⚠️ 内容源 content/96-象法速查.md。
   ⚠️ 刻意**不并进「速查」屏**——那屏按第几课分组、每条带「到第 N 课看讲解」，
      象法条目不属于任何一课，塞进去要到处特判。 */
var xfLib = '';
RENDER.xflist = function () {
  var box = $('#xq');
  if (box && !box._bound) {
    box._bound = true;
    var t = null;
    box.oninput = function () { clearTimeout(t); t = setTimeout(paintXf, 160); };
  }
  paintXf();
};
function paintXf() {
  if (window.DATA_XF) { renderXf(window.DATA_XF); return; }
  $('#xfList').innerHTML = '<p class="muted">正在取象法…</p>';
  needXf().then(renderXf).catch(function () {
    $('#xfList').innerHTML = '<p class="muted">象法加载失败，检查网络后重试。</p>';
  });
}
function renderXf(D) {
  var libs = D.libs || [], all = D.items || [];
  $('#xfFilters').innerHTML = ['<button class="chip' + (xfLib ? '' : ' on') +
    '" data-lib="">全部 ' + all.length + '</button>']
    .concat(libs.map(function (l) {
      return '<button class="chip' + (xfLib === l.name ? ' on' : '') +
        '" data-lib="' + esc(l.name) + '">' + esc(l.name) + ' ' + l.n + '</button>';
    })).join('');
  $$('[data-lib]', $('#xfFilters')).forEach(function (b) {
    b.onclick = function () { xfLib = b.dataset.lib; renderXf(D); };
  });

  var kw = ($('#xq').value || '').trim();
  var words = kw.split(/\s+/).filter(Boolean);
  var hit = all.filter(function (r) {
    if (xfLib && r.lib !== xfLib) return false;
    return words.every(function (w) {
      return (r.name + r.grp + r.lib + r.text + r.src).indexOf(w) >= 0;
    });
  });
  if (!hit.length) {
    $('#xfList').innerHTML = '<p class="muted">没找到。换个词试试。</p>';
    return;
  }
  var html = '', cur2 = '';
  hit.forEach(function (r) {
    var g = r.lib + ' · ' + r.grp;
    if (g !== cur2) { cur2 = g; html += '<div class="refg">' + esc(g) + '</div>'; }
    html += '<div class="refi"><button class="refh"><b>' + esc(r.name) +
      '</b></button><div class="refb">' + r.html +
      '<p class="src">〔出处〕' + esc(r.src) + '</p></div></div>';
  });
  $('#xfList').innerHTML = html;
  $$('.refi', $('#xfList')).forEach(function (d) {
    d.querySelector('.refh').onclick = function () { d.classList.toggle('open'); };
  });
}

/* ── 金锁玉匙（初传查表）──────────────────────────────
   《通解》下册外编第一节的发用简断：只看初传天盘字加在地盘哪个字上，查一首诗。
   两排 12 个字点选（上排＝初传，下排＝所临地盘），当场出诗；下面是全表可搜可翻。
   ⚠️ 内容源 content/93-金锁玉匙.md；格子由 build.py 算（每格主条＋又见），这里只画。
   ⚠️ 不并进「速查」屏（那屏按课分组）；id 传「天地」两字可直接定位一格（起课练习用）。 */
var jsSel = { a: '', b: '' }, jsTab = 'a';
RENDER.jinsuo = function (id) {
  if (id && /^[子丑寅卯辰巳午未申酉戌亥]{2}$/.test(id)) { jsSel = { a: id[0], b: id[1] }; jsTab = 'a'; }
  var box = $('#jsq');
  if (box && !box._bound) {
    box._bound = true;
    var t = null;
    box.oninput = function () { clearTimeout(t); t = setTimeout(paintJs, 160); };
  }
  paintJs();
};
function paintJs() {
  if (window.DATA_JINSUO) { renderJs(window.DATA_JINSUO); return; }
  $('#jsList').innerHTML = '<p class="muted">正在取诗诀…</p>';
  needJinsuo().then(renderJs).catch(function () {
    $('#jsList').innerHTML = '<p class="muted">金锁玉匙加载失败，检查网络后重试。</p>';
  });
}
function jsPoem(p) {
  // 诗按句号断行，读起来才像诗；原文里逗号不动
  return esc(p).split('。').filter(Boolean).map(function (x) { return x + '。'; }).join('<br>');
}
function jsEntryHTML(D, e, open) {
  var pairs = e.p.map(function (c) { return c[0] + '加' + c[1]; }).join(' · ');
  var also = e.also.map(function (c) { return c[0] + '加' + c[1]; }).join(' · ');
  return '<div class="refi jse' + (open ? ' open' : '') + '" data-js="' + e.n + '">' +
    '<button class="refh"><b>' + e.n + '. ' + esc(e.name) + '</b><span>' + esc(pairs || '—') + '</span></button>' +
    '<div class="refb">' +
    (pairs ? '<p class="jsk">相加：' + esc(pairs) + '</p>' : '') +
    (also ? '<p class="jsk">又见：' + esc(also) + '</p>' : '') +
    (e.gua ? '<p class="jsk">卦：' + esc(e.gua) + '</p>' : '') +
    '<p class="jspoem">' + jsPoem(e.poem) + '</p>' +
    (e.note ? '<p class="jsnote">备注：' + esc(e.note) + '</p>' : '') +
    '<details class="jsq"><summary>原文</summary>' + e.quote + '</details>' +
    '</div></div>';
}
function jsEntryBHTML(e, open) {
  return '<div class="refi jse' + (open ? ' open' : '') + '" data-jsb="' + e.n + '">' +
    '<button class="refh"><b>' + e.n + '. ' + esc(e.name) + '</b><span>' +
    esc(e.cond.split(/[，。（]/)[0]) + '</span></button>' +
    '<div class="refb">' +
    '<p class="jsk">条件：' + esc(e.cond) + '</p>' +
    '<p class="jspoem">' + jsPoem(e.poem) + '</p>' +
    (e.note ? '<p class="jsnote">备注：' + esc(e.note) + '</p>' : '') +
    '<details class="jsq"><summary>原文</summary>' + e.quote + '</details>' +
    '</div></div>';
}
function renderJs(D) {
  var A = D.a || [], B = D.b || [], grid = D.grid || {};
  function byN(n) { return A.filter(function (x) { return x.n === n; })[0]; }
  // 两排字
  $('#jsPick').innerHTML = [['a', '初传'], ['b', '临于']].map(function (r) {
    return '<div class="jsrow"><span class="jsl">' + r[1] + '</span><div class="jsz">' +
      Z.map(function (z) {
        return '<button class="jz' + (jsSel[r[0]] === z ? ' on' : '') + '" data-r="' + r[0] +
          '" data-z="' + z + '">' + z + '</button>';
      }).join('') + '</div></div>';
  }).join('');
  $$('.jz', $('#jsPick')).forEach(function (b) {
    b.onclick = function () {
      jsSel[b.dataset.r] = (jsSel[b.dataset.r] === b.dataset.z) ? '' : b.dataset.z;
      renderJs(D);
    };
  });
  // 命中格
  var hit = $('#jsHit'), h = '';
  if (jsSel.a && jsSel.b) {
    var c = jsSel.a + jsSel.b, g = grid[c];
    h += '<div class="jshit"><div class="jshk">' + jsSel.a + ' 加 ' + jsSel.b +
      '<span class="muted">（初传 ' + jsSel.a + ' 临地盘 ' + jsSel.b + '）</span></div>';
    if (!g) {
      h += '<p class="muted">原书未列这一格（多为正规课式里排不出的相加）。</p>';
    } else if (g.n === -1) {
      h += '<p class="muted">原书明说这一格「无发用无课，并无类诗」。</p>';
    } else if (g.n === -2) {
      h += '<p class="muted">玄胎课象——原书注「无诗」（' + esc((D.xuantai || {}).gua || '') +
        '）。玄胎课的断意见第 18 课。</p>' + ((D.xuantai || {}).quote || '');
    } else {
      var main = g.n > 0 ? byN(g.n) : null;
      if (main) h += jsEntryHTML(D, main, true);
      (g.alt || []).forEach(function (n) {
        var e = byN(n);
        if (!e) return;
        h += '<p class="muted jsalt">又见（原书两处说法不一，理由在备注）：</p>' + jsEntryHTML(D, e, false);
      });
    }
    h += '</div>';
  } else {
    h += '<p class="muted center">上排点初传的字，下排点它所临的地盘字。</p>';
  }
  hit.innerHTML = h;
  // 页签
  $('#jsTabs').innerHTML = [['a', '象类 ' + A.length], ['b', '神将神煞 ' + B.length], ['i', '怎么用']]
    .map(function (t) {
      return '<button class="chip' + (jsTab === t[0] ? ' sel' : '') + '" data-tab="' + t[0] + '">' + t[1] + '</button>';
    }).join('');
  $$('[data-tab]', $('#jsTabs')).forEach(function (b) {
    b.onclick = function () { jsTab = b.dataset.tab; renderJs(D); };
  });
  // 列表
  var kw = ($('#jsq').value || '').trim(), words = kw.split(/\s+/).filter(Boolean);
  var list = $('#jsList'), out = '';
  if (jsTab === 'i') {
    out = '<div class="doc">' + (D.intro || '') + (D.xref || '') + '</div>';
  } else if (jsTab === 'a') {
    A.forEach(function (e) {
      var txt = e.name + e.p.join(' ') + e.p.map(function (c) { return c[0] + '加' + c[1]; }).join(' ') + e.poem + e.gua + e.note;
      if (!words.every(function (w) { return txt.indexOf(w) >= 0; })) return;
      out += jsEntryHTML(D, e, false);
    });
  } else {
    B.forEach(function (e) {
      var txt = e.name + e.cond + e.poem + e.note;
      if (!words.every(function (w) { return txt.indexOf(w) >= 0; })) return;
      out += jsEntryBHTML(e, false);
    });
  }
  list.innerHTML = out || '<p class="muted">没找到。换个词试试。</p>';
  $$('.jse', $('#s-jinsuo')).forEach(function (d) {
    d.querySelector('.refh').onclick = function () { d.classList.toggle('open'); };
  });
}

/* ── 毕法赋详解 ────────────────────────────────────────
   100 法、356 格。列表按「法」列，一法一行带它辖下的格名，
   点进去是整条法（含全部格的原文·白话·课盘）。
   ⚠️ 内容源是 content/97-毕法赋详解.md，这里只负责画。
   ⚠️ data-bifa.js 有 1.4MB，只在进这两屏时才加载——别搬进首屏。 */
RENDER.bflist = function () {
  needBifa().then(paintBf);
  if (window.DATA_BIFA) paintBf(window.DATA_BIFA);
};
function paintBf(B) {
  $('#bfRows').innerHTML = B.map(function (f) {
    return '<div class="gerow" data-bf="' + f.n + '">' +
      '<span class="gn">' + f.n + '</span>' +
      '<span class="gt">' + esc(f.ju) + '</span>' +
      '<span class="gl">' + esc(f.pian) +
      (f.ge.length ? '　· ' + esc(f.ge.join('／')) : '') + '</span></div>';
  }).join('');
  $$('[data-bf]', $('#bfRows')).forEach(function (el) {
    el.onclick = function () { show('bifa', +el.dataset.bf); };
  });
}
RENDER.bifa = function (n) {
  needBifa().then(function (B) { paintBfOne(B, n); });
  if (window.DATA_BIFA) paintBfOne(window.DATA_BIFA, n);
};
function paintBfOne(B, n) {
  var it = B.filter(function (x) { return x.n === n; })[0];
  if (!it) return;
  $('#ttl').textContent = '第 ' + it.n + ' 法 · ' + it.pian;
  var prev = B[n - 2], next = B[n];
  withBody('bf', it, function (html) {
  $('#bfBody').innerHTML = html +
    '<div class="row" style="gap:8px;margin:18px 0 8px">' +
    (prev ? '<button class="btn" id="bfPrev">‹ 第 ' + prev.n + ' 法</button>' : '') +
    (next ? '<button class="btn" id="bfNext">第 ' + next.n + ' 法 ›</button>' : '') + '</div>';
  if (prev) $('#bfPrev').onclick = function () { show('bifa', prev.n); };
  if (next) $('#bfNext').onclick = function () { show('bifa', next.n); };
  foldLongDocument($('#bfBody'));
  });
}

/* ── 课例题库 ──────────────────────────────────────────
   按占类折叠。126 例平铺要滚很久，找不到自己想练的那一类。
   ⚠️ 分组口径在 build.py 的 build_quiz（＝md 里的 ## 分类），这里只负责画。 */
var qFilter = { tag: '', star: false };
RENDER.qlist = function () {
  var box = $('#qRows');
  if (!window.DATA_QUIZ) box.innerHTML = '<p class="muted" style="padding:16px">载入课例…</p>';
  needQuiz().then(function (Q) { paintQ(Q); });
  if (window.DATA_QUIZ) paintQ(window.DATA_QUIZ);   // 已加载就同步画，别等 then（测试要断言 DOM）
};
function paintQ(Q) {
  var seen = load(K.qseen, {});
  var tags = {};
  Q.items.forEach(function (it) { (it.tags || []).forEach(function (t) { tags[t] = (tags[t] || 0) + 1; }); });
  var chips = [['', '全部 ' + Q.items.length], ['★', '入门精选 ' +
    Q.items.filter(function (x) { return x.star; }).length]];
  Object.keys(tags).sort(function (a, b) { return tags[b] - tags[a]; })
    .forEach(function (t) { chips.push([t, t + ' ' + tags[t]]); });
  var selv = qFilter.star ? '★' : qFilter.tag;
  $('#qFilters').innerHTML = chips.map(function (c) {
    return '<span class="chip' + (selv === c[0] ? ' sel' : '') + '" data-qf="' + esc(c[0]) + '">' +
      esc(c[1]) + '</span>';
  }).join('');
  $$('[data-qf]').forEach(function (el) {
    el.onclick = function () {
      var v = el.dataset.qf;
      qFilter = { tag: v === '★' ? '' : v, star: v === '★' };
      paintQ(Q);
    };
  });

  var list = Q.items.filter(function (it) {
    if (qFilter.star) return it.star;
    if (qFilter.tag) return (it.tags || []).indexOf(qFilter.tag) >= 0;
    return true;
  });
  var filtering = !!(qFilter.tag || qFilter.star);
  var open = load(K.qopen, {});
  var byCat = {};
  list.forEach(function (it) { (byCat[it.cat] = byCat[it.cat] || []).push(it); });
  $('#qRows').innerHTML = (Q.topics || []).map(function (tp) {
    var its = byCat[tp.name] || [];
    if (!its.length) return '';
    // ⚠️ 一旦筛了考点，全部展开——否则筛出来的结果藏在折叠里，等于没筛
    var isOpen = filtering || !!open[tp.name];
    var done = its.filter(function (it) { return seen[it.n]; }).length;
    return '<div class="qgrp' + (isOpen ? ' open' : '') + '" data-g="' + esc(tp.name) + '">' +
      '<button class="qgh"><span class="qi">' + esc(tp.name.charAt(0)) + '</span><span class="nm">' + esc(tp.name) + '</span>' +
      '<span class="ct">' + (done ? done + '/' : '') + its.length + '</span><span class="ar">›</span></button>' +
      '<div class="qgb">' + its.map(function (it) {
        return '<div class="qrow" data-q="' + it.n + '">' +
          '<span class="qn">' + it.n + '</span>' +
          '<span class="t">' + (it.star ? '⭐ ' : '') + esc(it.title) + '</span>' +
          '<span class="s"><i class="dot ' + (seen[it.n] ? 'ok' : 'new') + '"></i></span></div>';
      }).join('') + '</div></div>';
  }).join('');
  $$('.qgh', $('#qRows')).forEach(function (b) {
    b.onclick = function () {
      var g = b.parentNode, nm = g.dataset.g;
      g.classList.toggle('open');
      var o = load(K.qopen, {});
      if (g.classList.contains('open')) o[nm] = 1; else delete o[nm];
      save(K.qopen, o);
    };
  });
  $$('[data-q]', $('#qRows')).forEach(function (el) {
    el.onclick = function () { show('quiz', +el.dataset.q); };
  });
}

RENDER.quiz = function (n) {
  needQuiz().then(function (Q) { paintQuiz(Q, n); });
  if (window.DATA_QUIZ) paintQuiz(window.DATA_QUIZ, n);
};
function paintQuiz(Q, n) {
  var it = Q.items.filter(function (x) { return x.n === n; })[0];
  if (!it) return;
  $('#ttl').textContent = '课例 ' + it.n;
  markSeenLater(K.qseen, it.n, 'quiz', it.n);
  var idx = Q.items.map(function (x) { return x.n; }).indexOf(n);
  var prev = Q.items[idx - 1], next = Q.items[idx + 1];
  withBody('q', it, function (html) {
  $('#quizBody').innerHTML = html +
    '<div class="row" style="gap:8px;margin:18px 0 8px">' +
    (prev ? '<button class="btn" id="qPrev">‹ 上一例</button>' : '') +
    (next ? '<button class="btn" id="qNext">下一例 ›</button>' : '') + '</div>';
  if (prev) $('#qPrev').onclick = function () { show('quiz', prev.n); };
  if (next) $('#qNext').onclick = function () { show('quiz', next.n); };
  buildStickyPan($('#quizBody'));    // 课例也吸顶四课三传，和课文一个待遇
  foldLongDocument($('#quizBody'));
  });
}

/* ── 王牧夫初级案例库 ─────────────────────────────────── */
RENDER.mflist = function () {
  var box = $('#mfRows');
  if (!window.DATA_MUFU) box.innerHTML = '<p class="muted" style="padding:16px">载入案例…</p>';
  needMufu().then(paintMufuList);
  if (window.DATA_MUFU) paintMufuList(window.DATA_MUFU);
};
function paintMufuList(items) {
  var seen = load(K.mfseen, {});
  $('#mfRows').innerHTML = '<div class="qgrp open"><div class="qgb">' + items.map(function (it) {
    return '<div class="qrow" data-mf="' + it.n + '">' +
      '<span class="qn">' + it.n + '</span><span class="t">' + esc(it.title) +
      '<small>' + esc((it.tags || []).join(' · ')) + '</small></span>' +
      '<span class="s"><i class="dot ' + (seen[it.n] ? 'ok' : 'new') + '"></i></span></div>';
  }).join('') + '</div></div>';
  $$('[data-mf]', $('#mfRows')).forEach(function (el) {
    el.onclick = function () { show('mufu', +el.dataset.mf); };
  });
}
RENDER.mufu = function (n) {
  needMufu().then(function (items) { paintMufu(items, n); });
  if (window.DATA_MUFU) paintMufu(window.DATA_MUFU, n);
};
function paintMufu(items, n) {
  var it = items.filter(function (x) { return x.n === n; })[0];
  if (!it) return;
  $('#ttl').textContent = '王牧夫 · 入门例' + it.n;
  markSeenLater(K.mfseen, it.n, 'mufu', it.n);
  var idx = items.map(function (x) { return x.n; }).indexOf(n);
  var prev = items[idx - 1], next = items[idx + 1];
  withBody('mf', it, function (html) {
    $('#mfBody').innerHTML = html + '<div class="row" style="gap:8px;margin:18px 0 8px">' +
      (prev ? '<button class="btn" id="mfPrev">‹ 上一例</button>' : '') +
      (next ? '<button class="btn" id="mfNext">下一例 ›</button>' : '') + '</div>';
    if (prev) $('#mfPrev').onclick = function () { show('mufu', prev.n); };
    if (next) $('#mfNext').onclick = function () { show('mufu', next.n); };
    buildStickyPan($('#mfBody'), it.cal);
    foldLongDocument($('#mfBody'));
  });
}

/* ── 《大六壬通解》案例库 ── */
RENDER.tjlist = function () {
  var box = $('#tjRows');
  if (!window.DATA_TONGJIE) box.innerHTML = '<p class="muted" style="padding:16px">载入通解案例…</p>';
  needTongjie().then(paintTongjieList);
  if (window.DATA_TONGJIE) paintTongjieList(window.DATA_TONGJIE);
};
function paintTongjieList(items) {
  var seen = load(K.tjseen, {}), volumes = { '上': {}, '中': {}, '下': {} };
  items.forEach(function (it) {
    if (!volumes[it.volume][it.category]) volumes[it.volume][it.category] = [];
    volumes[it.volume][it.category].push(it);
  });
  $('#tjRows').innerHTML = ['上', '中', '下'].map(function (volume) {
    var cats = volumes[volume], total = Object.keys(cats).reduce(function (n, key) { return n + cats[key].length; }, 0);
    return '<section class="tjvol" data-tj-volume="' + volume + '">' +
      '<button type="button" class="tjfold tjvol-h" aria-expanded="false"><i>' + volume + '</i><b>' + volume +
      '册</b><span>' + total + ' 例</span><em>›</em></button><div class="tjvol-body">' +
      Object.keys(cats).map(function (category) {
        var a = cats[category];
        return '<section class="tjcat"><button type="button" class="tjfold tjcat-h" aria-expanded="false"><b>' +
          esc(category) + '</b><span>' + a.length + ' 例</span><em>›</em></button><div class="tjcat-body">' +
          a.map(function (it) {
            return '<button type="button" class="qrow tjcase" data-tj="' + esc(it.id) + '"><span class="qn">' + it.n +
          '</span><span class="t">' + esc(it.title) + '<small>' + esc(it.volume + '册 · ' + it.category) +
          '</small></span><span class="s"><i class="dot ' + (seen[it.id] ? 'ok' : 'new') + '"></i></span></button>';
          }).join('') + '</div></section>';
      }).join('') + '</div></section>';
  }).join('');
  $$('.tjvol-h', $('#tjRows')).forEach(function (btn) {
    btn.onclick = function () {
      var fold = btn.closest('.tjvol'), on = !fold.classList.contains('open');
      fold.classList.toggle('open', on); btn.setAttribute('aria-expanded', on ? 'true' : 'false');
    };
  });
  $$('.tjcat-h', $('#tjRows')).forEach(function (btn) {
    btn.onclick = function () {
      var fold = btn.closest('.tjcat'), on = !fold.classList.contains('open');
      fold.classList.toggle('open', on); btn.setAttribute('aria-expanded', on ? 'true' : 'false');
    };
  });
  $$('[data-tj]', $('#tjRows')).forEach(function (el) {
    el.onclick = function () { show('tongjie', el.dataset.tj); };
  });
}
RENDER.tongjie = function (id) {
  needTongjie().then(function (items) { paintTongjie(items, id); });
  if (window.DATA_TONGJIE) paintTongjie(window.DATA_TONGJIE, id);
};
function paintTongjie(items, id) {
  var it = items.filter(function (x) { return x.id === id; })[0];
  if (!it) return;
  $('#ttl').textContent = '通解' + it.volume + '册 · 第' + it.n + '例';
  markSeenLater(K.tjseen, it.id, 'tongjie', it.id);
  var idx = items.map(function (x) { return x.id; }).indexOf(id);
  var prev = items[idx - 1], next = items[idx + 1];
  $('#tjBody').innerHTML = '<p class="muted" style="padding:16px">正在载入案例正文…</p>';
  withBody('tj', it, function (html) {
    $('#tjBody').innerHTML = html + '<div class="row" style="gap:8px;margin:18px 0 8px">' +
      (prev ? '<button class="btn" id="tjPrev">‹ 上一例</button>' : '') +
      (next ? '<button class="btn" id="tjNext">下一例 ›</button>' : '') + '</div>';
    if (prev) $('#tjPrev').onclick = function () { show('tongjie', prev.id); };
    if (next) $('#tjNext').onclick = function () { show('tongjie', next.id); };
    buildStickyPan($('#tjBody'), it.cal);
    foldLongDocument($('#tjBody'));
  });
}

RENDER.courses = function () {
  var tongjieN = (M.list || []).length;
  var basicN = (M.basicList || []).length;
  $('#courseEntrances').innerHTML =
    '<div class="course-entrances">' +
      '<button class="course-entry tongjie" data-course-go="course">' +
        '<i>通</i><span><b>大六壬通解课程</b><small>从《大六壬通解》重排的系统课程</small><em>' + tongjieN + ' 课　进入学习 ›</em></span>' +
      '</button>' +
      '<button class="course-entry beginner" data-course-go="basiccourse">' +
        '<i>初</i><span><b>大六壬初中级课程</b><small>公开课与中级校对稿跨课梳理，案例随知识点学习</small><em>' + basicN + ' 课　进入学习 ›</em></span>' +
      '</button>' +
    '</div>';
  $$('[data-course-go]', $('#courseEntrances')).forEach(function (b) {
    b.onclick = function () { show(b.dataset.courseGo); };
  });
};

RENDER.course = function () {
  var read = load(K.read, {});
  var byId = {}; (M.list || []).forEach(function (l) { byId[l.num] = l; });
  var html = '', part = '', pk = 0;
  // 每部分已读几课，写在部分标题右侧（2026-10-22 界面优化）
  var partN = {}, partDone = {};
  // ⭐ 2026-10-23 主修／查阅分层：18 九宗门断意、19 六十四课经、20 神煞、24 毕法赋用法
  //    是「定完课体再查」的，不在第一遍的学习路线上——收进列表底部的「进阶与查阅」，默认折起。
  //    ⚠️ 口径写在 00 总目录「主修与查阅」那段，改这里先改那里。
  var REF_NUMS = { 18: 1, 19: 1, 20: 1, 24: 1 };
  var plan = (M.plan || []).filter(function (p) { return !REF_NUMS[p.num]; });
  var refPlan = (M.plan || []).filter(function (p) { return REF_NUMS[p.num]; });
  plan.forEach(function (p) {
    partN[p.part] = (partN[p.part] || 0) + 1;
    var l = byId[p.num]; if (l && (read[l.id] || 0) >= 90) partDone[p.part] = (partDone[p.part] || 0) + 1;
  });
  function item(p) {
    var l = byId[p.num];
    if (l) {
      var pct = read[l.id] || 0;
      return '<button class="li' + (pct >= 90 ? ' read' : pct > 0 ? ' doing' : '') + '" data-id="' + l.id + '"><span class="n">' + p.num +
        '</span><span class="t"><b>' + l.short + '</b><span>' + (l.line || p.line) +
        '</span></span><span class="mark">' + (pct >= 90 ? '已读' : pct > 0 ? pct + '%' : '') +
        '</span></button>';
    }
    return '<div class="li todo"><span class="n">' + p.num +
      '</span><span class="t"><b>' + p.title + '</b><span>' + p.line +
      '</span></span><span class="mark">待写</span></div>';
  }
  plan.forEach(function (p) {
    if (p.part !== part) {
      if (part) html += '</details>';
      part = p.part; pk++;
      var m = /^第(.)部分\s*[·・]?\s*(.*)$/.exec(part);
      html += '<details class="coursegrp"><summary class="part"><i>' + (m ? m[1] : pk) + '</i><span>' + esc(m ? m[2] : part) + '</span>' +
        '<em>' + (partDone[part] || 0) + ' / ' + partN[part] + '</em></summary>';
    }
    html += item(p);
  });
  if (part) html += '</details>';
  if (refPlan.length) {
    var rd = refPlan.filter(function (p) { var l = byId[p.num]; return l && (read[l.id] || 0) >= 90; }).length;
    html += '<details class="refgrp"><summary class="part"><i>查</i><span>进阶与查阅 · 定完课体再翻</span>' +
      '<em>' + rd + ' / ' + refPlan.length + '</em></summary>' + refPlan.map(item).join('') + '</details>';
  }
  // 学习路线原是首页单独一项，2026-10-22 并到课程列表顶上（首页入口精简）
  $('#courseList').innerHTML = '<button class="mi" id="toOutline"><b>学习路线</b><span>全书结构 · 依赖图 · 三个卡点</span></button>' + html;
  $('#toOutline').onclick = function () { show('outline'); };
  $$('#courseList .li[data-id]').forEach(function (b) {
    b.onclick = function () { show('lesson', b.dataset.id); };
  });
};

RENDER.basiccourse = function () {
  var list = M.basicList || [], read = load(K.basicread, {}), html = '', part = '';
  list.forEach(function (l) {
    if (l.part !== part) {
      if (part) html += '</details>';
      part = l.part;
      var all = list.filter(function (x) { return x.part === part; });
      var done = all.filter(function (x) { return (read[x.id] || 0) >= 90; }).length;
      html += '<details class="coursegrp"><summary class="part"><i>' + esc(part.replace(/部分.*$/, '').replace('第', '')) +
        '</i><span>' + esc(part.replace(/^第.部分\s*[·・]?\s*/, '')) + '</span><em>' + done + ' / ' + all.length + '</em></summary>';
    }
    var pct = read[l.id] || 0;
    html += '<button class="li' + (pct >= 90 ? ' read' : pct > 0 ? ' doing' : '') + '" data-basic-id="' + l.id + '">' +
      '<span class="n">' + l.num + '</span><span class="t"><b>' + esc(l.short) + '</b><span>' + esc(l.line) +
      '</span><small>汇集原稿 ' + l.sources + ' 节' + (l.pan_pending ? ' · 待补盘面 ' + l.pan_pending + ' 处' : '') +
      '</small></span><span class="mark">' + (pct >= 90 ? '已读' : pct > 0 ? pct + '%' : '') + '</span></button>';
  });
  if (part) html += '</details>';
  $('#basicCourseList').innerHTML = '<p class="course-note">公开课与中级校对稿按知识点跨课重组；实战案例放回对应知识课，已找到的课件原盘均已复排。</p>' + html;
  $$('[data-basic-id]', $('#basicCourseList')).forEach(function (b) {
    b.onclick = function () { show('basiclesson', b.dataset.basicId); };
  });
};

RENDER.basiclesson = function (id) {
  var body = $('#basicLessonBody');
  if (basicLessonById(id)) { paintBasicLesson(id); return; }
  body.innerHTML = '<p class="muted">正在取初中级课文…</p>';
  needBasicCourse().then(function () {
    if (cur.scr === 'basiclesson' && cur.id === id) paintBasicLesson(id);
  }).catch(function () { body.innerHTML = '<p class="muted">课文加载失败，检查网络后重试。</p>'; });
};
function paintBasicLesson(id) {
  var body = $('#basicLessonBody'), l = basicLessonById(id), list = M.basicList || [], k = -1;
  if (!l) { body.innerHTML = '<p class="muted">这一课还没写。</p>'; return; }
  $('#ttl').textContent = '初中级第' + l.num + '课';
  body.innerHTML = l.html;
  addBasicOverview(body, l);
  startLessonReadDelay('basiclesson', id, K.basicread);
  bindDoc(body); foldLessonSections(body); buildStickyPan(body); buildToc(l);
  list.forEach(function (x, i) { if (x.id === id) k = i; });
  $('#prevB').disabled = k <= 0; $('#nextB').disabled = k < 0 || k >= list.length - 1;
  $('#prevB').onclick = function () { if (k > 0) show('basiclesson', list[k - 1].id); };
  $('#nextB').onclick = function () { if (k < list.length - 1) show('basiclesson', list[k + 1].id); };
  if (pendingFind) { locate(body, pendingFind); pendingFind = null; }
  else {
    var ps = load(K.basicpos, {})[id] || 0;
    window.scrollTo(0, (load(K.basicread, {})[id] || 0) >= 95 ? 0 : ps);
  }
}

/* 「命理讲解」式的课前内容梳理：不再让读者打开一课后只看到一长串正文。
   目录项直接打开对应的大标题折叠块。 */
function addBasicOverview(body, lesson) {
  var hs = (lesson.heads || []).filter(function (h) { return h && h.a; });
  if (!hs.length) return;
  var nav = document.createElement('nav');
  nav.className = 'basic-overview';
  nav.setAttribute('aria-label', '本课内容梳理');
  nav.innerHTML = '<div class="basic-overview-h"><i>纲</i><b>本课内容梳理</b></div>' +
    '<div class="basic-overview-list">' + hs.map(function (h, i) {
      return '<button type="button" data-basic-anchor="' + esc(h.a) + '"><em>' +
        ('0' + (i + 1)).slice(-2) + '</em><span>' + esc(h.t) + '</span></button>';
    }).join('') + '</div>';
  var firstH2 = body.querySelector('h2');
  if (firstH2) body.insertBefore(nav, firstH2); else body.appendChild(nav);
  $$('[data-basic-anchor]', nav).forEach(function (b) {
    b.onclick = function () {
      var target = document.getElementById(b.dataset.basicAnchor);
      if (!target) return;
      openLessonFold(target);
      setTimeout(function () { target.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 20);
    };
  });
}

RENDER.lesson = function (id) {
  var body = $('#lessonBody');
  // 数据已在手 → 同步画，别让读者看见一帧空白（测试也才验得到真渲染）
  if (lessonById(id)) { paintLesson(id); return; }
  body.innerHTML = '<p class="muted">正在取课文…</p>';
  needCourse().then(function () {
    if (cur.scr === 'lesson' && cur.id === id) paintLesson(id);
  }).catch(function () {
    body.innerHTML = '<p class="muted">课文加载失败，检查网络后重试。</p>';
  });
};
function paintLesson(id) {
  var body = $('#lessonBody'), l = lessonById(id);
  if (!l) { body.innerHTML = '<p class="muted">这一课还没写。</p>'; return; }
  $('#ttl').textContent = '第' + l.num + '课';
  body.innerHTML = l.html;
  startLessonReadDelay('lesson', id, K.read);
  bindDoc(body);
  foldLessonSections(body);
  buildStickyPan(body);
  buildToc(l);
  var list = M.list || [], k = -1;
  list.forEach(function (x, i) { if (x.id === id) k = i; });
  $('#prevL').disabled = k <= 0;
  $('#nextL').disabled = k < 0 || k >= list.length - 1;
  $('#prevL').onclick = function () { if (k > 0) show('lesson', list[k - 1].id); };
  $('#nextL').onclick = function () { if (k < list.length - 1) show('lesson', list[k + 1].id); };
  // 定位：搜索跳转优先，否则回到上次读到的位置（读完过的不再跳回）
  if (pendingFind) { locate(body, pendingFind); pendingFind = null; }
  else {
    var ps = load(K.pos, {})[id] || 0;
    window.scrollTo(0, (load(K.read, {})[id] || 0) >= 95 ? 0 : ps);
  }
}

/* 课程正文按最大的分节标题（h2）折叠。
   标题仍保留原 id；从目录或搜索定位时，会先自动展开所在章节。 */
function foldLessonSections(root) {
  var hs = [].slice.call(root.children).filter(function (el) { return el.tagName === 'H2'; });
  hs.forEach(function (h) {
    var details = document.createElement('details');
    details.className = 'lesson-sec';
    var summary = document.createElement('summary');
    var content = document.createElement('div');
    content.className = 'lesson-sec-body';
    root.insertBefore(details, h);
    details.appendChild(summary);
    summary.appendChild(h);
    details.appendChild(content);
    while (details.nextSibling && details.nextSibling.tagName !== 'H2') {
      content.appendChild(details.nextSibling);
    }
  });
}

/* 附篇、格局、毕法与案例详情同样按“最大的正文标题”折叠。
   - 文档第一个 h1 是页名，保留常显；后续 h1 与全部 h2 才是分节。
   - 上一篇／下一篇导航留在折叠外，不能被最后一节一起吞进去。
   - 仍沿用 lesson-sec，使搜索定位与目录打开章节的逻辑保持一致。 */
function foldLongDocument(root) {
  if (!root || [].slice.call(root.children).some(function (el) { return el.classList && el.classList.contains('long-sec'); })) return;
  var kids = [].slice.call(root.children), firstH1 = kids.filter(function (el) { return el.tagName === 'H1'; })[0];
  var hs = kids.filter(function (el) { return el.tagName === 'H2' || (el.tagName === 'H1' && el !== firstH1); });
  function isPager(el) {
    return el && el.nodeType === 1 && el.classList.contains('row') &&
      !!el.querySelector('#gePrev,#geNext,#bfPrev,#bfNext,#qPrev,#qNext,#mfPrev,#mfNext,#tjPrev,#tjNext');
  }
  function isHead(el) { return hs.indexOf(el) >= 0; }
  hs.forEach(function (h) {
    if (!h.parentNode || h.parentNode !== root) return;
    var details = document.createElement('details');
    details.className = 'lesson-sec long-sec';
    var summary = document.createElement('summary'), content = document.createElement('div');
    content.className = 'lesson-sec-body';
    root.insertBefore(details, h); details.appendChild(summary); summary.appendChild(h); details.appendChild(content);
    while (details.nextSibling && !isHead(details.nextSibling) && !isPager(details.nextSibling)) {
      content.appendChild(details.nextSibling);
    }
  });
}
function openLessonFold(el) {
  var d = el && el.nodeType === 1 ? el.closest('details.lesson-sec') :
          el && el.parentElement ? el.parentElement.closest('details.lesson-sec') : null;
  if (d) d.open = true;
}

RENDER.outline = function () {
  $('#outlineBody').innerHTML = M.outline || '';
  bindDoc($('#outlineBody'));
  foldLongDocument($('#outlineBody'));
};

RENDER.lab = function () {
  if ($('#s-yj').options.length) { labUpdate(); return; }
  Z.forEach(function (z) {
    $('#s-yj').add(new Option(z + '将（' + SHEN[z] + '）· ' + YJM[z], z));
    $('#s-zs').add(new Option(z + '时', z));
  });
  '甲乙丙丁戊己庚辛壬癸'.split('').forEach(function (g) { $('#s-gan').add(new Option(g + '日', g)); });
  $('#s-yj').value = '未'; $('#s-zs').value = '巳'; $('#s-gan').value = '丙';
  labZhiOpts();
  // ⚠️ 用 onchange 属性不用 addEventListener：smoke.js 直接调 .onchange() 驱动
  ['#s-yj', '#s-zs', '#s-zhi'].forEach(function (s) { $(s).onchange = labUpdate; });
  $('#s-gan').onchange = function () { labZhiOpts(); labUpdate(); };
  labUpdate();
};
// 日支只给与日干同阴阳的六个（六十甲子里没有阴阳错配的日子）
function labZhiOpts() {
  var g = $('#s-gan').value, gi = '甲乙丙丁戊己庚辛壬癸'.indexOf(g), old = $('#s-zhi').value;
  $('#s-zhi').innerHTML = '';
  Z.forEach(function (z, i) { if (i % 2 === gi % 2) $('#s-zhi').add(new Option(z, z)); });
  if (old && Z.indexOf(old) % 2 === gi % 2) $('#s-zhi').value = old;
}
function labUpdate() {
  var yj = $('#s-yj').value, zs = $('#s-zs').value, gan = $('#s-gan').value;
  var tp = tianpan(yj, zs), r = tianjiang(gan, zs, tp);
  $('#labPan').innerHTML = panHTML(tp, r.tj, gan + '日 ' + zs + '时<br>' + yj + '将');
  var off = (Z.indexOf(yj) - Z.indexOf(zs) + 12) % 12;
  var zhou = ZHOU.indexOf(zs) >= 0;
  $('#labRead').innerHTML =
    '<b>' + yj + '将加' + zs + '时</b>：' +
    (off ? '天盘整体转了 <b>' + off + '</b> 位。' : '月将与占时同支，天地盘重合＝<b>伏吟</b>。') +
    '<br>' + gan + '日 ' + zs + '时属<b>' + (zhou ? '昼' : '夜') + '</b>（' +
    (zhou ? '卯至申' : '酉至寅') + '）→ 用' + (zhou ? '昼' : '夜') + '贵 <b>' + r.gr + '</b>；' +
    '天盘' + r.gr + '临地盘 <b>' + r.dp + '</b> → 天将<b>' + (r.shun ? '顺行' : '逆行') + '</b>。';
  bindPan($('#labPan'));
  if (typeof window.labFullRender === 'function') window.labFullRender(gan + $('#s-zhi').value, yj, zs);   // 四课三传与成格／毕法初判，见下面 labFullRender
}

/* 起盘台的成格／毕法判定在 pan-detect.js（40 KB，_tools/_mk_detect.py 生成），只在起盘台用——按需加载，带 ?v=。 */
var PD = window.PanDetect || null, _pdLoading = null;
function needDetect() {
  if (PD) return Promise.resolve(PD);
  if (_pdLoading) return _pdLoading;
  _pdLoading = new Promise(function (res, rej) {
    var el = document.createElement('script');
    el.src = ASSET + 'pan-detect.js?v=' + VER;
    el.onload = function () { PD = window.PanDetect; res(PD); };
    el.onerror = function () { _pdLoading = null; rej(new Error('判定脚本加载失败')); };
    document.head.appendChild(el);
  });
  return _pdLoading;
}
/* ── 起盘台下半：四课三传＋课体＋格局＋毕法／八煞九宝初判 ──
   旧版六壬神课 App 的「自选起课器」并入。⚠️ 只列程序能判准的条目（App 原则：绝不含糊断）；
   有些格还要年命、太岁才判得全，这里没输入这些，命中的也只是「盘面条件成立」。 */
window.labFullRender = function (rgz, yj, zs) {
  var box = $('#labFull'); if (!box) return;
  if (!PD) { needDetect().then(function () { window.labFullRender(rgz, yj, zs); }); return; }
  var st = PD.makeState(rgz, yj, zs);
  if (!st) { box.innerHTML = ''; return; }
  var h = '<div class="card"><div class="dke"><em>四课</em><table><tr>' + st.sk.slice().reverse().map(function (c, i) {
    return '<td><span class="n">第' + '四三二一'.charAt(i) + '课</span><b>' + c.s + '</b><i>' + c.x + '</i></td>';
  }).join('') + '</tr></table></div>' +
    '<p style="margin:10px 0 4px"><b>三传</b>　初 <b>' + st.cc + '</b> → 中 <b>' + st.zc + '</b> → 末 <b>' + st.mc + '</b>　<span class="muted">' + esc(st.mt) + '</span></p>' +
    '<p class="muted" style="margin:0">旬空：' + st.xi.xun + ' ' + st.xi.k.join('') + '</p></div>';
  var hits = PD.k64Detect(st);
  h += '<div class="card"><b>本盘成格</b>（六十四课经，程序初判）<div class="chips" style="margin-top:6px">' +
    (hits.length ? hits.map(function (n) { return '<span class="chip">' + esc(n) + '</span>'; }).join('') : '<span class="muted">无</span>') + '</div></div>';
  var bf = PD.bfDetect(st);
  h += '<div class="card"><b>可程序判定的毕法</b>' + (bf.length ? bf.map(function (r) {
    return '<p style="margin:6px 0"><b>' + esc(r[0]) + '</b>　' + esc(r[1]) + '</p>';
  }).join('') : '<p class="muted">本课没有命中能程序判定的毕法格局，到「毕法赋」按课体逐条对照。</p>') + '</div>';
  var bj = PD.bjDetect(st);
  if (bj && (bj.sha.length || bj.bao.length)) {
    h += '<div class="card"><b>八煞九宝</b>' +
      (bj.sha.length ? '<p style="margin:6px 0"><span class="muted">八煞：</span>' + bj.sha.map(function (x) { return esc(x.n + '·' + x.d); }).join('；') + '</p>' : '') +
      (bj.bao.length ? '<p style="margin:6px 0"><span class="muted">九宝：</span>' + bj.bao.map(function (x) { return esc(x.n + '·' + x.d); }).join('；') + '</p>' : '') + '</div>';
  }
  box.innerHTML = h;
};

/* ── 吸顶盘 ───────────────────────────────────────────
   八字四柱压成一条钉在顶栏下就行，六壬方盘 330px 见方，照搬会吃掉半屏。
   通用课文吸顶**四课＋三传**；王牧夫案例再在最前面列原案现存的年月日时，
   顺序固定为「年月日时 → 四课 → 三传」。讲解里指代的几乎都是这些（发用／支上神／日上神／中传），
   天地盘反而查得少；要看全盘点一下这条就弹出来。
   ⚠️ 纯 CSS position:sticky，**绝不加"滚过才显示"的开关**：IntersectionObserver
      在套壳 iframe 里时灵时不灵，scroll 事件在 iframe 内编程滚动压根不触发，而 sticky 一直是好的。 */
function buildStickyPan(body, cal) {
  var old = $('#stickyPan'); if (old) old.remove();
  var ke = body.querySelector('.sike'), sc = body.querySelector('.sanchuan'),
      pan = body.querySelector('.pan');
  if (!ke && !sc) return;
  var box = document.createElement('div');
  box.id = 'stickyPan';
  box.className = 'stickypan';
  var h = '';
  if (cal && cal.length) {
    h += '<div class="sp-time"><em>四柱</em>' + cal.map(function (x) {
      var v = x.v || '', g = '', z = v;
      // 原文给足干支时按八字排法拆成「干在上、支在下」。
      // 只给月名／时支时，干位留空，绝不把缺失信息硬算出来。
      if (/^[甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥]$/.test(v)) {
        g = v.charAt(0); z = v.charAt(1);
      } else if (x.k === '月' && /^[子丑寅卯辰巳午未申酉戌亥]月$/.test(v)) {
        z = v.charAt(0);
      }
      return '<span class="spt"><i>' + esc(x.k) + '</i>' +
        '<b class="pg">' + (g ? esc(g) : '&nbsp;') + '</b>' +
        '<b class="pz">' + esc(z) + '</b></span>';
    }).join('') + '</div>';
  }
  if (ke) {
    var cells = [].slice.call(ke.querySelectorAll('.ke')).map(function (k) {
      var t = k.querySelector('.tj'), u = k.querySelector('.up'), d = k.querySelector('.dn');
      return '<i>' + (t ? t.textContent : '') + '</i>' +
        (u ? u.outerHTML : '') + '<s>' + (d ? d.textContent : '') + '</s>';
    });
    h += '<div class="sp-ke"><em>四课</em>' +
      cells.map(function (c, i) {
        return '<span class="spc' + (i === 3 ? ' day' : '') + '">' + c + '</span>';
      }).join('') + '</div>';
  }
  if (sc) {
    var zs = [].slice.call(sc.querySelectorAll('.cr .z')).map(function (z) { return z.outerHTML; });
    h += '<div class="sp-sc"><em>三传</em>' + zs.join('<b>›</b>') + '</div>';
  }
  h += '<span class="sp-more">' + (pan ? '全盘' : '') + '</span>';
  box.innerHTML = h;
  body.insertBefore(box, body.firstChild.nextSibling || body.firstChild);
  // 吸顶内容在手机上可横向拖动；拖动不能被误判成「点开全盘」。
  // 只记录位移，不接管浏览器原生滚动，保证触摸惯性仍然有效。
  var downX = 0, downY = 0, dragged = false;
  box.addEventListener('pointerdown', function (e) {
    downX = e.clientX; downY = e.clientY; dragged = false;
  });
  box.addEventListener('pointermove', function (e) {
    if (Math.abs(e.clientX - downX) > 6 || Math.abs(e.clientY - downY) > 6) dragged = true;
  });
  box.onclick = function () {
    if (dragged) { dragged = false; return; }
    showPanSheet(body);
  };
}
function showPanSheet(body) {
  var mask = $('#tocMask'), box = $('.tocbox', mask);
  var parts = ['<div class="sheet-grip" role="separator" aria-label="上下拖动调节全盘高度" tabindex="0"><i></i><span>拖动调节</span></div>',
    '<div class="toch">本课课盘</div>'];
  // 熟悉盘式：每组固定「三传 → 四课 → 天地盘」，而不是正文里的讲解顺序。
  var pans = [].slice.call(body.querySelectorAll('.panwrap')),
      kes = [].slice.call(body.querySelectorAll('.sike')),
      chuans = [].slice.call(body.querySelectorAll('.sanchuan')),
      groups = Math.max(pans.length, kes.length, chuans.length);
  for (var i = 0; i < groups; i++) {
    parts.push('<div class="sheet-pan-group">' +
      (chuans[i] ? chuans[i].outerHTML : '') +
      (kes[i] ? kes[i].outerHTML : '') +
      (pans[i] ? pans[i].outerHTML : '') + '</div>');
  }
  box.classList.add('pan-sheet');
  var maxH = Math.max(260, window.innerHeight - 58);
  box.style.height = Math.min(maxH, _panSheetHeight || Math.round(window.innerHeight * .72)) + 'px';
  box.innerHTML = parts.join('');
  mask.classList.add('on');
  decoratePanSheet(box, body);
  bindPanSheetResize(box);
  bindPan(box);
}

function decoratePanSheet(box, sourceBody) {
  var groups = $$('.sheet-pan-group', box);
  groups.forEach(function (group) {
    var ke = $('.sike', group), sc = $('.sanchuan', group), pan = $('.pan', group);
    var dayGan = '', dayZhi = '';
    if (ke) {
      $$('.ke', ke).forEach(function (k) {
        var note = $('.nt', k), dn = $('.dn', k);
        if (!note || !dn) return;
        if (/日干/.test(note.textContent)) dayGan = dn.textContent.trim().charAt(0);
        if (/日支/.test(note.textContent)) dayZhi = dn.textContent.trim().charAt(0);
      });
    }

    // 三传改成参考图的横向字段次序：六亲、遁干、传支、天将；初中末标签保留作辅助。
    var marks = {};
    if (sc) {
      $$('.cr', sc).forEach(function (row) {
        var lab = $('.lb', row), z = $('.z', row), ex = $('.ex', row);
        if (!z) return;
        var shortLab = lab ? lab.textContent.replace('传', '') : '';
        (marks[z.textContent.trim()] = marks[z.textContent.trim()] || []).push(shortLab);
        if (!ex || $('.sx-kin', ex)) return;   // 已装饰过（课文里的盘再被全盘弹层复制时）
        var vals = ex.textContent.trim().split(/[　]+/).filter(Boolean);
        var kinMap = { '父母': '父', '兄弟': '兄', '子孙': '子', '妻财': '财', '官鬼': '官' };
        var kinFull = vals.filter(function (v) { return kinMap[v]; })[0] || '',
            dunGan = vals.filter(function (v) { return /^[甲乙丙丁戊己庚辛壬癸]$/.test(v); })[0] || '○',
            jiangFull = '', jiang = '';
        var kin = kinMap[kinFull] || kinFull;
        vals.some(function (v) {
          if (TJN.indexOf(v) >= 0 || Object.keys(TJFULL).some(function (k) { return TJFULL[k] === v; })) {
            jiangFull = v; return true;
          }
          return false;
        });
        jiang = jiangFull;
        Object.keys(TJFULL).some(function (k) {
          if (TJFULL[k] === jiang) { jiang = k; return true; }
          return false;
        });
        var notes = vals.filter(function (v) {
          return v !== kinFull && v !== dunGan && v !== jiangFull && v !== '—';
        });
        ex.innerHTML = '<span class="sx-kin">' + esc(kin) + '</span>' +
          '<span class="sx-dun">' + esc(dunGan) + '</span>' +
          '<span class="sx-jiang">' + esc(jiang) + '</span>' +
          (notes.length ? '<span class="sx-note" title="' + esc(notes.join('·')) + '">' + (/空/.test(notes.join('')) ? '空' : esc(notes.join('·'))) + '</span>' : '');
      });
    }

    if (!pan) return;
    var dun = xunDun(dayGan, dayZhi);
    $$('.gong', pan).forEach(function (gong) {
      var tp = $('.tp', gong), dp = $('.dp', gong), tj = $('.tj', gong);
      if (!tp || !dp || $('.gline', gong)) return;
      var z = tp.textContent.trim(), line = document.createElement('span');
      line.className = 'gline';
      var dg = document.createElement('span'); dg.className = 'dg'; dg.textContent = dun[z] || (dayGan && dayZhi ? '○' : '');
      tp.parentNode.insertBefore(line, tp); line.appendChild(dg); line.appendChild(tp);
      if (tj) tj.title = TJFULL[tj.textContent.trim()] || tj.textContent.trim();
      if ((marks[z] || []).length) gong.classList.add('sc');
      (marks[z] || []).forEach(function (m) {
        var badge = document.createElement('span'); badge.className = 'chuan-mark'; badge.textContent = m;
        gong.appendChild(badge);
      });
    });

    var mid = $('.panmid', pan), ge = '';
    [].slice.call(sourceBody.querySelectorAll('p')).some(function (p) {
      var strong = p.querySelector('strong');
      if (!strong || strong.textContent.trim() !== '格') return false;
      ge = p.textContent.replace(/^格\s*[：:]?\s*/, '').split(/[·，。]/)[0].trim();
      return true;
    });
    if (mid && !mid.querySelector('span') && (dayGan || dayZhi || ge)) {
      mid.innerHTML = (dayGan || dayZhi ? '<b>' + esc(dayGan + dayZhi + '日') + '</b>' : '') +
        (ge ? '<span>' + esc(ge) + '</span>' : '');
    }
  });
}

function xunDun(dayGan, dayZhi) {
  var G = '甲乙丙丁戊己庚辛壬癸'.split(''), out = {};
  var gi = G.indexOf(dayGan), zi = Z.indexOf(dayZhi);
  if (gi < 0 || zi < 0) return out;
  var start = (zi - gi + 12) % 12;
  G.forEach(function (g, i) { out[Z[(start + i) % 12]] = g; });
  return out;
}

var _panSheetHeight = 0;
function bindPanSheetResize(box) {
  var grip = $('.sheet-grip', box), active = false, pointer = null, startY = 0, startH = 0;
  function limits() {
    return { min: Math.min(260, Math.max(180, Math.round(window.innerHeight * .32))),
      max: Math.max(260, window.innerHeight - 58) };
  }
  function setHeight(h) {
    var lim = limits();
    h = Math.max(lim.min, Math.min(lim.max, h));
    box.style.height = Math.round(h) + 'px';
    _panSheetHeight = Math.round(h);
  }
  function stop(e) {
    if (!active) return;
    active = false; box.classList.remove('resizing');
    if (grip.releasePointerCapture && pointer !== null) {
      try { grip.releasePointerCapture(pointer); } catch (_) {}
    }
    pointer = null;
    if (e) e.preventDefault();
  }
  grip.onpointerdown = function (e) {
    active = true; pointer = e.pointerId; startY = e.clientY; startH = box.getBoundingClientRect().height;
    box.classList.add('resizing');
    if (grip.setPointerCapture) grip.setPointerCapture(pointer);
    e.preventDefault();
  };
  grip.onpointermove = function (e) {
    if (!active || (pointer !== null && e.pointerId !== pointer)) return;
    setHeight(startH + startY - e.clientY);
    e.preventDefault();
  };
  grip.onpointerup = stop;
  grip.onpointercancel = stop;
  grip.onkeydown = function (e) {
    if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
    setHeight(box.getBoundingClientRect().height + (e.key === 'ArrowUp' ? 40 : -40));
    e.preventDefault();
  };
}

/* 课内目录：一课上万字，没这个只能靠搜 */
function buildToc(l) {
  // ⚠️ 目录与「全盘」共用这一个浮层，各自重建整块内容——
  //    早先目录容器是写死在 html 里的，点过全盘后它就被覆盖掉，再点目录直接崩。
  var box = $('.tocbox');
  box.classList.remove('pan-sheet', 'resizing');
  box.style.removeProperty('height');
  var hs = (l.heads || []);
  box.innerHTML = '<div class="toch">本课目录</div><div id="tocList">' + (hs.length
    ? hs.map(function (h) { return '<button class="toci" data-a="' + h.a + '">' + h.t + '</button>'; }).join('')
    : '<p class="muted">本课没有分节。</p>') + '</div>';
  $$('.toci', box).forEach(function (b) {
    b.onclick = function () {
      $('#tocMask').classList.remove('on');
      var el = document.getElementById(b.dataset.a);
      if (el) { openLessonFold(el); el.scrollIntoView({ block: 'start' }); }
    };
  });
}

/* 正文里的式盘：点一格，中间说出这一格怎么读 */
/* 课文里的式盘中宫原来是空的：从盘上方紧邻的文字里读出日柱／月将／占时填上（读不到就留空，不编）。 */
function fillPanMid(root) {
  $$('.panwrap', root).forEach(function (w) {
    var mid = $('.panmid', w);
    if (!mid || mid.textContent.trim()) return;
    var txt = '', el = w.previousElementSibling, n = 0;
    while (el && n < 8) {
      txt = el.textContent + ' ' + txt;
      if (/^H[1-6]$/.test(el.tagName)) break;
      el = el.previousElementSibling; n++;
    }
    var Zc = '子丑寅卯辰巳午未申酉戌亥', Gc = '甲乙丙丁戊己庚辛壬癸';
    var d = txt.match(new RegExp('([' + Gc + '][' + Zc + '])日'));
    var j = txt.match(new RegExp('月将[：:]\\s*([' + Zc + '])')) || txt.match(new RegExp('([' + Zc + '])[土木火金水]?将'));
    var t = txt.match(new RegExp('占时[：:]\\s*([' + Zc + '])')) || txt.match(new RegExp('[' + Gc + '](['  + Zc + '])时'));
    if (!d && !j && !t) return;
    mid.innerHTML = (d ? '<b>' + d[1] + '日</b>' : '') + (j ? '<span>' + j[1] + '将</span>' : '') +
      (t ? '<span>' + t[1] + '时</span>' : '');
  });
}
function bindPan(root) {
  fillPanMid(root);
  $$('.pan .gong', root).forEach(function (g) {
    g.onclick = function () {
      var p = g.closest('.pan'), mid = $('.panmid', p);
      $$('.gong', p).forEach(function (x) { x.classList.remove('hi'); });
      g.classList.add('hi');
      if (!mid) return;
      if (!mid.dataset.orig) mid.dataset.orig = mid.innerHTML;
      var tp = $('.tp', g).textContent, dp = $('.dp', g).textContent, tj = $('.tj', g).textContent;
      mid.innerHTML = tp ? ('<b style="color:var(--ink)">' + tp + ' 加 ' + dp + '</b>' +
        (tj ? '<br>乘 ' + (TJFULL[tj] || tj) : '')) : mid.dataset.orig;
    };
  });
}
/* 课文里的盘原稿顺序是 天地盘→四课→三传；统一改成旧版习惯的 三传→四课→式盘。
   「单元」＝盘块＋它上方的小标签段（如「天地盘」「四课」「三传」）；只重排相邻的完整一组，原文不动。 */
function reorderPans(root) {
  var RANK = { sanchuan: 0, sike: 1, panwrap: 2 };
  function kind(el) {
    if (!el || !el.classList) return null;
    return el.classList.contains('sanchuan') ? 'sanchuan' : el.classList.contains('sike') ? 'sike' :
           el.classList.contains('panwrap') ? 'panwrap' : null;
  }
  function isLabel(el) {
    return el && el.tagName === 'P' && el.textContent.trim().length <= 40 &&
      /^(天地盘|四课|三传)/.test(el.textContent.trim()) && !kind(el);
  }
  var parents = [];
  $$('.panwrap, .sike, .sanchuan', root).forEach(function (el) {
    if (el.parentNode && parents.indexOf(el.parentNode) < 0) parents.push(el.parentNode);
  });
  parents.forEach(function (par) {
    var kids = [].slice.call(par.children), i = 0;
    while (i < kids.length) {
      // 收集连续的单元：[标签]+盘块
      var units = [], j = i;
      while (j < kids.length) {
        var lab = null, k = j;
        if (isLabel(kids[k]) && kind(kids[k + 1])) { lab = kids[k]; k++; }
        if (!kind(kids[k])) break;
        units.push({ els: lab ? [lab, kids[k]] : [kids[k]], kind: kind(kids[k]) });
        j = k + 1;
      }
      var kinds = units.map(function (u) { return u.kind; });
      if (units.length >= 2 && new Set(kinds).size === units.length) {
        var sorted = units.slice().sort(function (a, b) { return RANK[a.kind] - RANK[b.kind]; });
        var same = sorted.every(function (u, n) { return u === units[n]; });
        if (!same) {
          var anchor = units[units.length - 1].els.slice(-1)[0].nextSibling;
          sorted.forEach(function (u) { u.els.forEach(function (e) { par.insertBefore(e, anchor); }); });
        }
        if (kinds.length === 3) {            // 三传/四课/式盘齐了：包成一组，套上与全盘弹层相同的装饰
          var wrap = document.createElement('div');
          wrap.className = 'sheet-pan-group inline-pan';
          par.insertBefore(wrap, sorted[0].els[0]);
          sorted.forEach(function (u) { u.els.forEach(function (e) { wrap.appendChild(e); }); });
        }
      }
      i = Math.max(j, i + 1);
    }
  });
}

/* 标题自适应：标题末尾的「（2026-08-06 追加）」「（面授班）」这类小注缩成小字、整体不拆开；
   标题本身用 balance 均衡断行，不再因为小注就孤零零换一行。 */
function tidyHeadings(root) {
  $$('h1, h2, h3, h4', root).forEach(function (h) {
    if (h.querySelector('.ht')) return;
    var host = h.querySelector('.mht') || h, n = host.lastChild;
    while (n && n.nodeType === 1 && /^(CODE|SPAN)$/.test(n.tagName) && !n.textContent.trim()) n = n.previousSibling;
    if (!n || n.nodeType !== 3) return;
    var m = n.nodeValue.match(/^([\s\S]*?\S)\s*([（(][^（()）]{1,18}[）)])\s*$/);
    if (!m || m[1].replace(/[^一-龥A-Za-z0-9]/g, '').length < 3) return;
    n.nodeValue = m[1] + ' ';
    var sm = document.createElement('small');
    sm.className = 'ht';
    sm.textContent = m[2];
    n.parentNode.insertBefore(sm, n.nextSibling);
  });
}
function bindDoc(root) {
  tidyHeadings(root);
  fillPanMid(root);
  reorderPans(root);
  decoratePanSheet(root, root);
  bindPan(root);
  // ⚠️ 编号 ≥ 90 的是附篇，不在 M.list 里，各有各的屏——
  //    只按 lesson 路由的话，[[96-象法速查]] 这类链接点了没反应。
  var EXTRA_ROUTE = { '93': ['jinsuo', null], '94': ['extra', 'liuyuan'], '95': ['extra', 'bayao'],
                      '96': ['xflist', null], '97': ['bflist', null],
                      '98': ['gelist', null], '99': ['qlist', null] };
  $$('a.wiki', root).forEach(function (a) {
    a.onclick = function () {
      var t = a.dataset.wiki || '', m = t.match(/^(\d\d)-/);
      if (!m) return;
      var hn = t.match(/#(\d+)$/);   // 97-#12／98-#5：直达那一法、那一格
      if (hn && (m[1] === '97' || m[1] === '98')) { show(m[1] === '97' ? 'bifa' : 'ge', +hn[1]); return; }
      var r = EXTRA_ROUTE[m[1]];
      if (!r && /^(8\d|9[0-2])$/.test(m[1])) r = ['extra', 'x' + m[1]];   // App 存档 80–92
      if (r) { show(r[0], r[1]); return; }
      var id = 'L' + m[1];
      if ((M.list || []).some(function (x) { return x.id === id; })) show('lesson', id);
    };
  });
}

var REF_MODE = 'main';
RENDER.ref = function () {
  var box = $('#rq');
  if (!box._bound) {
    box._bound = true;
    var t = null;
    box.oninput = function () { clearTimeout(t); t = setTimeout(paintRef, 160); };
  }
  $$('.ref-switch button').forEach(function (b) {
    if (!b._bound) {
      b._bound = true;
      b.onclick = function () {
        REF_MODE = b.dataset.refMode;
        $$('.ref-switch button').forEach(function (x) { x.classList.toggle('on', x === b); });
        box.value = '';
        box.placeholder = REF_MODE === 'review' ? '搜复习卡，如：三传 贵人 月将 应期'
          : REF_MODE === 'basic'
          ? '搜初中级要点，如：涉害 旺衰 求财 应期'
          : '搜表名或表里的字，如：寄宫 驿马 涉害';
        paintRef();
      };
    }
    b.classList.toggle('on', b.dataset.refMode === REF_MODE);
  });
  paintRef();
};
function paintRef() {
  if (REF_MODE === 'review') {
    if (window.DATA_REVIEW) { renderReview(window.DATA_REVIEW); return; }
    $('#refList').innerHTML = '<p class="muted">正在取复习卡…</p>';
    needReview().then(renderReview).catch(function () {
      $('#refList').innerHTML = '<p class="muted">复习卡加载失败，检查网络后重试。</p>';
    });
    return;
  }
  if (REF_MODE === 'basic') {
    if (window.DATA_BASIC_REF) { renderBasicRef(window.DATA_BASIC_REF); return; }
    $('#refList').innerHTML = '<p class="muted">正在取初中级速查…</p>';
    needBasicRef().then(renderBasicRef).catch(function () {
      $('#refList').innerHTML = '<p class="muted">初中级速查加载失败，检查网络后重试。</p>';
    });
    return;
  }
  // 数据已在手就同步画，别让读者看见一帧空白（与课文、搜索的处理一致）
  if (window.DATA_REF) { renderRef(window.DATA_REF); return; }
  $('#refList').innerHTML = '<p class="muted">正在取速查表…</p>';
  needRef().then(renderRef).catch(function () {
    $('#refList').innerHTML = '<p class="muted">速查表加载失败，检查网络后重试。</p>';
  });
}
function renderRef(all) {
  var out = $('#refList'), kw = $('#rq').value.trim();
  var words = kw.split(/\s+/).filter(Boolean);
  var hit = (all || []).filter(function (r) {
    return words.every(function (w) {
      return (r.name + r.sec + r.lesson + r.text).indexOf(w) >= 0;
    });
  });
  if (!hit.length) { out.innerHTML = '<p class="muted">没找到这张表。换个词试试。</p>'; return; }
  var html = '', cur2 = -1;
  hit.forEach(function (r) {
    if (r.num !== cur2) {
      cur2 = r.num;
      html += '<div class="refg"><i>' + r.num + '</i><span>' + r.lesson + '</span></div>';
    }
    html += '<div class="refi"><button class="refh"><b>' + r.name +
      '</b><span>' + r.sec + '</span></button><div class="refb">' + r.html +
      '<button class="refj" data-id="L' + ('0' + r.num).slice(-2) + '">到第 ' + r.num + ' 课看讲解 ›</button></div></div>';
  });
  out.innerHTML = html;
  $$('.refi', out).forEach(function (d) {
    d.querySelector('.refh').onclick = function () {
      d.classList.toggle('open');
      if (d.classList.contains('open')) bindPan(d);
    };
    var j = d.querySelector('.refj');
    if (j) j.onclick = function (e) { e.stopPropagation(); show('lesson', j.dataset.id); };
  });
}
function renderBasicRef(all) {
  var out = $('#refList'), kw = $('#rq').value.trim();
  var words = kw.split(/\s+/).filter(Boolean);
  var hit = (all || []).filter(function (r) {
    return words.every(function (w) {
      return (r.name + r.part + r.lesson + r.text).indexOf(w) >= 0;
    });
  });
  if (!hit.length) { out.innerHTML = '<p class="muted">没找到这条要点。换个词试试。</p>'; return; }
  var html = '', curPart = '', curNum = -1;
  hit.forEach(function (r) {
    if (r.part !== curPart) {
      curPart = r.part;
      html += '<div class="refpart">' + esc(r.part) + '</div>';
    }
    if (r.num !== curNum) {
      curNum = r.num;
      html += '<div class="refg basic"><i>' + r.num + '</i><span>' + esc(r.lesson) + '</span></div>';
    }
    html += '<div class="refi"><button class="refh"><b>' + esc(r.name) +
      '</b><span>第 ' + r.num + ' 课</span></button><div class="refb">' + r.html +
      '<button class="refj" data-id="B' + ('0' + r.num).slice(-2) + '">到初中级第 ' + r.num + ' 课看上下文 ›</button></div></div>';
  });
  out.innerHTML = html;
  $$('.refi', out).forEach(function (d) {
    d.querySelector('.refh').onclick = function () { d.classList.toggle('open'); };
    var j = d.querySelector('.refj');
    if (j) j.onclick = function (e) { e.stopPropagation(); show('basiclesson', j.dataset.id); };
  });
}

/* ── 搜索 ─────────────────────────────────────────────
   1) 一课里的每一处都列出（上限 4 条），多的标「另有 N 处」
   2) 点结果滚到那一处并高亮，不是回到课文顶部
   3) 空格分隔＝多个词都要出现 */
RENDER.search = function () {
  var box = $('#q');
  setTimeout(function () { box.focus(); }, 60);
  if (box._bound) return;
  box._bound = true;
  var t = null;
  box.oninput = function () { clearTimeout(t); t = setTimeout(runSearch, 160); };
};
/* ⭐ 2026-10-22 起全站搜：课文之外，附篇（含旧版 App 存档）、格局、毕法、课例、象法一起搜。
   此前只搜 25 课，附篇里的东西（天时、口诀、八煞九宝…）搜不到等于没有。
   ⚠️ 各包都是按需加载的，第一次搜要等它们下完；任何一包失败不影响其余的。 */
var SRC = {}, SRC_ORDER = ['通解课文', '初中级课文', '附篇', '旧版 App 存档', '格局', '毕法赋', '课例', '王牧夫', '通解案例', '象法'], _srcStarted = false;
/* 先有什么搜什么，其余几包下完再补进结果——别让一包没下完（或下载失败）把整个搜索卡住。 */
function startSources(onMore) {
  if (_srcStarted) return; _srcStarted = true;
  var add = function (fn) { return function (d) { if (d) { fn(d); onMore(); } }; };
  var put = function (g, x) { (SRC[g] = SRC[g] || []).push(x); };
  needCourse().then(add(function (r) { SRC['通解课文'] = []; r.forEach(function (l) { put('通解课文', { g: '通解课文', t: '第' + l.num + '课 · ' + l.short, text: l.text, go: ['lesson', l.id], body: '#lessonBody' }); }); })).catch(function () {});
  needBasicCourse().then(add(function (r) { SRC['初中级课文'] = []; r.forEach(function (l) { put('初中级课文', { g: '初中级课文', t: '第' + l.num + '课 · ' + l.short, text: l.text, go: ['basiclesson', l.id], body: '#basicLessonBody' }); }); })).catch(function () {});
  needExtra().then(add(function (r) { r.forEach(function (x) { var g = /^x/.test(x.id) ? '旧版 App 存档' : '附篇'; put(g, { g: g, t: x.title.replace(/^大六壬\s*·\s*/, ''), text: x.text, go: ['extra', x.id], body: '#extraBody' }); }); })).catch(function () {});
  needGe().then(add(function (r) { r.forEach(function (x) { put('格局', { g: '格局', t: x.n + '. ' + x.name, text: x.text, go: ['ge', x.n], body: '#geBody' }); }); })).catch(function () {});
  needBifa().then(add(function (r) { r.forEach(function (x) { put('毕法赋', { g: '毕法赋', t: '第' + x.n + '法 · ' + x.ju, text: x.text, go: ['bifa', x.n], body: '#bfBody' }); }); })).catch(function () {});
  needQuiz().then(add(function (r) { (r.items || []).forEach(function (x) { put('课例', { g: '课例', t: '例' + x.n + ' · ' + x.title, text: x.text, go: ['quiz', x.n], body: '#quizBody' }); }); })).catch(function () {});
  needMufu().then(add(function (r) { (r || []).forEach(function (x) { put('王牧夫', { g: '王牧夫', t: '入门例' + x.n + ' · ' + x.title, text: x.text, go: ['mufu', x.n], body: '#mfBody' }); }); })).catch(function () {});
  Promise.all([needTongjie(), needTongjieSearch()]).then(add(function (pair) {
    var full = {}; (pair[1] || []).forEach(function (x) { full[x.id] = x.text; });
    (pair[0] || []).forEach(function (x) { put('通解案例', { g: '通解案例', t: x.volume + '册第' + x.n + '例 · ' + x.title, text: full[x.id] || x.text, go: ['tongjie', x.id], body: '#tjBody' }); });
  })).catch(function () {});
  needXf().then(add(function (r) { (r.items || []).forEach(function (x) { put('象法', { g: '象法', t: x.name, text: x.name + '　' + x.text, go: ['xflist', null], xf: x.name }); }); })).catch(function () {});
}
function srcList() {
  var out = [];
  SRC_ORDER.forEach(function (g) { out = out.concat(SRC[g] || []); });
  return out;
}
function runSearch() {
  var kw = $('#q').value.trim();
  var out = $('#sres');
  if (kw.length < 1) { out.innerHTML = ''; return; }
  startSources(function () { if ($('#q').value.trim()) paintSearch(srcList(), $('#q').value.trim().split(/\s+/).filter(Boolean)); });
  var words = kw.split(/\s+/).filter(Boolean);
  if (!srcList().length) { out.innerHTML = '<p class="muted">正在取全站内容…</p>'; return; }
  paintSearch(srcList(), words);
}
function paintSearch(all, words) {
  var out = $('#sres'), html = '', g = '', nDoc = 0, cnt = {};
  (all || []).forEach(function (d) {
    var txt = d.text || '';
    if (!words.every(function (w) { return txt.indexOf(w) >= 0; })) return;
    cnt[d.g] = (cnt[d.g] || 0) + 1;
    if (cnt[d.g] > 30) return;                       // 每类最多列 30 篇，别把页面撑爆
    nDoc++;
    if (d.g !== g) { g = d.g; html += '<div class="refg">' + esc(g) + '</div>'; }
    var w0 = words[0], idx = [], p = txt.indexOf(w0);
    while (p >= 0 && idx.length < 40) { idx.push(p); p = txt.indexOf(w0, p + w0.length); }
    var order = idx.slice();
    // 多词时优先显示其他词也在附近的那几处，否则只看得见第一个词、看不出关联
    if (words.length > 1) {
      order.sort(function (a, b) { return near(txt, b, words) - near(txt, a, words); });
    }
    var per = /课文$/.test(d.g) ? 4 : 2;
    order.slice(0, per).forEach(function (at) {
      var s = Math.max(0, at - 26), frag = txt.slice(s, at + 44);
      words.forEach(function (w) { frag = frag.split(w).join('\x01' + w + '\x02'); });
      frag = frag.replace(/[<>&]/g, function (c) {
        return { '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c];
      }).split('\x01').join('<em>').split('\x02').join('</em>');
      html += '<button class="sr" data-k="' + all.indexOf(d) + '"' + (/lesson$/.test(d.go[0]) ? ' data-id="' + d.go[1] + '"' : '') + ' data-kw="' + esc(w0) +
        '" data-occ="' + idx.indexOf(at) + '"><b>' + esc(d.t) + '</b><span>…' + frag + '…</span></button>';
    });
    if (idx.length > per) html += '<p class="muted">这里另有 ' + (idx.length - per) + ' 处</p>';
  });
  out.innerHTML = html || '<p class="muted">没找到。换个词试试，或用空格分成两个词。</p>';
  $$('.sr', out).forEach(function (b) {
    b.onclick = function () {
      var d = all[+b.dataset.k], find = { kw: b.dataset.kw, occ: +b.dataset.occ };
      if (d.go[0] === 'lesson' || d.go[0] === 'basiclesson') { show(d.go[0], d.go[1], find); return; }
      if (d.xf) {                                    // 象法屏自带筛选框：直接把条目名填进去
        show('xflist'); var q = $('#xq'); if (q) { q.value = d.xf; paintXf(); }
        return;
      }
      show(d.go[0], d.go[1]);
      locateWhenReady(d.body, find);
    };
  });
}
/* 附篇、格局、毕法、课例这几屏是异步铺内容的：等正文里出现关键词再定位。 */
function locateWhenReady(sel, find) {
  var n = 0, iv = setInterval(function () {
    var el = $(sel);
    if (el && el.textContent.indexOf(find.kw) >= 0) { clearInterval(iv); locate(el, find); }
    else if (++n > 40) clearInterval(iv);
  }, 50);
}
function near(txt, at, words) {
  var s = txt.slice(Math.max(0, at - 60), at + 60), n = 0;
  words.forEach(function (w) { if (s.indexOf(w) >= 0) n++; });
  return n;
}
/* 把关键词第 occ 次出现的地方滚到视野中并高亮。
   关键词常被行内标签劈开（如 巳<strong>申</strong>合），所以先把文本节点
   拼成一条串定位，再用 Range 映射回 DOM。 */
function locate(root, find) {
  var kw = find.kw, occ = find.occ || 0;
  var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
  var nodes = [], full = '', n;
  while ((n = walker.nextNode())) { nodes.push({ n: n, at: full.length }); full += n.nodeValue; }
  var p = -1;
  for (var k = 0; k <= occ; k++) p = full.indexOf(kw, p + 1);
  if (p < 0) { window.scrollTo(0, 0); return; }
  var start = null, end = null;
  nodes.forEach(function (it) {
    var a = it.at, b = it.at + it.n.nodeValue.length;
    if (start === null && p >= a && p < b) start = { node: it.n, off: p - a };
    if (end === null && p + kw.length > a && p + kw.length <= b) end = { node: it.n, off: p + kw.length - a };
  });
  if (!start) { window.scrollTo(0, 0); return; }
  openLessonFold(start.node);
  try {
    var r = document.createRange();
    r.setStart(start.node, start.off);
    r.setEnd(end ? end.node : start.node, end ? end.off : start.node.nodeValue.length);
    var mk = document.createElement('mark');
    mk.className = 'hit';
    r.surroundContents(mk);   // 跨节点会抛错 → 退化成滚到该段
    mk.scrollIntoView({ block: 'center' });
  } catch (e) {
    var el = start.node.parentElement;
    if (el) el.scrollIntoView({ block: 'center' });
  }
}

/* ── 阅读进度 ─────────────────────────────────────────── */
var _tick = null;
window.addEventListener('scroll', function () {
  if ((cur.scr !== 'lesson' && cur.scr !== 'basiclesson') || !cur.id) return;
  clearTimeout(_tick);
  _tick = setTimeout(function () {
    var h = document.documentElement.scrollHeight - window.innerHeight;
    var pct = h > 0 ? Math.min(100, Math.round(window.scrollY / h * 100)) : 100;
    var pk = cur.scr === 'basiclesson' ? K.basicpos : K.pos;
    saveLessonPct(pct);
    var ps = load(pk, {}); ps[cur.id] = window.scrollY; save(pk, ps);
  }, 220);
}, { passive: true });

/* ── 主题 ─────────────────────────────────────────────── */
// 两套主题照「六壬神课」App：薰衣草（默认）／朱雀红，按钮显示的是「点了会切到哪套」
var TNAME = { lav: '薰衣草', red: '朱雀红' };
function applyTheme(t) {
  t = t === 'red' ? 'red' : 'lav';
  document.documentElement.setAttribute('data-theme', t);
  var other = t === 'red' ? 'lav' : 'red';
  $('#btnTheme').textContent = TNAME[other];
  $('#btnTheme').setAttribute('aria-label', '配色：现在是' + TNAME[t] + '，点击切到' + TNAME[other]);
  var mc = document.querySelector('meta[name="theme-color"]');
  if (mc) mc.setAttribute('content', t === 'red' ? '#F5F0E6' : '#F3F0F9');
}
$('#btnTheme').onclick = function () {
  var next = load(K.theme, null) === 'red' ? 'lav' : 'red';
  save(K.theme, next);
  applyTheme(next);
};
applyTheme(load(K.theme, null));

/* ── 起动 ─────────────────────────────────────────────── */
$('#btnBack').onclick = function () { history.back(); };
$('#btnSearch').onclick = function () { show('search', null); };
$('#fabToc').onclick = function () {
  var basic = cur.scr === 'basiclesson';
  var body = basic ? $('#basicLessonBody') : $('#lessonBody');
  var l = basic ? basicLessonById(cur.id) : lessonById(cur.id);
  if (l) buildToc(l);
  $('#tocMask').classList.add('on');
};
$('#tocMask').onclick = function (e) { if (e.target === $('#tocMask')) $('#tocMask').classList.remove('on'); };
$$('.mi[data-go]').forEach(function (b) {
  // data-id 供「附篇」用——同一个 extra 屏要靠 id 分辨是源流还是八要素
  b.onclick = function () { show(b.dataset.go, b.dataset.id || null); };
});
/* 底栏：四个 tab 都是根屏。再点当前 tab＝回到顶部；跨 tab 切换把历史栈压回栈底，
   免得来回切堆出一长串历史（与命理精讲同一做法）。 */
$$('.tabbar button').forEach(function (b) {
  b.onclick = function () {
    var t = b.dataset.tab;
    if (t === cur.scr) { window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
    stack = [{ scr: t, id: null }];
    pos = 0;
    history.replaceState({ i: 0 }, '', '');
    _apply(t, null);
  };
});
if (window.self !== window.top) document.documentElement.classList.add('wst-frame-guard');
history.replaceState({ i: 0 }, '', '');
stack = [{ scr: 'home', id: null }];
pos = 0;
_apply('home', null);
if ('serviceWorker' in navigator) {
  window.addEventListener('load', function () {
    navigator.serviceWorker.register('sw.js').catch(function () {});
  });
}

// 测试钩子（smoke.js 用）：首页不再有「起课练习」入口（并进综合训练），测试直接走路由
window.__go = function (scr, id) { show(scr, id || null); };
