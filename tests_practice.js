/* 做题练习：生成题的自洽性。⭐答案用与 practice.js 不同的独立口径重算（直接读 engine.js 的 qike、
   手算天盘），不是把 practice.js 自己的输出再比一遍。 */
require('./engine.js'); require('./practice.js');
const E = globalThis.LiurenEngine, P = globalThis.LiurenPractice;
let fail = 0, n = 0;
const bad = (m) => { fail++; if (fail < 15) console.log('  ✗', m); };
const Z = E.Z, G = E.G;
const t0 = (yj, zs) => { const o = {}; for (let i = 0; i < 12; i++) o[Z[i]] = Z[(i + Z.indexOf(yj) - Z.indexOf(zs) + 12) % 12]; return o; };
for (const tp of P.TOPICS) {
  for (let seed = 1; seed <= 3000; seed++) {
    const q = P.make(tp.id, seed); n++;
    const again = P.make(tp.id, seed);
    if (JSON.stringify(q) !== JSON.stringify(again)) bad(tp.id + ' 种子不确定 ' + seed);
    if (!(q.ai >= 0 && q.ai < q.opts.length)) bad(tp.id + ' 答案下标越界 ' + seed);
    if (new Set(q.opts).size !== q.opts.length) bad(tp.id + ' 选项重复 ' + seed + ' ' + q.opts);
    if (q.opts.length < 2) bad(tp.id + ' 选项太少');
    if (/undefined|NaN/.test(q.stem + (q.why || ''))) bad(tp.id + ' 文本含 undefined ' + seed);
    if (q.qike) {                                  // 独立复核：取法/初传答案＝engine 现算
      const r = E.qike(q.qike.rgz, q.qike.yj, q.qike.zs);
      const want = tp.id === 'qufa' ? r.ke : r.chuan[0];
      if (q.opts[q.ai] !== want) bad(tp.id + ' 答案与 engine 不符 ' + seed);
    }
  }
}
// 月将加时：独立手算
for (let s = 1; s <= 500; s++) {
  const q = P.make('tianpan', s), m = q.stem.match(/月将<b>(.)<\/b>，占时<b>(.)<\/b>。地盘<b>(.)<\/b>/);
  if (q.opts[q.ai] !== t0(m[1], m[2])[m[3]]) bad('tianpan 与手算不符 ' + s);
}
// 课体均衡：各课体都应该出得到
const seen = new Set();
for (let s = 1; s <= 600; s++) seen.add(P.make('qufa', s).opts[P.make('qufa', s).ai]);
if (seen.size < P.KETI.length) bad('课体没出齐：' + [...seen]);
// 旬空：独立用「甲子旬空戌亥…」表
const KONG = { 甲子: '戌亥', 甲戌: '申酉', 甲申: '午未', 甲午: '辰巳', 甲辰: '寅卯', 甲寅: '子丑' };
for (let s = 1; s <= 500; s++) {
  const q = P.make('xunkong', s), rgz = q.stem.match(/<b>(..)<\/b>日/)[1];
  const g = G.indexOf(rgz[0]), z = Z.indexOf(rgz[1]);
  const head = '甲' + Z[((z - g) % 12 + 12) % 12];
  if (q.opts[q.ai] !== KONG[head]) bad('旬空不符 ' + rgz);
}
console.log(fail ? `✗ 做题练习：${fail} 处失败` : `✓ 做题练习：${n} 道题全部自洽`);
process.exit(fail ? 1 : 0);
