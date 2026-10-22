/* 大六壬起课引擎 —— 九宗门取三传（教材口径）
   =========================================================================
   ⚠️⚠️ 口径：**发用取"上神"**，按《大六壬通解》，与本教材第 5、6 课一致。
        「六壬神课」App 的起课器在重审/知一/涉害/八专/伏吟/返吟里取的是**下神**，
        同一张盘会差一位。两说并存，2026-07 已拍板：教材按《通解》，App 保持
        现行盘面。**改这里之前先读第 5 课第六节**，别把两边扯平。

   判断顺序＝第 6 课「〇、先把整条流水线摆出来」那张表，一步都不能换位置：
     伏吟／返吟先判 → 贼克 → 比用 → 涉害 → 遥克 → 昴星 → 别责 → 八专
   ========================================================================= */
(function (root) {
  'use strict';

  var Z = '子丑寅卯辰巳午未申酉戌亥'.split('');
  var G = '甲乙丙丁戊己庚辛壬癸'.split('');
  // 干寄宫：四正（子午卯酉）无寄干
  var JI = { 甲: '寅', 乙: '辰', 丙: '巳', 戊: '巳', 丁: '未', 己: '未',
             庚: '申', 辛: '戌', 壬: '亥', 癸: '丑' };
  // 地盘各宫所寄的天干——涉害数"重"时要算进去（第 5 课：漏掉寄干是最常见的算错）
  var GONG_GAN = { 寅: ['甲'], 辰: ['乙'], 巳: ['丙', '戊'], 未: ['丁', '己'],
                   申: ['庚'], 戌: ['辛'], 亥: ['壬'], 丑: ['癸'] };
  var WX = { 子: '水', 亥: '水', 寅: '木', 卯: '木', 巳: '火', 午: '火',
             申: '金', 酉: '金', 丑: '土', 辰: '土', 未: '土', 戌: '土' };
  var WXG = { 甲: '木', 乙: '木', 丙: '火', 丁: '火', 戊: '土', 己: '土',
              庚: '金', 辛: '金', 壬: '水', 癸: '水' };
  var KE = { 水: '火', 火: '金', 金: '木', 木: '土', 土: '水' };
  // 三刑：伏吟的中末传全靠它
  var XING = { 寅: '巳', 巳: '申', 申: '寅', 丑: '戌', 戌: '未', 未: '丑',
               子: '卯', 卯: '子', 辰: '辰', 午: '午', 酉: '酉', 亥: '亥' };
  var HE_GAN = { 甲: '己', 乙: '庚', 丙: '辛', 丁: '壬', 戊: '癸',
                 己: '甲', 庚: '乙', 辛: '丙', 壬: '丁', 癸: '戊' };
  // 驿马：申子辰马在寅、寅午戌马在申、巳酉丑马在亥、亥卯未马在巳
  var MA = { 申: '寅', 子: '寅', 辰: '寅', 寅: '申', 午: '申', 戌: '申',
             巳: '亥', 酉: '亥', 丑: '亥', 亥: '巳', 卯: '巳', 未: '巳' };
  var MENG = '寅申巳亥', ZHONG = '子午卯酉';

  function wx(x) { return WX[x] || WXG[x]; }
  function ke(a, b) { return KE[wx(a)] === wx(b); }              // a 克 b
  function yang(x) { return G.indexOf(x) >= 0 ? G.indexOf(x) % 2 === 0 : Z.indexOf(x) % 2 === 0; }
  function idx(z) { return Z.indexOf(z); }

  function tianpan(yj, zs) {
    var off = (idx(yj) - idx(zs) + 12) % 12, m = {};
    Z.forEach(function (d) { m[d] = Z[(idx(d) + off) % 12]; });
    m._off = off;
    return m;
  }

  /* 涉害：从上神所临的地盘位起，顺行数到它自己的本家，沿途同一种克重复几遍。
     ⚠️ 起点那一格也要数（原书例：丑加卯，从卯起就算卯木克丑这一重）；
        本家那一格不数（数到本位止）。寄干各算一重。 */
  function sheHai(shen, dizhi, isXia) {
    var n = 0, start = idx(dizhi), home = idx(shen);
    for (var s = 0; s < 12; s++) {
      var pos = (start + s) % 12;
      if (pos === home && s > 0) break;          // 走回本家，停
      var gong = Z[pos];
      var list = [gong].concat(GONG_GAN[gong] || []);
      list.forEach(function (x) {
        if (isXia ? ke(x, shen) : ke(shen, x)) n++;   // 下贼上数"谁克它"，上克下数"它克谁"
      });
      if (s === 11) break;
    }
    return n;
  }

  function pick(cands, rg, t) {
    // ① 比用：与日干阴阳相同者
    var bi = cands.filter(function (c) { return yang(c.shang) === yang(rg); });
    if (bi.length === 1) return { z: bi[0].shang, how: '比用' };
    var pool = bi.length ? bi : cands;
    if (pool.length === 1) return { z: pool[0].shang, how: '比用' };
    // ② 涉害：数克的重数
    var deep = pool.map(function (c) {
      var di = Z.filter(function (d) { return t[d] === c.shang; })[0];
      return { c: c, n: sheHai(c.shang, di, c.xia), meng: MENG.indexOf(di) >= 0,
               zhong: ZHONG.indexOf(di) >= 0 };
    });
    var mx = Math.max.apply(null, deep.map(function (d) { return d.n; }));
    var top = deep.filter(function (d) { return d.n === mx; });
    if (top.length === 1) return { z: top[0].c.shang, how: '涉害' };
    // ③ 平手：孟 > 仲 > 复等（阳日取第一课、阴日取第三课）
    var m = top.filter(function (d) { return d.meng; });
    if (m.length === 1) return { z: m[0].c.shang, how: '涉害·见机' };
    var zh = (m.length ? m : top).filter(function (d) { return d.zhong; });
    if (zh.length === 1) return { z: zh[0].c.shang, how: '涉害·察微' };
    var rest = m.length ? m : (zh.length ? zh : top);
    var want = yang(rg) ? 0 : 2;                 // 复等：阳日第一课、阴日第三课
    var hit = rest.filter(function (d) { return d.c.i === want; })[0] || rest[0];
    return { z: hit.c.shang, how: '涉害·复等' };
  }

  function qike(rgz, yj, zs) {
    var rg = rgz.charAt(0), rz = rgz.charAt(1);
    if (G.indexOf(rg) < 0 || idx(rz) < 0 || idx(yj) < 0 || idx(zs) < 0) return null;
    var t = tianpan(yj, zs), off = t._off, ji = JI[rg];
    var k1 = t[ji], k2 = t[k1], k3 = t[rz], k4 = t[k3];
    var sk = [{ i: 0, xia: rg, shang: k1 }, { i: 1, xia: k1, shang: k2 },
              { i: 2, xia: rz, shang: k3 }, { i: 3, xia: k3, shang: k4 }];
    var r = { rgz: rgz, yj: yj, zs: zs, off: off, t: t, ji: ji, sk: sk };

    // 四课去重后剩几课——别责看三课、八专看两课
    var uniq = [];
    sk.forEach(function (c) {
      var key = c.xia + '/' + c.shang;
      if (uniq.indexOf(key) < 0) uniq.push(key);
    });
    r.nKe = uniq.length;
    r.bazhuan = (ji === rz);

    var xia = sk.filter(function (c) { return ke(c.xia, c.shang); });   // 下贼上
    var shang = sk.filter(function (c) { return ke(c.shang, c.xia); }); // 上克下
    var cands = xia.length ? xia : shang;
    cands.forEach(function (c) { c.xia_flag = xia.length > 0; });
    var hasKe = cands.length > 0;

    function tail(c0) { var c1 = t[c0], c2 = t[c1]; return [c0, c1, c2]; }

    // —— 伏吟／返吟先判 ——
    if (off === 0) {
      var u;
      if (hasKe) {
        u = cands.length === 1 ? cands[0].shang
                               : pick(cands.map(function (c) { return { i: c.i, shang: c.shang, xia: xia.length > 0 }; }), rg, t).z;
      } else {
        u = yang(rg) ? k1 : k3;                  // 刚看日上，柔取辰
      }
      var mid = (XING[u] === u) ? (u === k1 ? k3 : k1) : XING[u];   // 自刑→取另一头
      var end = (XING[mid] === mid) ? Z[(idx(mid) + 6) % 12] : XING[mid];
      r.chuan = [u, mid, end];
      r.ke = '伏吟';
      r.ge = hasKe ? '' : (yang(rg) ? '自任' : '自信');
      return r;
    }
    if (off === 6) {
      if (hasKe) {
        var uu = cands.length === 1 ? cands[0].shang
                                    : pick(cands.map(function (c) { return { i: c.i, shang: c.shang, xia: xia.length > 0 }; }), rg, t).z;
        r.chuan = tail(uu); r.ke = '返吟'; r.ge = '无依';
      } else {
        // 井栏射：日之驿马发用，支上神为中传，日上神为末传
        r.chuan = [MA[rz], k3, k1]; r.ke = '返吟'; r.ge = '无亲·井栏射';
      }
      return r;
    }

    // —— 八专：干支同宫，有克按克（不用遥克），无克数三位 ——
    if (r.bazhuan) {
      if (hasKe) {
        var u8 = cands.length === 1 ? cands[0].shang
                                    : pick(cands.map(function (c) { return { i: c.i, shang: c.shang, xia: xia.length > 0 }; }), rg, t).z;
        r.chuan = tail(u8);
      } else if (yang(rg)) {
        r.chuan = [Z[(idx(k1) + 2) % 12], k1, k1];              // 阳日：日上神顺数三位
      } else {
        r.chuan = [Z[(idx(k4) - 2 + 12) % 12], k1, k1];         // 阴日：第四课上神逆数三位
      }
      r.ke = '八专';
      return r;
    }

    // —— 贼克／比用／涉害 ——
    if (hasKe) {
      var res;
      if (cands.length === 1) {
        res = { z: cands[0].shang, how: xia.length ? '重审' : '元首' };
      } else {
        res = pick(cands.map(function (c) { return { i: c.i, shang: c.shang, xia: xia.length > 0 }; }), rg, t);
        if (res.how === '比用') res.how = xia.length ? '比用' : '知一';
        else res.how = '涉害' + (res.how.indexOf('·') > 0 ? res.how.slice(res.how.indexOf('·')) : '');
      }
      r.chuan = tail(res.z);
      r.ke = res.how.split('·')[0];
      r.ge = res.how.indexOf('·') > 0 ? res.how.split('·')[1] : '';
      return r;
    }

    // —— 遥克：四课上神与日干斜克 ——
    var ups = sk.map(function (c) { return c.shang; });
    var haoshi = sk.filter(function (c) { return ke(c.shang, rg); });   // 上神克日干
    var tanshe = sk.filter(function (c) { return ke(rg, c.shang); });   // 日干克上神
    if (haoshi.length || tanshe.length) {
      var yc = haoshi.length ? haoshi : tanshe;
      var uy = yc.length === 1 ? yc[0].shang
                               : pick(yc.map(function (c) { return { i: c.i, shang: c.shang, xia: false }; }), rg, t).z;
      r.chuan = tail(uy);
      r.ke = '遥克';
      r.ge = haoshi.length ? '蒿矢' : '弹射';
      return r;
    }

    // —— 别责：四课不全（只三课） ——
    if (r.nKe === 3) {
      var u3 = yang(rg) ? t[JI[HE_GAN[rg]]]                     // 阳日：日干合干寄宫的上神
                        : Z[(idx(rz) + 4) % 12];                // 阴日：日支前一位三合支
      if (!yang(rg)) u3 = t[Z[(idx(rz) + 4) % 12]];
      r.chuan = [u3, k1, k1];                                   // 中末都取日上神
      r.ke = '别责';
      return r;
    }

    // —— 昴星 ——
    if (yang(rg)) {
      r.chuan = [t['酉'], k3, k1];                              // 阳日仰视：地盘酉上的天盘支
      r.ge = '虎视转蓬';
    } else {
      r.chuan = [Z.filter(function (d) { return t[d] === '酉'; })[0], k1, k3];  // 阴日俯视：天盘酉下的地盘支
      r.ge = '冬蛇掩目';
    }
    r.ke = '昴星';
    return r;
  }

  root.LiurenEngine = { qike: qike, tianpan: tianpan, Z: Z, G: G, JI: JI };
})(typeof window !== 'undefined' ? window : globalThis);
