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

  /* ══ 第二期：规则题（第 10–12 课）══
     ⚠️ 全是教材表格／原文里的硬规则；每条常量都由 tests_practice.js 回查 content/*.md 里对应表格行或原句，
        教材改了而这里没改，测试会报。不出出处题、不考背诵比喻（守「出题质量标准」）。 */
  var SEASON = { '春': '木', '夏': '火', '秋': '金', '冬': '水', '季月': '土' };      // 当令之行
  var STATE = ['旺', '相', '休', '囚', '死'];
  function stateOf(令, 行) {                       // 旺＝当令；令生之为相；生令者休；克令者囚；令克之为死
    if (行 === 令) return '旺';
    if (SHENG[令] === 行) return '相';
    if (SHENG[行] === 令) return '休';
    if (KE[行] === 令) return '囚';
    return '死';
  }
  var ZH = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
  var CS10 = { 甲: '亥', 乙: '午', 丙: '寅', 丁: '酉', 戊: '寅', 己: '酉', 庚: '巳', 辛: '子', 壬: '申', 癸: '卯' };
  var CS5 = { 木: ['亥', '卯', '未'], 火: ['寅', '午', '戌'], 金: ['巳', '酉', '丑'], 水: ['申', '子', '辰'] };   // 长生·帝旺·墓
  var BAI = { 甲: '子', 乙: '子', 丙: '卯', 丁: '卯', 戊: '酉', 己: '酉', 庚: '午', 辛: '午', 壬: '酉', 癸: '酉' };
  var CHONG = ['子午', '卯酉', '寅申', '巳亥', '丑未', '辰戌'];
  var PO = ['子酉', '丑辰', '寅亥', '卯午', '巳申', '未戌'];
  var HAI = ['子未', '丑午', '寅巳', '卯辰', '申亥', '酉戌'];
  var ZIXING = ['辰', '午', '酉', '亥'];
  var MU5 = { 木: '未', 火: '戌', 金: '丑', 水: '辰' };
  var MU10 = { 甲: '未', 乙: '戌', 丙: '戌', 丁: '丑', 戊: '戌', 己: '丑', 庚: '丑', 辛: '辰', 壬: '辰', 癸: '未' };
  var LU = { 甲: '寅', 乙: '卯', 丙: '巳', 丁: '午', 戊: '巳', 己: '午', 庚: '申', 辛: '酉', 壬: '亥', 癸: '子' };
  var MA = { 申: '寅', 子: '寅', 辰: '寅', 巳: '亥', 酉: '亥', 丑: '亥', 亥: '巳', 卯: '巳', 未: '巳', 寅: '申', 午: '申', 戌: '申' };
  var GANQI = { 甲: '午', 乙: '巳', 丙: '辰', 丁: '卯', 戊: '寅', 己: '丑', 庚: '未', 辛: '申', 壬: '酉', 癸: '戌' };
  function partner(list, z) { var p = list.filter(function (x) { return x.indexOf(z) >= 0; })[0]; return p.replace(z, ''); }
  function sub(rng, arr) { return arr[ri(rng, arr.length)]; }

  topic('wangxiang', '旺相休囚', 4, '时令定五行的力气', 10, function (rng) {
    var s = sub(rng, ['春', '夏', '秋', '冬', '季月']), ling = SEASON[s], x = Z[0];
    var label = s === '季月' ? sub(rng, ['辰', '丑', '戌', '未']) + '月（季月）' : s + '天';
    if (ri(rng, 2)) {
      var el = sub(rng, ['木', '火', '土', '金', '水']), ans = stateOf(ling, el);
      var c = choose(rng, ans, [], STATE, 5);
      return { stem: label + '占课，<b>' + el + '</b>处在什么状态？', opts: c.opts, ai: c.ai,
        why: label + '当令的是<b>' + ling + '</b>。旺＝当令；令生之为相；生令者为休；克令者为囚；令克之者为死。' + el + '与' + ling + '的关系，属<b>' + ans + '</b>。' };
    }
    var st = sub(rng, STATE.slice(1)), ans2 = Object.keys({ 木: 1, 火: 1, 土: 1, 金: 1, 水: 1 }).filter(function (e) { return stateOf(ling, e) === st; })[0];
    var c2 = choose(rng, ans2, [], ['木', '火', '土', '金', '水'], 5);
    return { stem: label + '占课，哪一行处于<b>' + st + '</b>？', opts: c2.opts, ai: c2.ai,
      why: label + '当令的是<b>' + ling + '</b>：令生之为相（' + SHENG[ling] + '），生令者为休，克令者为囚，令克之者为死（' + KE[ling] + '）。属' + st + '的是 <b>' + ans2 + '</b>。' };
  });

  topic('changsheng', '长生帝旺墓', 4, '十干长生、五行长生·帝旺·墓、败', 10, function (rng) {
    var kind = ri(rng, 3);
    if (kind === 0) {
      var g = sub(rng, G), ans = CS10[g], yangg = G.indexOf(g) % 2 === 0;
      var c = choose(rng, ans, [ZH[(ZH.indexOf(ans) + 6) % 12], ZH[(ZH.indexOf(ans) + 1) % 12], ZH[(ZH.indexOf(ans) + 11) % 12]], ZH);
      return { stem: '十天干里，<b>' + g + '</b>的长生在哪一支？', opts: c.opts, ai: c.ai,
        why: '十干长生口诀：甲生亥，丙戊生寅，庚生巳，壬生申（阳干顺行）；乙生午，丁己生酉，辛生子，癸生卯（阴干逆行）。' + g + '（' + (yangg ? '阳' : '阴') + '干）长生在 <b>' + ans + '</b>。' };
    }
    if (kind === 1) {
      var el = sub(rng, ['木', '火', '金', '水']), pos = ri(rng, 3), nm = ['长生', '帝旺', '墓'][pos], a2 = CS5[el][pos];
      var c2 = choose(rng, a2, CS5[el].filter(function (x) { return x !== a2; }), ZH);
      return { stem: '五行里，<b>' + el + '</b>的<b>' + nm + '</b>在哪一支？', opts: c2.opts, ai: c2.ai,
        why: '五行长生·帝旺·墓：木＝亥·卯·未，火＝寅·午·戌，金＝巳·酉·丑，水（及土）＝申·子·辰。' + el + '的' + nm + '是 <b>' + a2 + '</b>。' };
    }
    var g3 = sub(rng, G), a3 = BAI[g3];
    var c3 = choose(rng, a3, [ZH[(ZH.indexOf(a3) + 6) % 12], CS10[g3]], ZH);
    return { stem: '十干的“败”就是十二长生里的沐浴之地。<b>' + g3 + '</b>的败在哪一支？', opts: c3.opts, ai: c3.ai,
      why: '甲乙木败于子，丙丁火败于卯，戊己败于酉，庚辛败于午，壬癸败于酉。' + g3 + '败于 <b>' + a3 + '</b>。败加干支，主败坏衰败之象。' };
  });

  topic('xingchong', '刑冲破害墓', 4, '成对的煞与墓库', 11, function (rng) {
    var kind = ri(rng, 4);
    if (kind === 0) {
      var rel = sub(rng, [['冲', CHONG], ['破', PO], ['害', HAI]]), z = sub(rng, ZH), ans = partner(rel[1], z);
      var others = [partner(CHONG, z), partner(PO, z), partner(HAI, z)].filter(function (x) { return x !== ans; });
      var c = choose(rng, ans, others, ZH);
      return { stem: '<b>' + z + '</b>的<b>' + rel[0] + '</b>神是哪一支？', opts: c.opts, ai: c.ai,
        why: '六' + rel[0] + '：' + rel[1].join('、') + '。' + z + '与 <b>' + ans + '</b> 相' + rel[0] + '。（冲：' + partner(CHONG, z) + '；破：' + partner(PO, z) + '；害：' + partner(HAI, z) + '，注意别混。）' };
    }
    if (kind === 1) {
      var ans1 = sub(rng, ZIXING), c1 = choose(rng, ans1, [], ZH.filter(function (x) { return ZIXING.indexOf(x) < 0; }));
      return { stem: '下面哪一个字<b>自刑</b>？', opts: c1.opts, ai: c1.ai,
        why: '自刑的是辰、午、酉、亥（各自与自己相刑）；顺刑寅巳申，逆刑丑戌未，互刑子卯。<b>' + ans1 + '</b> 属自刑。' };
    }
    if (kind === 2) {
      var el = sub(rng, ['木', '火', '金', '水']), a2 = MU5[el];
      var c2 = choose(rng, a2, ['未', '戌', '丑', '辰'].filter(function (x) { return x !== a2; }), ZH);
      return { stem: '五行墓：<b>' + el + '</b>的墓库在哪一支？', opts: c2.opts, ai: c2.ai,
        why: '五行墓（以此为主）：木墓在未，火墓在戌，金墓在丑，水土墓在辰。' + el + '墓在 <b>' + a2 + '</b>。' };
    }
    var g = sub(rng, G), a3 = MU10[g];
    var c3 = choose(rng, a3, ['未', '戌', '丑', '辰'].filter(function (x) { return x !== a3; }), ZH);
    return { stem: '十干墓：<b>' + g + '</b>的墓在哪一支？', opts: c3.opts, ai: c3.ai,
      why: '十干墓：未＝甲癸墓，戌＝丙戊乙墓，丑＝庚丁己墓，辰＝壬辛墓。' + g + '墓在 <b>' + a3 + '</b>。' };
  });

  topic('baobao', '禄马奇', 4, '日禄、驿马、干奇', 11, function (rng) {
    var kind = ri(rng, 3);
    if (kind === 0) {
      var g = sub(rng, G), a = LU[g], c = choose(rng, a, [CS10[g], ZH[(ZH.indexOf(a) + 1) % 12], ZH[(ZH.indexOf(a) + 11) % 12]], ZH);
      return { stem: '<b>' + g + '</b>日的禄在哪一支？', opts: c.opts, ai: c.ai,
        why: '日禄：甲寅、乙卯、丙戊巳、丁己午、庚申、辛酉、壬亥、癸子。' + g + '禄在 <b>' + a + '</b>。禄宜旺不宜衰。' };
    }
    if (kind === 1) {
      var z = sub(rng, ZH), a2 = MA[z], c2 = choose(rng, a2, ['寅', '申', '巳', '亥'].filter(function (x) { return x !== a2; }), ZH);
      return { stem: '日支是<b>' + z + '</b>，驿马在哪一支？', opts: c2.opts, ai: c2.ai,
        why: '驿马：申子辰马在寅，巳酉丑马在亥，亥卯未马在巳，寅午戌马在申。' + z + '属' + ({ 寅: '申子辰', 亥: '巳酉丑', 巳: '亥卯未', 申: '寅午戌' }[a2]) + '一组，马在 <b>' + a2 + '</b>。' };
    }
    var g3 = sub(rng, G), a3 = GANQI[g3], c3 = choose(rng, a3, [LU[g3], MU10[g3]], ZH);
    return { stem: '<b>' + g3 + '</b>日的干奇在哪一支？', opts: c3.opts, ai: c3.ai,
      why: '干奇：甲午、乙巳、丙辰、丁卯、戊寅、己丑、庚未、辛申、壬酉、癸戌。' + g3 + '日干奇在 <b>' + a3 + '</b>。⚠️ 只见干奇、不见旬奇，不可为奇。' };
  });

  var LEI = [
    ['文书、消息', '朱雀', '按天将'], ['见贵、求人', '天乙贵人', '按天将'], ['惊恐、怪异', '螣蛇', '按天将'],
    ['捕贼、失盗', '玄武', '按天将'], ['文职求官', '青龙', '按天将'], ['武职求官', '太常', '按天将'],
    ['婚姻（女方）', '天后', '按天将'], ['婚姻（男方）', '青龙', '按天将'], ['兄弟姊妹', '太阴', '人类神'],
    ['道路、行人、疾病、信息', '申', '按支神'], ['车马、出行', '卯', '按支神'], ['酒食、婚姻、祠祀', '未', '按支神'],
    ['阴私、暗昧、妇女', '子', '按支神'], ['奴', '戌', '人类神'], ['婢', '酉', '按支神']
  ];
  var TJ12 = ['天乙贵人', '螣蛇', '朱雀', '六合', '勾陈', '青龙', '天空', '白虎', '太常', '玄武', '太阴', '天后'];
  topic('leishen', '类神', 5, '占什么事看什么字', 12, function (rng) {
    var it = sub(rng, LEI.slice(0, 13).concat([LEI[13], LEI[14]])), isJ = TJ12.indexOf(it[1]) >= 0;
    var pool = isJ ? TJ12 : ZH;
    var valid = LEI.filter(function (x) { return x[0].split('（')[0] === it[0].split('（')[0]; }).map(function (x) { return x[1]; });
    var bad = [];
    var c = choose(rng, it[1], [], pool.filter(function (x) { return valid.indexOf(x) < 0 && (it[0] !== '婢' || (x !== '太阴')); }));
    return { stem: '占<b>' + it[0] + '</b>，取哪一个' + (isJ ? '天将' : '字') + '作类神？', opts: c.opts, ai: c.ai,
      why: '第 12 课「占什么看什么」作业单（' + it[2] + '）：' + it[0] + ' → <b>' + it[1] + '</b>。类神入课传为显，在年命上次之，都不见为晦。' };
  });

  /* 断语规则：每条的 key 必须是教材原文里一字不差的片段（测试逐条回查） */
  var RULES = [
    { l: 10, key: '老怕帝旺少怕衰', q: '老年人占病，课传见帝旺，该怎么看？', a: '反非吉兆', w: ['是吉兆，力量到顶', '与年龄无关，只看月令', '病必速愈'], why: '“老怕帝旺，少怕衰”：老年人占病遇帝旺，反非吉兆；少年则怕衰。' },
    { l: 10, key: '克日为凶', q: '本是吉将的天将，克了日干，吉凶如何？', a: '仍为凶', w: ['仍为吉，吉将不变', '看名号，不看生克', '吉凶各半'], why: '“生日为吉，虽凶将亦吉；克日为凶，虽吉将亦凶”——吉凶不看名号，看与日干的生克。' },
    { l: 10, key: '生日为吉，虽凶将亦吉', q: '本是凶将的天将，生了日干，吉凶如何？', a: '仍可为吉', w: ['仍为凶，凶将不变', '必主灾祸', '不论生克'], why: '生日为吉，虽凶将亦吉。' },
    { l: 10, key: '喜则宜旺相，忌则宜休囚', q: '同一个“旺”字，落在喜用上和落在忌神上，分别如何？', a: '喜的旺相为好，忌的旺相为祸', w: ['都是好事', '都是祸事', '旺不分喜忌'], why: '喜则宜旺相，忌则宜休囚；财旺是好事，鬼旺就是祸。' },
    { l: 10, key: '三传皆财而旺', q: '三传皆财且旺，占求财，怎么看？', a: '财太旺无力担财，反而不利', w: ['财旺必得大财', '只看日干，不论财旺', '主财立至'], why: '过旺反而不及：三传皆财而旺，财太旺，无力担财，求财不利。' },
    { l: 11, key: '昼鬼主公讼是非', q: '鬼入传，昼占和夜占各主什么？', a: '昼鬼主公讼是非，夜鬼主神祇妖祟', w: ['昼鬼主神祇妖祟，夜鬼主公讼是非', '昼夜同断，都主疾病', '昼鬼主财，夜鬼主官'], why: '“昼鬼主公讼是非，夜鬼主神祇妖祟”。' },
    { l: 11, key: '凡鬼宜衰败，不宜生旺', q: '“鬼”宜旺相还是宜衰败？', a: '宜衰败', w: ['宜生旺', '旺衰都无所谓', '只宜入墓'], why: '凡鬼宜衰败，不宜生旺。' },
    { l: 11, key: '仍作德断', q: '德神加日干发用，按五行本是鬼，怎么断？', a: '仍作德断，德能化鬼为吉', w: ['仍作鬼断', '一半吉一半凶', '另起一课'], why: '“凡德加干发用为鬼，仍作德断，不可作鬼断”。' },
    { l: 11, key: '其凶甚于明鬼', q: '明鬼与暗鬼（天将克干）相比，哪个更凶？', a: '暗鬼更凶', w: ['明鬼更凶', '一样凶', '暗鬼不算鬼'], why: '“暗鬼者，天将克干也。其凶甚于明鬼”，遁干之鬼也算暗鬼。' },
    { l: 11, key: '吉不宜冲，凶冲则散', q: '见冲，该怎么断？', a: '先看被冲的是吉是凶：吉不宜冲，凶冲则散', w: ['见冲一律断散', '见冲一律断吉', '冲只看月令'], why: '不能见冲就断散，要先看被冲的是好东西还是坏东西。' },
    { l: 11, key: '如果只见干奇不可为奇', q: '只见干奇、不见旬奇，算不算奇？', a: '不算，不可为奇', w: ['算，干奇单独成立', '算，但福减半', '只看遁奇'], why: '“干奇与旬奇并临为上，如果只见干奇不可为奇”。' },
    { l: 11, key: '禄临支为权摄不正', q: '禄临日干与禄临日支，分别主什么？', a: '临干为日之旺神；临支为权摄不正', w: ['临干为权摄不正；临支为日之旺神', '都是日之旺神', '都主迁动'], why: '“禄临干为日之旺神……禄临支为权摄不正”，占官为暂摄之象，不宜久居。' },
    { l: 11, key: '亥加申主图谋未遂', q: '同是申亥相害：申加亥与亥加申，断法如何？', a: '申加亥先阻后得、有终；亥加申图谋未遂、无始', w: ['申加亥图谋未遂、无始；亥加申先阻后得、有终', '两者断法相同', '害不分上下'], why: '害分方向：申加亥主先阻后得，事必有终；亥加申主图谋未遂，事必无始。' },
    { l: 11, key: '六壬不取', q: '民间“丑破卯、卯破辰”那套六破，六壬取不取？', a: '不取，六壬用子酉、丑辰等六破', w: ['取，两套并用', '取，且优先于子酉六破', '只在占病时取'], why: '“此六破之法，六壬不取。”六壬的六破是子酉、丑辰、寅亥、卯午、巳申、未戌。' },
    { l: 11, key: '驿马并非专主出行', q: '驿马是不是专主出行？', a: '不是，求谋、干谒、迁移都看；占家宅疾病反忌马', w: ['是，只看出行', '是，且只在占行人时看', '不是，且占家宅疾病最喜马'], why: '“驿马并非专主出行，凡求谋做事、趋吉避凶、干谒迁移等等都必看驿马。占家宅、疾病比较忌讳驿马。”' },
    { l: 11, key: '行人逢马落长生或马落空亡，则行人不归', q: '占行人，驿马落长生或落空亡，怎么断？', a: '行人不归', w: ['行人即至', '行人已在路上', '主行人平安'], why: '“行人逢马落长生或马落空亡，则行人不归。”' },
    { l: 11, key: '凶神宜空、救神忌空', q: '旬空对凶神和救神，各有什么影响？', a: '凶神宜空，救神忌空', w: ['凶神忌空，救神宜空', '一律宜空', '一律忌空'], why: '凶神落空则凶减；救神（德、子孙等）落空则救不得力。填实、有生、逢冲则不作空论。' },
    { l: 11, key: '先生克，后煞宝', q: '断课时，生克与八煞九宝哪个在先？', a: '先生克，后煞宝', w: ['先煞宝，后生克', '二者并重不分先后', '只看煞宝'], why: '最根本的是生克，八煞九宝是它的“主体核心”，不是替代品。' },
    { l: 11, key: '见凶先找解药', q: '八煞入课，该怎么处理？', a: '先找有没有解它的（德、子孙、冲破等），别一见煞就断凶', w: ['一见煞就断凶', '只看煞的数量', '煞与课体无关'], why: '煞宝能互相解：德能化鬼、子孙能救鬼、冲能开墓、破可解冤。' }
  ];
  topic('guize', '断语规则', 5, '第 10–11 课的断课原则', 11, function (rng) {
    var r = RULES[ri(rng, RULES.length)], c = choose(rng, r.a, r.w, []);
    return { stem: r.q, opts: c.opts, ai: c.ai, why: r.why, lessonOverride: r.l };
  });

  function topicById(id) { return TOPICS.filter(function (x) { return x.id === id; })[0]; }
  function make(id, seed) {
    var tp = topicById(id);
    var q = tp.gen(mkRng(seed));
    q.topic = id; q.seed = seed; q.lesson = q.lessonOverride || tp.lesson;
    return q;
  }

  root.LiurenPractice = { TOPICS: TOPICS, make: make, mkRng: mkRng, topicById: topicById,
    RULES: RULES, SEASON: SEASON, stateOf: stateOf, tables: { CS10: CS10, CS5: CS5, BAI: BAI, CHONG: CHONG, PO: PO, HAI: HAI, MU5: MU5, MU10: MU10, LU: LU, MA: MA, GANQI: GANQI, LEI: LEI },
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

  /* 阶段过关：与学习路线的分部对应；一套 15 题，答对 12 题（80%）算过。
     第三阶段起（断法框架、分类占断）题目还没做，先不列。 */
  var STAGES = [
    { id: 1, name: '第一阶段 · 把盘立起来', lessons: '第 1–7 课', tiers: [1, 2, 3] },
    { id: 2, name: '第二阶段 · 读懂盘上的字', lessons: '第 8–12 课', tiers: [4, 5] }
  ];
  var PASS_N = 15, PASS_OK = 12;
  function stageById(id) { return STAGES.filter(function (x) { return String(x.id) === String(id); })[0]; }

  function buildSet(mode) {
    var s = stat(), qs = [], i;
    if (mode.indexOf('pass:') === 0) {
      var st = stageById(mode.slice(5)), ids = P.TOPICS.filter(function (x) { return st.tiers.indexOf(x.tier) >= 0; }).map(function (x) { return x.id; });
      var bag = [];
      for (i = 0; i < PASS_N; i++) {
        if (!bag.length) bag = ids.slice().sort(function () { return Math.random() - 0.5; });   // 每类轮流出，保证覆盖
        qs.push({ t: bag.pop(), s: newSeed() });
      }
      return qs;
    }
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
    var tiers = ['', '一 · 起盘基本功', '二 · 四课与旬', '三 · 取三传', '四 · 字的力气与关系（第 10–11 课）', '五 · 类神与断语规则（第 11–12 课）'];
    var h = '<p class="lead">题目由起盘引擎现算、答案必然与课文一致；每题做完讲解推导过程。想练就练，不计时、不打卡。</p>' +
      '<div class="pq-sum"><span>今日 <b>' + nDay + '</b> 题</span><span>累计 <b>' + all + '</b> 题</span><span>正确率 <b>' +
      (all ? Math.round(ok / all * 100) + '%' : '—') + '</b></span></div>' +
      '<div class="pq-go"><button class="btn" data-pq="mix">综合 10 题 · 弱项优先</button>' +
      '<button class="btn" data-pq="wrong"' + (s.wrong.length ? '' : ' disabled') + '>错题回炉 ' + s.wrong.length + '</button></div>';
    var stageH = '<h3 class="pq-h">阶段过关</h3>' + STAGES.map(function (sg) {
      var ps = (s.pass || {})[sg.id];
      return '<button class="pq-row pq-stage' + (ps && ps.ok ? ' done' : '') + '" data-pq="pass:' + sg.id + '"><span class="pq-nm"><b>' + sg.name + '</b><small>' + sg.lessons +
        ' · ' + PASS_N + ' 题答对 ' + PASS_OK + ' 题算过</small></span><span class="pq-n">' + (ps ? (ps.ok ? '已过关' : '未过') : '未测') + '<small>' + (ps ? '最好 ' + ps.best + '/' + PASS_N : '') + '</small></span></button>';
    }).join('');
    h += stageH;
    [1, 2, 3, 4, 5].forEach(function (tier) {
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
    var n = S.qs.length, again = S.wrong.length, passMsg = '';
    if (S.mode.indexOf('pass:') === 0) {
      var sg = stageById(S.mode.slice(5)), ok = S.right >= PASS_OK, sx = stat();
      sx.pass = sx.pass || {};
      var old = sx.pass[sg.id] || { best: 0, ok: false };
      sx.pass[sg.id] = { best: Math.max(old.best, S.right), ok: old.ok || ok, date: today() };
      A.save(PK, sx);
      passMsg = '<p><b>' + (ok ? '✓ ' + sg.name + ' 过关' : '未过关（需答对 ' + PASS_OK + ' 题）') + '</b></p>';
    }
    var names = uniq(S.wrong.map(function (w) { return P.topicById(w.t).name; }));
    box.innerHTML = '<div class="pq-done"><div class="pq-big">' + S.right + ' / ' + n + '</div>' +
      passMsg + '<p>' + (S.right === n ? '全对。' : again ? '这一组错了 ' + again + ' 题（' + A.esc(names.join('、')) + '），已记入「错题回炉」。' : '') + '</p>' +
      '<div class="pq-act"><button class="btn" id="pqHub">练习首页</button><button class="btn pri" id="pqAgain">再来一组</button></div></div>';
    A.$('#pqHub').onclick = function () { A.show('practice', null); };
    A.$('#pqAgain').onclick = function () { var m = S.mode; S = null; A.RENDER.drill(m); };
  }
})(typeof window !== 'undefined' ? window : globalThis);
