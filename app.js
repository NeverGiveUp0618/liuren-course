/* 六壬课程 · 路由 / 渲染 / 起盘台 / 搜索 / 阅读位置
   ⚠️ 内容全在 data/*.js（由 build.py 从 content/*.md 生成），本文件不放内容。 */
'use strict';
var $ = function (s, r) { return (r || document).querySelector(s); };
var $$ = function (s, r) { return [].slice.call((r || document).querySelectorAll(s)); };
var M = window.DATA_META || { counts: {}, plan: [], list: [] };

var K = {
  read: 'liuren_course_read', last: 'liuren_course_last', pos: 'liuren_course_pos',
  counts: 'liuren_course_counts', theme: 'liuren_course_theme'
};
function load(k, d) { try { return JSON.parse(localStorage.getItem(k)) || d; } catch (e) { return d; } }
function save(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }

/* ── 按需加载 data-course.js ───────────────────────────────
   ⚠️ 必须带 ?v=：微信 X5 会无视 query 按路径缓存，但其余浏览器靠它拿到新内容；
   只 bump sw 版本救不了这个按需加载的大文件。 */
var VER = encodeURIComponent(M.built || '0');
var _loading = null;
function needCourse() {
  if (window.DATA_COURSE) return Promise.resolve(window.DATA_COURSE);
  if (_loading) return _loading;
  _loading = new Promise(function (res, rej) {
    var s = document.createElement('script');
    s.src = 'data/data-course.js?v=' + VER;
    s.onload = function () { res(window.DATA_COURSE); };
    s.onerror = function () { _loading = null; rej(new Error('课文加载失败')); };
    document.head.appendChild(s);
  });
  return _loading;
}
var _refLoading = null;
function needRef() {
  if (window.DATA_REF) return Promise.resolve(window.DATA_REF);
  if (_refLoading) return _refLoading;
  _refLoading = new Promise(function (res, rej) {
    var el = document.createElement('script');
    el.src = 'data/data-ref.js?v=' + VER;      // ⚠️ 同 data-course.js，按需加载必须带 ?v=
    el.onload = function () { res(window.DATA_REF); };
    el.onerror = function () { _refLoading = null; rej(new Error('速查表加载失败')); };
    document.head.appendChild(el);
  });
  return _refLoading;
}
function lessonById(id) {
  var a = window.DATA_COURSE || [];
  for (var i = 0; i < a.length; i++) if (a[i].id === id) return a[i];
  return null;
}

/* ── 路由 ───────────────────────────────────────────────
   套壳 view.html 的 iframe 与顶层共享同一条 session history。若本站不碰
   history，读到课文深处一次侧滑会直接退出整个 App 回导航首页。
   所以：前进 pushState，回到栈上已有的屏用 history.go(-n) 折叠，
   popstate 只移动指针**绝不截断栈**（截断会让 forward 找不到原来那屏）。 */
var stack = [], pos = 0, cur = { scr: 'home', id: null };
var TITLES = { home: '六壬课程', course: '课程', lesson: '', outline: '学习路线',
               lab: '起盘台', search: '搜索', ref: '速查' };
var ROOTS = { home: 1 };
var pendingFind = null;

function _apply(scr, id) {
  cur = { scr: scr, id: id };
  $$('.screen').forEach(function (el) { el.classList.remove('active'); });
  var el = $('#s-' + scr);
  if (el) el.classList.add('active');
  $('#btnBack').classList.toggle('on', !ROOTS[scr]);
  $('#fabToc').classList.toggle('on', scr === 'lesson');
  $('#tocMask').classList.remove('on');
  $('#ttl').textContent = TITLES[scr] || '六壬课程';
  RENDER[scr] && RENDER[scr](id);
  if (scr !== 'search') save(K.last, { scr: scr, id: id });
  if (scr !== 'lesson') window.scrollTo(0, 0);
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
  var read = load(K.read, {}), done = 0;
  (M.list || []).forEach(function (l) { if ((read[l.id] || 0) >= 90) done++; });
  var total = (M.list || []).length || 1;
  $('#progPct').textContent = done + ' / ' + total + ' 课已读完';
  $('#progBar').style.width = Math.round(done / total * 100) + '%';
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
  save(K.counts, { lesson: c.lesson, planned: c.planned, done: done });
};

RENDER.course = function () {
  var read = load(K.read, {});
  var byId = {}; (M.list || []).forEach(function (l) { byId[l.num] = l; });
  var html = '', part = '';
  (M.plan || []).forEach(function (p) {
    if (p.part !== part) { part = p.part; html += '<div class="part">' + part + '</div>'; }
    var l = byId[p.num];
    if (l) {
      var pct = read[l.id] || 0;
      html += '<button class="li" data-id="' + l.id + '"><span class="n">' + p.num +
        '</span><span class="t"><b>' + l.short + '</b><span>' + (l.line || p.line) +
        '</span></span><span class="mark">' + (pct >= 90 ? '已读' : pct > 0 ? pct + '%' : '') +
        '</span></button>';
    } else {
      html += '<div class="li todo"><span class="n">' + p.num +
        '</span><span class="t"><b>' + p.title + '</b><span>' + p.line +
        '</span></span><span class="mark">待写</span></div>';
    }
  });
  $('#courseList').innerHTML = html;
  $$('#courseList .li[data-id]').forEach(function (b) {
    b.onclick = function () { show('lesson', b.dataset.id); };
  });
};

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
  bindDoc(body);
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

RENDER.outline = function () {
  $('#outlineBody').innerHTML = M.outline || '';
  bindDoc($('#outlineBody'));
};

RENDER.lab = function () {
  if ($('#s-yj').options.length) { labUpdate(); return; }
  Z.forEach(function (z) {
    $('#s-yj').add(new Option(z + '将（' + SHEN[z] + '）· ' + YJM[z], z));
    $('#s-zs').add(new Option(z + '时', z));
  });
  '甲乙丙丁戊己庚辛壬癸'.split('').forEach(function (g) { $('#s-gan').add(new Option(g + '日', g)); });
  $('#s-yj').value = '未'; $('#s-zs').value = '巳'; $('#s-gan').value = '丙';
  ['#s-yj', '#s-zs', '#s-gan'].forEach(function (s) { $(s).onchange = labUpdate; });
  labUpdate();
};
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
}

/* ── 吸顶盘 ───────────────────────────────────────────
   八字四柱压成一条钉在顶栏下就行，六壬方盘 330px 见方，照搬会吃掉半屏。
   所以吸顶的是**四课＋三传**——讲解里指代的几乎都是这些（发用／支上神／日上神／中传），
   天地盘反而查得少；要看全盘点一下这条就弹出来。
   ⚠️ 纯 CSS position:sticky，**绝不加"滚过才显示"的开关**：IntersectionObserver
      在套壳 iframe 里时灵时不灵，scroll 事件在 iframe 内编程滚动压根不触发，而 sticky 一直是好的。 */
function buildStickyPan(body) {
  var old = $('#stickyPan'); if (old) old.remove();
  var ke = body.querySelector('.sike'), sc = body.querySelector('.sanchuan'),
      pan = body.querySelector('.pan');
  if (!ke && !sc) return;
  var box = document.createElement('div');
  box.id = 'stickyPan';
  box.className = 'stickypan';
  var h = '';
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
  box.onclick = function () { showPanSheet(body); };
}
function showPanSheet(body) {
  var mask = $('#tocMask'), box = $('.tocbox', mask);
  var parts = ['<div class="toch">本课课盘</div>'];
  [].slice.call(body.querySelectorAll('.panwrap, .sike, .sanchuan')).forEach(function (el) {
    parts.push(el.outerHTML);
  });
  box.innerHTML = parts.join('');
  mask.classList.add('on');
  bindPan(box);
}

/* 课内目录：一课上万字，没这个只能靠搜 */
function buildToc(l) {
  // ⚠️ 目录与「全盘」共用这一个浮层，各自重建整块内容——
  //    早先目录容器是写死在 html 里的，点过全盘后它就被覆盖掉，再点目录直接崩。
  var box = $('.tocbox');
  var hs = (l.heads || []);
  box.innerHTML = '<div class="toch">本课目录</div><div id="tocList">' + (hs.length
    ? hs.map(function (h) { return '<button class="toci" data-a="' + h.a + '">' + h.t + '</button>'; }).join('')
    : '<p class="muted">本课没有分节。</p>') + '</div>';
  $$('.toci', box).forEach(function (b) {
    b.onclick = function () {
      $('#tocMask').classList.remove('on');
      var el = document.getElementById(b.dataset.a);
      if (el) el.scrollIntoView({ block: 'start' });
    };
  });
}

/* 正文里的式盘：点一格，中间说出这一格怎么读 */
function bindPan(root) {
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
function bindDoc(root) {
  bindPan(root);
  $$('a.wiki', root).forEach(function (a) {
    a.onclick = function () {
      var t = a.dataset.wiki || '', m = t.match(/^(\d\d)-/);
      if (m) { var id = 'L' + m[1]; if ((M.list || []).some(function (x) { return x.id === id; })) show('lesson', id); }
    };
  });
}

RENDER.ref = function () {
  var box = $('#rq');
  if (!box._bound) {
    box._bound = true;
    var t = null;
    box.oninput = function () { clearTimeout(t); t = setTimeout(paintRef, 160); };
  }
  paintRef();
};
function paintRef() {
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
      html += '<div class="refg">第 ' + r.num + ' 课 · ' + r.lesson + '</div>';
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
function runSearch() {
  var kw = $('#q').value.trim();
  var out = $('#sres');
  if (kw.length < 1) { out.innerHTML = ''; return; }
  var words = kw.split(/\s+/).filter(Boolean);
  if (window.DATA_COURSE) { paintSearch(window.DATA_COURSE, words); return; }
  out.innerHTML = '<p class="muted">正在取课文…</p>';
  needCourse().then(function (all) { paintSearch(all, words); });
}
function paintSearch(all, words) {
  var out = $('#sres'), html = '';
  (all || []).forEach(function (l) {
    var txt = l.text || '';
    if (!words.every(function (w) { return txt.indexOf(w) >= 0; })) return;
    var w0 = words[0], idx = [], p = txt.indexOf(w0);
    while (p >= 0 && idx.length < 40) { idx.push(p); p = txt.indexOf(w0, p + w0.length); }
    var order = idx.slice();
    // 多词时优先显示其他词也在附近的那几处，否则只看得见第一个词、看不出关联
    if (words.length > 1) {
      order.sort(function (a, b) { return near(txt, b, words) - near(txt, a, words); });
    }
    order.slice(0, 4).forEach(function (at) {
      var s = Math.max(0, at - 26), frag = txt.slice(s, at + 44);
      words.forEach(function (w) { frag = frag.split(w).join('\x01' + w + '\x02'); });
      frag = frag.replace(/[<>&]/g, function (c) {
        return { '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c];
      }).split('\x01').join('<em>').split('\x02').join('</em>');
      html += '<button class="sr" data-id="' + l.id + '" data-kw="' + w0 +
        '" data-occ="' + idx.indexOf(at) + '"><b>第' + l.num + '课 · ' + l.short +
        '</b><span>…' + frag + '…</span></button>';
    });
    if (idx.length > 4) html += '<p class="muted">本课另有 ' + (idx.length - 4) + ' 处</p>';
  });
  out.innerHTML = html || '<p class="muted">没找到。换个词试试，或用空格分成两个词。</p>';
  $$('.sr', out).forEach(function (b) {
    b.onclick = function () {
      show('lesson', b.dataset.id, { kw: b.dataset.kw, occ: +b.dataset.occ });
    };
  });
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
  if (cur.scr !== 'lesson' || !cur.id) return;
  clearTimeout(_tick);
  _tick = setTimeout(function () {
    var h = document.documentElement.scrollHeight - window.innerHeight;
    var pct = h > 0 ? Math.min(100, Math.round(window.scrollY / h * 100)) : 100;
    var r = load(K.read, {});
    if (pct > (r[cur.id] || 0)) { r[cur.id] = pct; save(K.read, r); }
    var ps = load(K.pos, {}); ps[cur.id] = window.scrollY; save(K.pos, ps);
  }, 220);
}, { passive: true });

/* ── 主题 ─────────────────────────────────────────────── */
var THEMES = [null, 'light', 'dark'], TLAB = { 'null': '随', light: '浅', dark: '深' };
function applyTheme(t) {
  if (t) document.documentElement.setAttribute('data-theme', t);
  else document.documentElement.removeAttribute('data-theme');
  $('#btnTheme').textContent = TLAB[String(t)];
  $('#btnTheme').setAttribute('aria-label', '配色：' + (t === 'light' ? '浅色' : t === 'dark' ? '深色' : '跟随系统'));
}
$('#btnTheme').onclick = function () {
  var t = load(K.theme, null);
  var next = THEMES[(THEMES.indexOf(t) + 1) % 3];
  save(K.theme, next);
  applyTheme(next);
};
applyTheme(load(K.theme, null));

/* ── 起动 ─────────────────────────────────────────────── */
$('#btnBack').onclick = function () { history.back(); };
$('#btnSearch').onclick = function () { show('search', null); };
$('#fabToc').onclick = function () {
  var body = $('#lessonBody'), l = lessonById(cur.id);
  if (l) buildToc(l);
  $('#tocMask').classList.add('on');
};
$('#tocMask').onclick = function (e) { if (e.target === $('#tocMask')) $('#tocMask').classList.remove('on'); };
$$('.mi[data-go]').forEach(function (b) {
  b.onclick = function () { show(b.dataset.go, null); };
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
