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

// ══ 第二期：规则题常量逐条回查教材 markdown（教材改了而题库没改，这里会报）══
const fs = require('fs'), path = require('path');
const md = n => fs.readFileSync(path.join(__dirname, 'content', fs.readdirSync(path.join(__dirname, 'content')).find(f => f.startsWith(n + '-'))), 'utf8');
const L10 = md('10'), L11 = md('11'), L12 = md('12');
const T = P.tables;
// 旺相休囚：逐行解析表格
{
  const rows = L10.match(/^\| \*\*(春|夏|秋|冬|季月)\*\*[^\n]*$/gm) || [];
  if (rows.length < 5) bad('旺相休囚表没解析到');
  for (const r of rows) {
    const cells = r.split('|').map(s => s.replace(/\*|（.*?）/g, '').trim()).filter(Boolean);
    const season = cells[0], els = cells.slice(1);
    ['旺', '相', '休', '囚', '死'].forEach((st, i) => { if (P.stateOf(P.SEASON[season], els[i]) !== st) bad(`旺相休囚 ${season} ${els[i]} 应为 ${st}`); });
  }
}
// 十干长生
{
  const m = L10.match(/甲生亥，丙戊生寅，庚生巳，壬生申，顺行；乙生午，丁己生酉，辛生子，癸生卯，逆行/);
  if (!m) bad('十干长生口诀原文没找到');
  const got = {}; m[0].replace(/([甲乙丙丁戊己庚辛壬癸]+)生(.)/g, (_, gs, z) => { for (const g of gs) got[g] = z; });
  for (const g of G) if (got[g] !== T.CS10[g]) bad('十干长生 ' + g);
}
// 五行长生帝旺墓（表格行）
for (const [el, [a, b, c]] of Object.entries(T.CS5)) {
  const re = new RegExp(`\\| ${el === '水' ? '水（亥子）与土' : el + '（..）'} \\| ${a} \\| ${b} \\| ${c} \\|`);
  if (!re.test(L10)) bad('五行长生帝旺墓行不符：' + el);
}
// 败
{
  const s = '甲乙木败于子，丙丁火败于卯，戊己败于酉……庚辛败于午，壬癸败于酉';
  if (!L11.includes(s)) bad('败的原文没找到');
  s.replace(/([甲乙丙丁戊己庚辛壬癸]+)(?:木|火)?败于(.)/g, (_, gs, z) => { for (const g of gs) if (T.BAI[g] !== z) bad('败 ' + g); });
}
// 冲破害
for (const [name, arr, pat] of [['冲', T.CHONG, /子午、卯酉、寅申、巳亥、丑未、辰戌/], ['破', T.PO, /六破\*\*：子酉、丑辰、寅亥、卯午、巳申、未戌/], ['害', T.HAI, /六害\*\*：子未、丑午、寅巳、卯辰、申亥、酉戌/]]) {
  const m = L11.match(pat); if (!m) { bad(name + ' 原文没找到'); continue; }
  const lst = m[0].replace(/^.*?：/, '').split('、');
  if (lst.join('、') !== arr.join('、')) bad(name + ' 与教材不符');
}
// 墓
{
  if (!L11.includes('未＝木墓，戌＝火墓，丑＝金墓，辰＝水土墓')) bad('五行墓原文没找到');
  if (!L11.includes('未＝甲癸墓，戌＝丙戊乙墓，丑＝庚丁己墓，辰＝壬辛墓')) bad('十干墓原文没找到');
  for (const [z, gs] of [['未', '甲癸'], ['戌', '丙戊乙'], ['丑', '庚丁己'], ['辰', '壬辛']]) for (const g of gs) if (T.MU10[g] !== z) bad('十干墓 ' + g);
  if (T.MU5.木 !== '未' || T.MU5.火 !== '戌' || T.MU5.金 !== '丑' || T.MU5.水 !== '辰') bad('五行墓常量');
}
// 禄、马、干奇
{
  const lu = L11.match(/日禄：([^\n。]+)。/); if (!lu) bad('日禄原文没找到');
  else lu[1].split('、').forEach(it => { const z = it.slice(-1); for (const g of it.slice(0, -1)) if (T.LU[g] !== z) bad('日禄 ' + g); });
  const ma = L11.match(/驿马\*\*：([^\n]+)/); if (!ma) bad('驿马原文没找到');
  else ma[1].replace(/([子丑寅卯辰巳午未申酉戌亥]{3})马在(.)/g, (_, zs, z) => { for (const x of zs) if (T.MA[x] !== z) bad('驿马 ' + x); });
  const gq = L11.match(/\| \*\*干奇\*\* \| ([^|]+) \|/); if (!gq) bad('干奇原文没找到');
  else gq[1].split('、').forEach(it => { if (T.GANQI[it[0]] !== it.slice(-1)) bad('干奇 ' + it); });
}
// 类神：每一条都要在第 12 课作业单里出现
for (const [what, ans] of T.LEI) {
  const key = what.replace(/（.*?）/, '');
  const lines = L12.replace(/\*/g, '').split('\n').filter(l => l.includes(key.split('、')[0]));
  if (!lines.some(l => l.includes(ans) || (ans === '天乙贵人' && l.includes('贵人')))) bad('类神与教材不符：' + what + '→' + ans);
}
// 断语规则：key 必须是教材原句
const LESSON_MD = { 10: L10, 11: L11, 12: L12 };
for (const r of P.RULES) if (!(LESSON_MD[r.l] || '').includes(r.key)) bad('规则原句不在第 ' + r.l + ' 课：' + r.key);

console.log(fail ? `✗ 做题练习：${fail} 处失败` : `✓ 做题练习：${n} 道题全部自洽`);
process.exit(fail ? 1 : 0);
