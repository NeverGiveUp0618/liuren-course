/* 做题练习 · practice.js
   ⭐ 设计：题目全部由 engine.js 现算（不手写答案），同一个种子永远出同一道题——
      所以错题只存 {topic, seed}，回炉时原样重出，不占空间也不会抄错。
   ⭐ 第一期只做「起盘基本功」九类；知识点题、课例断语题见 README「做题练习」。
   ⚠️ 口径：四课三传发用取上神（《通解》），昼夜贵以占时分（卯至申为昼）。
   纯函数部分（生成题）可在 node 里单测；界面部分依赖 app.js 的全局函数。 */
(function (root) {
  'use strict';
  var E = root.LiurenEngine;
  var Z = E.Z, G = E.G;
  var TJN = ['贵', '蛇', '朱', '合', '勾', '青', '空', '虎', '常', '玄', '阴', '后'];
  var TJF = { 贵: '天乙贵人', 蛇: '螣蛇', 朱: '朱雀', 合: '六合', 勾: '勾陈', 青: '青龙',
              空: '天空', 虎: '白虎', 常: '太常', 玄: '玄武', 阴: '太阴', 后: '天后' };
  var GR_D = { 甲: '丑', 戊: '丑', 庚: '丑', 乙: '子', 己: '子', 丙: '亥', 丁: '亥', 辛: '午', 壬: '巳', 癸: '巳' };
  var GR_N = { 甲: '未', 戊: '未', 庚: '未', 乙: '申', 己: '申', 丙: '酉', 丁: '酉', 辛: '寅', 壬: '卯', 癸: '卯' };
  var ZHOU = '卯辰巳午未申', SHUN = '亥子丑寅卯辰';
  var SHEN = { 子: '神后', 丑: '大吉', 寅: '功曹', 卯: '太冲', 辰: '天罡', 巳: '太乙',
               午: '胜光', 未: '小吉', 申: '传送', 酉: '从魁', 戌: '河魁', 亥: '登明' };
  var WX = { 甲: '木', 乙: '木', 寅: '木', 卯: '木', 丙: '火', 丁: '火', 巳: '火', 午: '火', 戊: '土', 己: '土',
             丑: '土', 辰: '土', 未: '土', 戌: '土', 庚: '金', 辛: '金', 申: '金', 酉: '金', 壬: '水', 癸: '水',
             子: '水', 亥: '水' };
  var KE = { 木: '土', 土: '水', 水: '火', 火: '金', 金: '木' };       // 左克右
  var SHENG = { 木: '火', 火: '土', 土: '金', 金: '水', 水: '木' };    // 左生右

  /* ── 小工具 ── */
  function mkRng(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function ri(rng, n) { return Math.floor(rng() * n); }
  function shuffle(rng, a) {
    a = a.slice();
    for (var i = a.length - 1; i > 0; i--) { var j = ri(rng, i + 1), t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }
  function uniq(a) { return a.filter(function (x, i) { return a.indexOf(x) === i; }); }
  function mod(n, m) { return ((n % m) + m) % m; }
  function zAt(i) { return Z[mod(i, 12)]; }
  function zi(z) { return Z.indexOf(z); }
  /** 4 选 1：答案 + 先用「易错干扰项」补，再用 pool 补；顺序打乱 */
  function choose(rng, ans, tricks, pool, n) {
    n = n || 4;
    var d = uniq(tricks.concat(shuffle(rng, pool))).filter(function (x) { return x !== ans; });
    var opts = shuffle(rng, [ans].concat(d.slice(0, n - 1)));
    return { opts: opts, ai: opts.indexOf(ans) };
  }
  function ke(a, b) { return KE[WX[a]] === WX[b]; }
  function randDay(rng) {                       // 六十甲子里阴阳必须相配
    var g = ri(rng, 10), z = ri(rng, 6) * 2 + (g % 2);
    return G[g] + Z[z];
  }
  function tianpan(yj, zs) { return E.tianpan(yj, zs); }
  function tianjiang(gan, zs, t) {
    var gr = ZHOU.indexOf(zs) >= 0 ? GR_D[gan] : GR_N[gan];
    var dp = Z.filter(function (d) { return t[d] === gr; })[0];
    var shun = SHUN.indexOf(dp) >= 0, tj = {};
    TJN.forEach(function (n, i) {
      var z = zAt(zi(gr) + (shun ? i : -i));
      tj[Z.filter(function (k) { return t[k] === z; })[0]] = n;
    });
    return { tj: tj, gr: gr, dp: dp, shun: shun };
  }
  function xunInfo(rgz) {
    var n = 0;
    for (var k = 0; k < 60; k++) if (G[k % 10] === rgz.charAt(0) && Z[k % 12] === rgz.charAt(1)) { n = k; break; }
    var s = n - (n % 10);                       // 旬首序号
    return { head: G[0] + Z[s % 12], start: Z[s % 12], kong: [Z[(s + 10) % 12], Z[(s + 11) % 12]] };
  }
  function xunDun(rg, rz) {                     // 与 app.js 同口径：地支 → 遁干
    var out = {}, gi = G.indexOf(rg), start = mod(zi(rz) - gi, 12);
    G.forEach(function (g, i) { out[Z[(start + i) % 12]] = g; });
    return out;
  }
  function liuqin(gan, z) {                     // 以日干为我
    var a = WX[gan], b = WX[z];
    if (a === b) return '兄弟';
    if (KE[a] === b) return '妻财';
    if (KE[b] === a) return '官鬼';
    if (SHENG[b] === a) return '父母';
    return '子孙';
  }
  var CTX = function (rgz, yj, zs) { return rgz + '日 · ' + yj + '将（' + SHEN[yj] + '）加' + zs + '时'; };

  /* ── 九类题 ── 返回 {stem, pan:{tp,tj,mid,hideTj}, ke4, opts, ai, why} ── */
  var TOPICS = [];
  function topic(id, name, tier, tip, lesson, gen) { TOPICS.push({ id: id, name: name, tier: tier, tip: tip, lesson: lesson, gen: gen }); }

  topic('tianpan', '月将加时', 1, '月将加占时，推某位天盘支', 2, function (rng) {
    var yj = Z[ri(rng, 12)], zs = Z[ri(rng, 12)], z = Z[ri(rng, 12)];
    var t = tianpan(yj, zs), ans = t[z], k = mod(zi(z) - zi(zs), 12);
    var rev = zAt(zi(yj) - k);
    var c = choose(rng, ans, [rev, yj, zAt(zi(ans) + 1), zAt(zi(ans) - 1)], Z);
    return { stem: '月将<b>' + yj + '</b>，占时<b>' + zs + '</b>。地盘<b>' + z + '</b>位上的天盘支是？',
      opts: c.opts, ai: c.ai,
      why: '月将加占时：天盘<b>' + yj + '</b>落在地盘<b>' + zs + '</b>上，其余天盘支按十二支顺序依次排开。地盘' + z +
        '比地盘' + zs + (k ? '顺数 ' + k + ' 位' : '同位') + '，所以天盘支是 <b>' + ans + '</b>。' +
        (k ? '（容易错成逆数，得到' + rev + '。）' : '') };
  });

  topic('guiren', '贵人起法', 1, '日干＋占时 → 昼夜贵取哪一支', 3, function (rng) {
    var gan = G[ri(rng, 10)], zs = Z[ri(rng, 12)], zhou = ZHOU.indexOf(zs) >= 0;
    var ans = zhou ? GR_D[gan] : GR_N[gan], other = zhou ? GR_N[gan] : GR_D[gan];
    var c = choose(rng, ans, [other], ['子', '丑', '亥', '未', '申', '酉', '卯', '寅', '巳', '午']);
    return { stem: gan + '日，占时<b>' + zs + '</b>。贵人起在天盘哪一支？',
      opts: c.opts, ai: c.ai,
      why: '占时' + zs + (zhou ? '在卯至申，属<b>昼</b>' : '在酉至寅，属<b>夜</b>') + '，用' + (zhou ? '昼' : '夜') +
        '贵；' + gan + '日' + (zhou ? '昼' : '夜') + '贵为 <b>' + ans + '</b>（另一种是' + other + '，那是' + (zhou ? '夜' : '昼') + '贵）。' };
  });

  topic('shunni', '天将顺逆', 1, '贵人临哪位 → 天将顺行还是逆行', 3, function (rng) {
    var yj = Z[ri(rng, 12)], zs = Z[ri(rng, 12)], gan = G[ri(rng, 10)];
    var t = tianpan(yj, zs), r = tianjiang(gan, zs, t);
    var opts = ['顺行', '逆行'];
    return { stem: gan + '日 · ' + yj + '将加' + zs + '时。贵人所乘的天将，在天地盘上是顺行还是逆行？',
      pan: { tp: t, tj: {}, mid: gan + '日<br>' + yj + '将 · ' + zs + '时' },
      opts: opts, ai: r.shun ? 0 : 1,
      why: gan + '日占时' + zs + (ZHOU.indexOf(zs) >= 0 ? '属昼' : '属夜') + '，贵人起在天盘<b>' + r.gr + '</b>；天盘' + r.gr +
        '临地盘<b>' + r.dp + '</b>。贵人临亥子丑寅卯辰（天门以下）六位顺行，临巳午未申酉戌六位逆行，' + r.dp +
        '在' + (r.shun ? '前' : '后') + '一组，所以天将<b>' + (r.shun ? '顺行' : '逆行') + '</b>。' };
  });

  topic('tianjiang', '排十二天将', 1, '给天地盘，说出某位乘什么将', 3, function (rng) {
    var yj = Z[ri(rng, 12)], zs = Z[ri(rng, 12)], gan = G[ri(rng, 10)], z = Z[ri(rng, 12)];
    var t = tianpan(yj, zs), r = tianjiang(gan, zs, t), ans = r.tj[z];
    var ai0 = TJN.indexOf(ans);
    var c = choose(rng, ans, [TJN[mod(ai0 + 1, 12)], TJN[mod(ai0 - 1, 12)], r.shun ? TJN[mod(ai0 - 2, 12)] : TJN[mod(ai0 + 2, 12)]], TJN);
    return { stem: gan + '日 · ' + zs + '时。地盘<b>' + z + '</b>位（天盘' + t[z] + '）乘什么天将？',
      pan: { tp: t, tj: {}, mid: gan + '日<br>' + yj + '将 · ' + zs + '时' },
      opts: c.opts.map(function (x) { return TJF[x]; }), ai: c.ai, ansKey: ans,
      why: gan + '日占时' + zs + '，贵人起天盘<b>' + r.gr + '</b>，临地盘' + r.dp + '，天将<b>' + (r.shun ? '顺' : '逆') + '行</b>：' +
        '贵、蛇、朱、合、勾、青、空、虎、常、玄、阴、后依次落在天盘' + r.gr + '之后的' + (r.shun ? '顺' : '逆') +
        '数各位。天盘' + t[z] + '是第 ' + (mod((r.shun ? 1 : -1) * (zi(t[z]) - zi(r.gr)), 12) + 1) + ' 位，故为 <b>' + TJF[ans] + '</b>。' };
  });

  topic('sike', '四课', 2, '日干寄宫 → 第一至第四课', 4, function (rng) {
    var rgz = randDay(rng), yj = Z[ri(rng, 12)], zs = Z[ri(rng, 12)], n = ri(rng, 4);
    var r = E.qike(rgz, yj, zs), t = r.t, ans = r.sk[n].shang;
    var tricks = [r.sk[(n + 1) % 4].shang, r.sk[(n + 2) % 4].shang, zAt(zi(ans) + 1), zAt(zi(ans) - 1), t[r.sk[n].xia]];
    var c = choose(rng, ans, tricks, Z);
    var rg = rgz.charAt(0), rz = rgz.charAt(1), k1 = r.sk[0].shang, k3 = r.sk[2].shang;
    var why = ['日干 ' + rg + ' 寄宫在 <b>' + r.ji + '</b>，取天盘' + r.ji + '位上的字：<b>' + k1 + '</b>（下为日干' + rg + '）。',
      '第二课以第一课上神 ' + k1 + ' 为下，再取天盘' + k1 + '位上的字：<b>' + r.sk[1].shang + '</b>。',
      '日支 ' + rz + ' 在地盘，取天盘' + rz + '位上的字：<b>' + k3 + '</b>（下为日支' + rz + '）。',
      '第四课以第三课上神 ' + k3 + ' 为下，再取天盘' + k3 + '位上的字：<b>' + r.sk[3].shang + '</b>。'][n];
    return { stem: CTX(rgz, yj, zs) + '。第<b>' + '一二三四'.charAt(n) + '</b>课的上神是？',
      pan: { tp: t, tj: {}, mid: rgz + '日<br>' + yj + '将 · ' + zs + '时' },
      opts: c.opts, ai: c.ai, why: why };
  });

  topic('xunkong', '旬空', 2, '日干支所在旬 → 空亡两支', 7, function (rng) {
    var rgz = randDay(rng), x = xunInfo(rgz), ans = x.kong.join('');
    var cand = [];
    for (var i = 0; i < 12; i++) cand.push(Z[i] + Z[(i + 1) % 12]);
    var c = choose(rng, ans, [x.kong[0] + zAt(zi(x.kong[0]) + 2), zAt(zi(x.kong[0]) - 1) + x.kong[0], x.kong[1] + zAt(zi(x.kong[1]) + 1)], cand);
    return { stem: '<b>' + rgz + '</b>日，空亡是哪两支？', opts: c.opts, ai: c.ai,
      why: rgz + '日在 <b>' + x.head + '</b> 旬（旬首' + x.head + '，十日一轮）。一旬十日用十个地支，剩下的两支即旬空：<b>' + x.kong[0] + '、' + x.kong[1] + '</b>。' };
  });

  topic('dungan', '遁干', 2, '日干支 → 某个地支的遁干', 7, function (rng) {
    var rgz = randDay(rng), rg = rgz.charAt(0), rz = rgz.charAt(1);
    var d = xunDun(rg, rz), x = xunInfo(rgz);
    var zs10 = Z.filter(function (k) { return d[k]; }), z = zs10[ri(rng, zs10.length)], ans = d[z];   // 旬空两支无干可遁，不出
    var c = choose(rng, ans, [G[mod(G.indexOf(ans) + 1, 10)], G[mod(G.indexOf(ans) - 1, 10)]], G);
    return { stem: '<b>' + rgz + '</b>日，支 <b>' + z + '</b> 遁的是什么干？', opts: c.opts, ai: c.ai,
      why: rgz + '日的旬首是 ' + x.head + '：<b>甲</b>落在 ' + x.start + '，之后天干与地支同步顺行（乙在' + zAt(zi(x.start) + 1) +
        '，丙在' + zAt(zi(x.start) + 2) + '……），到十干排完再接着循环。' + z + ' 位对应的是 <b>' + ans + '</b>。' };
  });

  topic('liuqin', '六亲', 2, '以日干为我，判某支是什么六亲', 7, function (rng) {
    var gan = G[ri(rng, 10)], z = Z[ri(rng, 12)], ans = liuqin(gan, z);
    var c = choose(rng, ans, [], ['兄弟', '妻财', '官鬼', '父母', '子孙'], 5);
    var a = WX[gan], b = WX[z];
    var rel = a === b ? '同我（五行同为' + a + '）' : KE[a] === b ? '我（' + a + '）克它（' + b + '）' : KE[b] === a ? '它（' + b + '）克我（' + a + '）' :
      SHENG[b] === a ? '它（' + b + '）生我（' + a + '）' : '我（' + a + '）生它（' + b + '）';
    return { stem: '<b>' + gan + '</b>日（日干属' + a + '），<b>' + z + '</b>（属' + b + '）是日干的什么六亲？', opts: c.opts, ai: c.ai,
      why: rel + '，故为<b>' + ans + '</b>。口诀：同我兄弟，我克妻财，克我官鬼，生我父母，我生子孙。' };
  });

  var KETI = ['元首', '重审', '知一', '比用', '涉害', '遥克', '昴星', '别责', '八专', '伏吟', '返吟'];
  var KEGRP = [['元首', '重审', '知一', '比用', '涉害'], ['遥克', '昴星', '别责'], ['八专', '伏吟', '返吟']];
  function pickPan(rng, wantKe) {                // 课体均衡：先抽目标课体，再拒绝采样
    for (var i = 0; i < 4000; i++) {
      var rgz = randDay(rng), yj = Z[ri(rng, 12)], zs = Z[ri(rng, 12)], r = E.qike(rgz, yj, zs);
      if (r.ke === wantKe) return r;
    }
    return E.qike('甲子', '子', '子');
  }
  function ke4(r) {                              // 四课：从右到左排（第一课在最右）
    return r.sk.slice().reverse().map(function (c) {
      return '<div class="ke"><span class="lb">第' + '一二三四'.charAt(c.i) + '课</span><span class="up">' + c.shang + '</span><span class="dn">' + c.xia + '</span></div>';
    }).join('');
  }

  topic('qufa', '认课体', 3, '给课，判是哪一种取传法', 5, function (rng) {
    var want = KETI[ri(rng, KETI.length)], r = pickPan(rng, want), ans = r.ke;
    var grp = KEGRP.filter(function (g) { return g.indexOf(ans) >= 0; })[0];
    var c = choose(rng, ans, grp.filter(function (x) { return x !== ans; }).concat(['重审', '元首', '涉害']), KETI);
    return { stem: CTX(r.rgz, r.yj, r.zs) + '。这一课取传，属于哪一种课体？',
      pan: { tp: r.t, tj: {}, mid: r.rgz + '日<br>' + r.yj + '将 · ' + r.zs + '时' }, ke4: ke4(r), qike: r,
      opts: c.opts, ai: c.ai, why: '', whyKe: true };
  });

  topic('chuan', '取初传', 3, '给课，说出初传', 6, function (rng) {
    var want = KETI[ri(rng, KETI.length)], r = pickPan(rng, want), ans = r.chuan[0];
    var ups = uniq(r.sk.map(function (c) { return c.shang; }));
    var c = choose(rng, ans, ups.concat([r.t[r.rgz.charAt(1)], zAt(zi(ans) + 6)]), Z);
    return { stem: CTX(r.rgz, r.yj, r.zs) + '。这一课的<b>初传</b>是？',
      pan: { tp: r.t, tj: {}, mid: r.rgz + '日<br>' + r.yj + '将 · ' + r.zs + '时' }, ke4: ke4(r), qike: r,
      opts: c.opts, ai: c.ai, why: '', whyKe: true };
  });

  function topicById(id) { return TOPICS.filter(function (x) { return x.id === id; })[0]; }
  function make(id, seed) {
    var tp = topicById(id);
    var q = tp.gen(mkRng(seed));
    q.topic = id; q.seed = seed; q.lesson = tp.lesson;
    return q;
  }

  root.LiurenPractice = { TOPICS: TOPICS, make: make, mkRng: mkRng, topicById: topicById,
    tianjiang: tianjiang, xunDun: xunDun, xunInfo: xunInfo, liuqin: liuqin, KETI: KETI };

  /* ══ 以下是界面：依赖 app.js 的全局（$ $$ esc load save show panHTML bindPan zongmenDeriveHTML） ══ */
  if (typeof root.document === 'undefined' || !root.LRApp) return;
  var A = root.LRApp;
  var PK = 'liuren_course_practice';
  var P = root.LiurenPractice;
  var S = null;                                    // 当前一轮：{mode, qs, i, right, picked, log}

  function today() { var d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); }
  function stat() {
    var s = A.load(PK, null) || {};
    s.topics = s.topics || {}; s.wrong = s.wrong || []; s.days = s.days || {};
    return s;
  }
  function accOf(s, id) {
    var t = s.topics[id];
    if (!t || !t.r || !t.r.length) return null;
    return t.r.reduce(function (a, b) { return a + b; }, 0) / t.r.length;
  }
  function record(q, ok) {
    var s = stat(), t = s.topics[q.topic] = s.topics[q.topic] || { n: 0, c: 0, r: [] };
    t.n++; if (ok) t.c++;
    t.r.push(ok ? 1 : 0); if (t.r.length > 20) t.r.shift();
    s.days[today()] = (s.days[today()] || 0) + 1;
    var ks = Object.keys(s.days).sort(); while (ks.length > 60) delete s.days[ks.shift()];
    var key = q.topic + ':' + q.seed;
    s.wrong = s.wrong.filter(function (w) { return w.k !== key; });
    if (!ok) s.wrong.unshift({ k: key, t: q.topic, s: q.seed });
    if (s.wrong.length > 80) s.wrong.length = 80;
    A.save(PK, s);
  }
  function newSeed() { return Math.floor(Math.random() * 2147483647); }

  function buildSet(mode) {
    var s = stat(), qs = [], i;
    if (mode === 'wrong') {
      s.wrong.slice(0, 10).forEach(function (w) { qs.push({ t: w.t, s: w.s }); });
    } else if (mode.indexOf('topic:') === 0) {
      for (i = 0; i < 10; i++) qs.push({ t: mode.slice(6), s: newSeed() });
    } else {                                       // 综合：弱项加权
      var w = P.TOPICS.map(function (tp) {
        var a = accOf(s, tp.id), n = s.topics[tp.id] ? s.topics[tp.id].n : 0;
        return n < 3 ? 2.2 : 0.4 + 2 * (1 - (a == null ? 0.5 : a));
      });
      var tot = w.reduce(function (a, b) { return a + b; }, 0);
      for (i = 0; i < 10; i++) {
        var x = Math.random() * tot, k = 0;
        while (k < w.length - 1 && x > w[k]) { x -= w[k]; k++; }
        qs.push({ t: P.TOPICS[k].id, s: newSeed() });
      }
    }
    return qs;
  }

  A.RENDER.practice = function () {
    var s = stat(), nDay = s.days[today()] || 0, all = 0, ok = 0;
    Object.keys(s.topics).forEach(function (k) { all += s.topics[k].n; ok += s.topics[k].c; });
    var tiers = ['', '一 · 起盘基本功', '二 · 四课与旬', '三 · 取三传'];
    var h = '<p class="lead">题目由起盘引擎现算、答案必然与课文一致；每题做完讲解推导过程。想练就练，不计时、不打卡。</p>' +
      '<div class="pq-sum"><span>今日 <b>' + nDay + '</b> 题</span><span>累计 <b>' + all + '</b> 题</span><span>正确率 <b>' +
      (all ? Math.round(ok / all * 100) + '%' : '—') + '</b></span></div>' +
      '<div class="pq-go"><button class="btn" data-pq="mix">综合 10 题 · 弱项优先</button>' +
      '<button class="btn" data-pq="wrong"' + (s.wrong.length ? '' : ' disabled') + '>错题回炉 ' + s.wrong.length + '</button></div>';
    [1, 2, 3].forEach(function (tier) {
      h += '<h3 class="pq-h">' + tiers[tier] + '</h3>';
      P.TOPICS.filter(function (x) { return x.tier === tier; }).forEach(function (tp) {
        var a = accOf(s, tp.id), n = s.topics[tp.id] ? s.topics[tp.id].n : 0;
        h += '<button class="pq-row" data-pq="topic:' + tp.id + '"><span class="pq-nm"><b>' + A.esc(tp.name) + '</b><small>' + A.esc(tp.tip) +
          ' · 第 ' + tp.lesson + ' 课</small></span><span class="pq-ac"><i style="width:' + (a == null ? 0 : Math.round(a * 100)) + '%"></i></span>' +
          '<span class="pq-n">' + (a == null ? '未练' : Math.round(a * 100) + '%') + '<small>' + n + ' 题</small></span></button>';
      });
    });
    var box = A.$('#practiceBody'); box.innerHTML = h;
    A.$$('[data-pq]', box).forEach(function (b) {
      b.onclick = function () { if (!b.disabled) A.show('drill', b.dataset.pq); };
    });
  };

  A.RENDER.drill = function (mode) {
    mode = mode || 'mix';
    S = { mode: mode, qs: buildSet(mode), i: 0, right: 0, picked: null, wrong: [] };
    if (!S.qs.length) { A.show('practice', null); return; }
    draw();
  };

  function panBlock(q) {
    var out = '';
    if (q.pan) out += A.panHTML(q.pan.tp, q.pan.tj || {}, q.pan.mid);
    if (q.ke4) out += '<div class="sike pq-ke">' + q.ke4 + '</div>';
    return out;
  }

  function draw() {
    var box = A.$('#drillBody');
    if (S.i >= S.qs.length) { return summary(box); }
    var it = S.qs[S.i], q = P.make(it.t, it.s), tp = P.topicById(it.t);
    S.q = q;
    box.innerHTML = '<div class="pq-prog"><span>第 <b>' + (S.i + 1) + '</b> / ' + S.qs.length + ' 题 · ' + A.esc(tp.name) + '</span>' +
      '<span class="pq-bar"><i style="width:' + (S.i / S.qs.length * 100) + '%"></i></span></div>' +
      '<div class="pq-stem">' + q.stem + '</div>' + panBlock(q) +
      '<div class="pq-opts">' + q.opts.map(function (o, i) {
        return '<button class="pq-opt" data-i="' + i + '">' + A.esc(o) + '</button>'; }).join('') + '</div>' +
      '<div id="pqFb"></div>';
    A.bindPan && A.bindPan(box);
    A.$$('.pq-opt', box).forEach(function (b) { b.onclick = function () { answer(+b.dataset.i); }; });
    window.scrollTo(0, 0);
  }

  function whyOf(q) {
    if (!q.whyKe) return q.why;
    var r = q.qike, label = r.ke + (r.ge ? '·' + r.ge : '');
    var h = '<b>' + A.esc(label) + '</b>：初 <b>' + r.chuan[0] + '</b> → 中 <b>' + r.chuan[1] + '</b> → 末 <b>' + r.chuan[2] + '</b>。';
    if (typeof A.zongmenDeriveHTML === 'function') h += A.zongmenDeriveHTML(r, r.ke);
    return h;
  }

  function answer(i) {
    if (S.picked != null) return;
    S.picked = i;
    var q = S.q, ok = i === q.ai, box = A.$('#drillBody');
    record(q, ok);
    if (ok) S.right++; else S.wrong.push({ t: q.topic, s: q.seed });
    A.$$('.pq-opt', box).forEach(function (b, k) {
      b.disabled = true;
      if (k === q.ai) b.classList.add('right'); else if (k === i) b.classList.add('bad');
    });
    var last = S.i + 1 >= S.qs.length;
    A.$('#pqFb').innerHTML = '<div class="pq-fb ' + (ok ? 'ok' : 'no') + '"><b>' + (ok ? '✓ 答对了' : '✗ 答错了，正确答案：' + A.esc(q.opts[q.ai])) +
      '</b><div class="pq-why">' + whyOf(q) + '</div>' +
      '<div class="pq-act"><button class="btn" id="pqLesson">回看第 ' + q.lesson + ' 课</button><button class="btn pri" id="pqNext">' + (last ? '看结果' : '下一题') + '</button></div></div>';
    A.$('#pqNext').onclick = function () { S.i++; S.picked = null; draw(); };
    A.$('#pqLesson').onclick = function () { A.show('lesson', 'L' + (q.lesson < 10 ? '0' : '') + q.lesson); };
    var fb = A.$('#pqFb'); if (fb.scrollIntoView) fb.scrollIntoView({ block: 'nearest' });
  }

  function summary(box) {
    var n = S.qs.length, again = S.wrong.length;
    var names = uniq(S.wrong.map(function (w) { return P.topicById(w.t).name; }));
    box.innerHTML = '<div class="pq-done"><div class="pq-big">' + S.right + ' / ' + n + '</div>' +
      '<p>' + (S.right === n ? '全对。' : again ? '这一组错了 ' + again + ' 题（' + A.esc(names.join('、')) + '），已记入「错题回炉」。' : '') + '</p>' +
      '<div class="pq-act"><button class="btn" id="pqHub">练习首页</button><button class="btn pri" id="pqAgain">再来一组</button></div></div>';
    A.$('#pqHub').onclick = function () { A.show('practice', null); };
    A.$('#pqAgain').onclick = function () { var m = S.mode; S = null; A.RENDER.drill(m); };
  }
})(typeof window !== 'undefined' ? window : globalThis);
