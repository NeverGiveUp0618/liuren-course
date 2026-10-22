/* 六壬课程 · 综合训练（依赖 app.js 的 $/RENDER/K/show/panHTML 与 train-core.js、engine.js） */
'use strict';
K.train = 'liuren_course_train'; K.trainN = 'liuren_course_train_n'; K.trainCats = 'liuren_course_train_cats';
/* ── 综合训练（2026-10-22 自「六壬神课」App 迁入，App 退役）────────────
   App 的综合训练八类＋各处独立测验（干支关系／旺相断法／毕法赋／晴雨／口诀）合成一屏。
   题库数据与六十四课经判定规则来自 train-core.js（_tools/_mk_train.py 从 App 抽出）。
   ⚠️ 凡是要起盘的题（九宗门／三传／课体格局），盘一律由 engine.js 现算，
      口径＝《通解》发用取上神，与课文一致——App 原来取下神，2026-10-22 用户拍板统一。
   ⚠️ 全部客观四选一，不做「记住了/再背」那种自评。 */
var TC = window.TrainCore;
var TCATS = [
  ['yj', '月将节气', '月将、月令与节气'], ['gr', '昼夜贵人', '日干与贵人定位'],
  ['tj', '十二天将', '名称、主象与吉凶'], ['zs', '十二支神', '神名与核心类象'],
  ['zm', '九宗门', '看四课认发用法（现算盘）'], ['sc', '三传推演', '初中末传（现算盘）'],
  ['k64', '课体格局', '看盘认六十四课经格局'], ['bj', '八煞九宝', '德禄马奇与刑冲破害墓'],
  ['gz', '干支关系', '六合三合六冲刑破害'], ['ws', '旺相断法', '天将旺相休囚死各主何事'],
  ['bf', '毕法赋', '法诀与断象互认'], ['tw', '天时晴雨', '气象类神'], ['kj', '口诀', '十二类口诀']
];
var TNAME = {}; TCATS.forEach(function (c) { TNAME[c[0]] = c[1]; });
var tr = null;     // 本轮：{qs, i, ok, mode, ans}

function tData() { return load(K.train, { st: {}, nb: {} }); }
function tPick(a, n) { return TC.shuffle(a.slice()).slice(0, n); }
function tQ(cat, q, a, others, ex, id, x) {
  var o = { cat: cat, q: q, a: a, opts: TC.shuffle([a].concat(tPick(others.filter(function (v, i, arr) { return v !== a && arr.indexOf(v) === i; }), 3))), ex: ex, id: id };
  for (var k in (x || {})) o[k] = x[k];
  return o;
}
function tStateFact(st) {
  return st.rg + st.rz + '日 · ' + st.yj.yj + '将 · ' + st.zs + '时（' + (st.day ? '昼' : '夜') + '占）';
}
function tPan(st) {   // 题目里给的盘：只给事实，不印课体名（App 曾因盘抬头印课体名剧透 421 题）
  var tp = {}; Z.forEach(function (d, i) { tp[d] = st.tp[i]; });
  var tj = tianjiang(st.rg, st.zs, tp).tj;
  return panHTML(tp, tj, st.rg + st.rz + '日<br>' + st.zs + '时') +
    '<div class="dke"><em>四课</em><table><tr>' + st.sk.slice().reverse().map(function (c, i) {
      return '<td><span class="n">第' + '四三二一'.charAt(i) + '课</span><b>' + c.s + '</b><i>' + c.x + '</i></td>';
    }).join('') + '</tr></table></div>';
}
var KE11 = ['元首', '重审', '比用', '知一', '涉害', '遥克', '昴星', '别责', '八专', '伏吟', '返吟'];

/* 各类出题器：返回题目数组 */
var TGEN = {
  yj: function () { return TC.D.QZ_YJ.map(function (x, i) { return tQ('yj', x.q, x.a, Z, x.hint, 'yj_' + i); }); },
  gr: function () { return TC.D.QZ_GR.map(function (x, i) { return tQ('gr', x.q, x.a, Z, x.hint, 'gr_' + i); }); },
  tj: function () {
    var T = TC.D.TJ_QUIZ, out = [];
    T.forEach(function (x, i) {
      out.push(tQ('tj', '「' + x.name + '」的核心主象是？', x.sx, T.map(function (y) { return y.sx; }), x.name + '属' + x.wx + '，' + x.ji + '将。' + x.ex, 'tj_sx_' + i));
      out.push(tQ('tj', '主象「' + x.sx + '」对应哪位天将？', x.name, T.map(function (y) { return y.name; }), x.name + '：' + x.ex, 'tj_nm_' + i));
    });
    return out;
  },
  zs: function () {
    var T = TC.D.TRAIN_ZS, out = [];
    T.forEach(function (x, i) {
      out.push(tQ('zs', '地支「' + x[0] + '」的六壬神名是？', x[1], T.map(function (y) { return y[1]; }), x[0] + '为' + x[1] + '，主' + x[2] + '。', 'zs_nm_' + i));
      out.push(tQ('zs', '「' + x[1] + '」对应哪个地支？', x[0], Z, x[1] + '即' + x[0] + '，主' + x[2] + '。', 'zs_di_' + i));
    });
    return out;
  },
  zm: function (n) {
    var out = [];
    for (var k = 0; k < n; k++) {
      var st = TC.randState();
      out.push(tQ('zm', '根据四课，本课取何法发用？', st._ke, KE11,
        '正解：' + st.mt + '；三传 ' + st.cc + ' → ' + st.zc + ' → ' + st.mc + '。判法见第 5、6 课。',
        'zm_' + st._ke, { st: st }));
    }
    return out;
  },
  sc: function (n) {
    var out = [];
    for (var k = 0; k < n; k++) {
      var st = TC.randState(), step = Math.floor(Math.random() * 3), a = [st.cc, st.zc, st.mc][step];
      out.push(tQ('sc', '本课' + '初中末'.charAt(step) + '传是哪一支？', a, Z,
        '三传：初 ' + st.cc + ' → 中 ' + st.zc + ' → 末 ' + st.mc + '（' + st.mt + '）。', 'sc_' + st._ke, { st: st }));
    }
    return out;
  },
  k64: function (n) {
    var all = Object.keys(TC.D.K64_RULES).concat(KE11.map(function (k) { return k + '课'; }))
      .filter(function (nm, i, a) { return a.indexOf(nm) === i && TC.D.K64.some(function (x) { return x.name === nm; }); });
    var out = [];
    tPick(all, n * 2).forEach(function (nm) {
      if (out.length >= n) return;
      var st = null;
      for (var i = 0; i < 2500 && !st; i++) { var s = TC.randState(); if (TC.k64Detect(s).indexOf(nm) >= 0) st = s; }
      if (!st) return;                                     // 太稀有搜不到就不出半截题
      var hits = TC.k64Detect(st), others = all.filter(function (x) { return hits.indexOf(x) < 0; });
      var K = TC.D.K64.filter(function (x) { return x.name === nm; })[0] || {};
      var ex = '成格：' + (K.key || '') + (hits.length > 1 ? '\n本盘同时成：' + hits.join('、') + '（选其中任一个都算对）' : '');
      out.push(tQ('k64', '三传 ' + st.cc + ' → ' + st.zc + ' → ' + st.mc + '。本盘成什么格？', nm, others, ex,
        'k64_' + nm, { st: st, alt: hits }));
    });
    return out;
  },
  bj: function () { return TC.bjPool(); },
  gz: function () {
    return TC.D.buildGZ().map(function (q, i) {
      var pool = q.pool === 'zhi' ? Z : q.pool === 'ju' ? ['水局', '木局', '火局', '金局'] : ['六合', '三合', '六冲', '三刑', '相破', '六害'];
      return tQ('gz', q.q, q.ans, pool, q.ex, 'gz_' + q.q);
    });
  },
  ws: function () {
    var out = [], all = [];
    TC.D.TJ_XIANG.forEach(function (t) { Object.keys(t.wsd || {}).forEach(function (s) { if (t.wsd[s] && t.wsd[s] !== '—') all.push(t.wsd[s]); }); });
    TC.D.TJ_XIANG.forEach(function (t) {
      TC.D.WSD_STATES.forEach(function (s) {
        var d = (t.wsd || {})[s]; if (!d || d === '—') return;
        out.push(tQ('ws', t.name + '（' + t.wx + '·' + (t.ji === '吉' ? '吉将' : t.ji === '凶' ? '凶将' : '中性') + '·旺于' + t.wang + '）处「' + s + '」，主什么？',
          d, all, t.name + ' ' + s + '：' + d, 'ws_' + t.name + s));
      });
    });
    return out;
  },
  bf: function () {
    var F = TC.D.BF_FA, out = [];
    F.forEach(function (t, i) {
      out.push(tQ('bf', '法诀「' + t.f + '」的含义是？', t.m, F.map(function (x) { return x.m; }), t.f + '：' + t.m, 'bf_m_' + i));
      out.push(tQ('bf', '断象「' + t.m + '」对应哪一条法诀？', t.f, F.map(function (x) { return x.f; }), t.f + '：' + t.m, 'bf_f_' + i));
    });
    return out;
  },
  tw: function () {
    var T = TC.D.TW_QUIZ, out = [];
    T.forEach(function (t, i) {
      out.push(tQ('tw', (t.c === '支' ? '支神' : '天将') + '「' + t.n + '」主什么气象？', t.sx, T.map(function (x) { return x.sx; }), t.ex, 'tw_a_' + i));
      out.push(tQ('tw', '主象「' + t.sx + '」是哪个类神？', t.n, T.map(function (x) { return x.n; }), t.ex, 'tw_b_' + i));
    });
    return out;
  },
  kj: function () {
    var out = [];
    Object.keys(TC.D.KJ_DATA).forEach(function (cat) {
      var arr = TC.D.KJ_DATA[cat];
      if (arr.length < 4) return;
      arr.forEach(function (it, i) {
        out.push(tQ('kj', '〔' + cat + '〕「' + it.title + '」对应哪一条？', it.body, arr.map(function (x) { return x.body; }),
          it.title + '\n' + it.body, 'kj_' + cat + '_' + i));
      });
    });
    return out;
  }
};
var TDYN = { zm: 1, sc: 1, k64: 1 };   // 每次现算的类，n 道就算 n 张盘

function tBuild(cats, n) {
  var per = Math.max(1, Math.ceil(n / cats.length)), qs = [];
  cats.forEach(function (c) {
    var pool = TDYN[c] ? TGEN[c](per) : tPick(TGEN[c](), per);
    qs = qs.concat(pool);
  });
  return tPick(qs, n);
}
function tToday() { var d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); }

RENDER.train = function (mode) {
  mode = mode || 'menu';
  if (mode === 'menu') return tMenu();
  if (mode === 'report') return tReport();
  if (mode === 'nb') return tNotebook();
  var cats, n = 10;
  if (mode === 'daily') cats = TCATS.map(function (c) { return c[0]; });
  else if (mode === 'free') cats = tFreeCats();
  else if (mode.indexOf('cat:') === 0) cats = mode.slice(4).split(',');
  else if (mode === 'weak') cats = tWeakCats();
  if (mode === 'free') n = +(load(K.trainN, 10)) || 10;
  tr = { qs: tBuild(cats, n), i: 0, ok: 0, mode: mode };
  tPaint();
};
function tFreeCats() {
  var c = load(K.trainCats, null);
  return (c && c.length) ? c : TCATS.map(function (x) { return x[0]; });
}
function tWeakCats() {
  var st = tData().st, rows = TCATS.map(function (c) {
    var s = st[c[0]] || { n: 0, ok: 0 };
    return { c: c[0], rate: s.n ? s.ok / s.n : 1, n: s.n };
  }).filter(function (r) { return r.n >= 3; }).sort(function (a, b) { return a.rate - b.rate; });
  return rows.length ? rows.slice(0, 3).map(function (r) { return r.c; }) : TCATS.map(function (x) { return x[0]; });
}
function tMenu() {
  var D = tData(), nb = Object.keys(D.nb).length, sel = tFreeCats();
  var h = '<p class="lead">十三类客观题，盘一律现算（《通解》口径，与课文一致）。</p>' +
    '<div class="menu">' +
    '<button class="mi" data-t="daily"><b>今日挑战</b><span>十三类各抽一点，共 10 题</span></button>' +
    '<button class="mi" data-t="weak"><b>薄弱点专练</b><span>挑正确率最低的三类出题（每类做满 3 题才算数）</span></button>' +
    '<button class="mi" data-t="nb"><b>错题本</b><span>' + nb + ' 道 · 做对一次就移出</span></button>' +
    '<button class="mi" data-t="report"><b>掌握度</b><span>每一类做了多少、对了多少</span></button>' +
    '</div><div class="card"><b>自由训练</b><p class="muted" style="margin:6px 0">点选要练的类：</p><div class="chips" id="tCats">' +
    TCATS.map(function (c) {
      return '<span class="chip' + (sel.indexOf(c[0]) >= 0 ? ' sel' : '') + '" data-c="' + c[0] + '" title="' + c[2] + '">' + c[1] + '</span>';
    }).join('') + '</div><div class="row" style="gap:8px;margin-top:12px">' +
    [10, 20, 30].map(function (n) { return '<button class="btn" data-n="' + n + '">' + n + ' 题</button>'; }).join('') + '</div></div>';
  $('#trainBody').innerHTML = h;
  $$('#trainBody [data-t]').forEach(function (b) { b.onclick = function () { show('train', b.dataset.t); }; });
  $$('#tCats [data-c]').forEach(function (b) {
    b.onclick = function () {
      b.classList.toggle('sel');
      save(K.trainCats, $$('#tCats .chip.sel').map(function (x) { return x.dataset.c; }));
    };
  });
  $$('#trainBody [data-n]').forEach(function (b) {
    b.onclick = function () {
      if (!$$('#tCats .chip.sel').length) { alert('至少选一类'); return; }
      save(K.trainN, +b.dataset.n); show('train', 'free');
    };
  });
}
function tPaint() {
  if (!tr.qs.length) { $('#trainBody').innerHTML = '<div class="empty">这一类暂时出不了题</div>'; return; }
  if (tr.i >= tr.qs.length) return tResult();
  var q = tr.qs[tr.i];
  var h = '<div class="drillhd"><span>' + TNAME[q.cat] + '</span><em>' + (tr.i + 1) + ' / ' + tr.qs.length + '</em></div>' +
    '<div class="card">' + (q.st ? '<p class="muted" style="margin:0 0 8px">' + esc(tStateFact(q.st)) + '</p>' + tPan(q.st) : '') +
    '<div class="tq">' + esc(q.q).replace(/\n/g, '<br>') + '</div><div class="topts">' +
    q.opts.map(function (o, k) { return '<button class="topt" data-k="' + k + '">' + esc(o).replace(/\n/g, '<br>') + '</button>'; }).join('') +
    '</div><div id="tFb"></div></div>';
  $('#trainBody').innerHTML = h;
  bindPan($('#trainBody'));
  window.scrollTo(0, 0);
  $$('#trainBody .topt').forEach(function (b) {
    b.onclick = function () {
      if (tr.done) return; tr.done = 1;
      var pick = q.opts[+b.dataset.k];
      var right = pick === q.a || (q.alt && q.alt.indexOf(pick) >= 0);
      $$('#trainBody .topt').forEach(function (x) {
        var o = q.opts[+x.dataset.k];
        if (o === q.a || (q.alt && q.alt.indexOf(o) >= 0)) x.classList.add('y');
      });
      if (!right) b.classList.add('n');
      tRecord(q, right);
      if (right) tr.ok++;
      $('#tFb').innerHTML = '<div class="dfb ' + (right ? 'good' : 'bad') + '"><b>' + (right ? '✓ 对' : '✗ 正解：' + esc(q.a)) + '</b>' +
        (q.ex ? '<p>' + esc(q.ex).replace(/\n/g, '<br>') + '</p>' : '') + '</div>' +
        '<button class="btn main" id="tNext" style="margin-top:10px">' + (tr.i + 1 < tr.qs.length ? '下一题' : '看结果') + '</button>';
      $('#tNext').onclick = function () { tr.i++; tr.done = 0; tPaint(); };
    };
  });
}
function tRecord(q, right) {
  var D = tData();
  var s = D.st[q.cat] = D.st[q.cat] || { n: 0, ok: 0 };
  s.n++; if (right) s.ok++;
  if (right) delete D.nb[q.id];
  else {
    var keep = { cat: q.cat, q: q.q, a: q.a, opts: q.opts, ex: q.ex, alt: q.alt, wrong: ((D.nb[q.id] || {}).wrong || 0) + 1 };
    if (q.st) keep.st = q.st;
    D.nb[q.id] = keep;
  }
  D.days = D.days || {}; D.days[tToday()] = (D.days[tToday()] || 0) + 1;
  save(K.train, D);
}
function tResult() {
  var n = tr.qs.length, pct = Math.round(tr.ok / n * 100);
  $('#trainBody').innerHTML = '<div class="card center"><div class="big">' + tr.ok + ' / ' + n + '</div><p class="muted">正确率 ' + pct + '%</p>' +
    '<div class="row" style="gap:8px;justify-content:center"><button class="btn main" id="tAgain">再来一组</button>' +
    '<button class="btn" id="tBack">回训练首页</button></div></div>';
  $('#tAgain').onclick = function () { RENDER.train(tr.mode); };
  $('#tBack').onclick = function () { show('train', 'menu'); };
}
function tNotebook() {
  var D = tData(), ids = Object.keys(D.nb);
  if (!ids.length) { $('#trainBody').innerHTML = '<div class="empty">错题本是空的</div>'; return; }
  $('#trainBody').innerHTML = '<div class="row" style="gap:8px;margin-bottom:10px"><button class="btn main" id="tNbGo">把错题重做一遍（' + ids.length + ' 道）</button></div>' +
    ids.map(function (id) {
      var q = D.nb[id];
      return '<div class="card"><span class="muted">' + TNAME[q.cat] + ' · 错 ' + q.wrong + ' 次</span><div>' + esc(q.q) + '</div><div class="muted">正解：' + esc(q.a) + '</div></div>';
    }).join('');
  $('#tNbGo').onclick = function () {
    tr = { qs: TC.shuffle(ids.map(function (id) { var q = D.nb[id]; q.id = id; q.opts = TC.shuffle(q.opts.slice()); return q; })), i: 0, ok: 0, mode: 'nb' };
    tPaint();
  };
}
function tReport() {
  var st = tData().st;
  $('#trainBody').innerHTML = '<div class="card"><table class="ttab"><tr><th>类</th><th>做过</th><th>正确率</th><th></th></tr>' +
    TCATS.map(function (c) {
      var s = st[c[0]] || { n: 0, ok: 0 }, p = s.n ? Math.round(s.ok / s.n * 100) : null;
      return '<tr><td>' + c[1] + '</td><td>' + s.n + '</td><td>' + (p === null ? '—' : p + '%') + '</td>' +
        '<td><button class="btn" data-go1="' + c[0] + '">练</button></td></tr>';
    }).join('') + '</table></div>';
  $$('#trainBody [data-go1]').forEach(function (b) { b.onclick = function () { show('train', 'cat:' + b.dataset.go1); }; });
}

// 测试钩子：app.js/train.js 顶层是 'use strict'，测试里拿不到这些名字
window.__train = { TGEN: TGEN, TCATS: TCATS, TDYN: TDYN, show: show, get tr() { return tr; } };

/* ── 起盘台下半：四课三传＋课体＋格局＋毕法／八煞九宝初判 ──
   原「六壬神课」的「自选起课器」并入。⚠️ 只列程序能判准的条目（App 原则：绝不含糊断）；
   有些格还要年命、太岁才判得全，这里没输入这些，命中的也只是「盘面条件成立」。 */
window.labFullRender = function (rgz, yj, zs) {
  var box = $('#labFull'); if (!box) return;
  var st = TC.makeState(rgz, yj, zs);
  if (!st) { box.innerHTML = ''; return; }
  var h = '<div class="card"><div class="dke"><em>四课</em><table><tr>' + st.sk.slice().reverse().map(function (c, i) {
    return '<td><span class="n">第' + '四三二一'.charAt(i) + '课</span><b>' + c.s + '</b><i>' + c.x + '</i></td>';
  }).join('') + '</tr></table></div>' +
    '<p style="margin:10px 0 4px"><b>三传</b>　初 <b>' + st.cc + '</b> → 中 <b>' + st.zc + '</b> → 末 <b>' + st.mc + '</b>　<span class="muted">' + esc(st.mt) + '</span></p>' +
    '<p class="muted" style="margin:0">旬空：' + st.xi.xun + ' ' + st.xi.k.join('') + '</p></div>';
  var hits = TC.k64Detect(st);
  h += '<div class="card"><b>本盘成格</b>（六十四课经，程序初判）<div class="chips" style="margin-top:6px">' +
    (hits.length ? hits.map(function (n) { return '<span class="chip">' + esc(n) + '</span>'; }).join('') : '<span class="muted">无</span>') + '</div></div>';
  var bf = TC.bfDetect(st);
  h += '<div class="card"><b>可程序判定的毕法</b>' + (bf.length ? bf.map(function (r) {
    return '<p style="margin:6px 0"><b>' + esc(r[0]) + '</b>　' + esc(r[1]) + '</p>';
  }).join('') : '<p class="muted">本课没有命中能程序判定的毕法格局，到「毕法赋」按课体逐条对照。</p>') + '</div>';
  var bj = TC.bjDetect(st);
  if (bj && (bj.sha.length || bj.bao.length)) {
    h += '<div class="card"><b>八煞九宝</b>' +
      (bj.sha.length ? '<p style="margin:6px 0"><span class="muted">八煞：</span>' + bj.sha.map(function (x) { return esc(x.n + '·' + x.d); }).join('；') + '</p>' : '') +
      (bj.bao.length ? '<p style="margin:6px 0"><span class="muted">九宝：</span>' + bj.bao.map(function (x) { return esc(x.n + '·' + x.d); }).join('；') + '</p>' : '') + '</div>';
  }
  box.innerHTML = h;
};
