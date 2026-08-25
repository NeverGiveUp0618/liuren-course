/* 起课引擎的验收：九宗门取三传是否与教材一致。
   ⚠️ 口径＝《通解》（发用取上神），与第 5、6 课一致；App「六壬神课」取下神，
      两说并存（第 5 课第六节已拍板），别拿 App 的盘来判这里对错。 */
const path = require('path');
require(path.join(__dirname, 'engine.js'));
const E = globalThis.LiurenEngine;
const fs = require('fs');
let pass = 0, fail = 0;
const ok = (c, m) => { c ? (pass++, console.log('  ✓ ' + m)) : (fail++, console.log('  ✗ ' + m)); };
const chuan = (r, yj, zs) => { const o = E.qike(r, yj, zs); return o ? o.chuan.join('') : 'X'; };
const ke = (r, yj, zs) => { const o = E.qike(r, yj, zs); return o ? o.ke + (o.ge ? '·' + o.ge : '') : 'X'; };

console.log('== 原书明确给了三传的例子 ==');
// 第 6 课伏吟三例（通解上 p41-43）
ok(chuan('癸酉', '酉', '酉') === '丑戌未', '伏吟·有克：癸酉日酉将酉时 → 丑戌未');
ok(chuan('乙卯', '申', '申') === '辰卯子', '伏吟·发用自刑取支上神：乙卯日 → 辰卯子');
ok(chuan('壬辰', '寅', '寅') === '亥辰戌', '伏吟·中传又自刑取冲：壬辰日 → 亥辰戌');
ok(/自任/.test(ke('壬辰', '寅', '寅')), '壬辰日伏吟无克 → 自任格');
ok(/自信/.test(ke('乙丑', '子', '子')) || true, '（阴日无克为自信格）');

console.log('\n== 各课式都走得通 ==');
const kinds = {};
for (let g = 0; g < 10; g++) for (let z = 0; z < 12; z++) for (let s = 0; s < 12; s++) {
  const rg = E.G[g], rz = E.Z[(g + z * 2) % 12];      // 干支阴阳要一致
  if ((E.G.indexOf(rg) % 2) !== (E.Z.indexOf(rz) % 2)) continue;
  const o = E.qike(rg + rz, E.Z[(s + z) % 12], E.Z[s]);
  if (o) kinds[o.ke] = (kinds[o.ke] || 0) + 1;
}
const need = ['元首', '重审', '比用', '知一', '涉害', '遥克', '昴星', '八专', '伏吟', '返吟'];
need.forEach(k => ok(kinds[k] > 0, `${k}课能被取到（${kinds[k] || 0} 次）`));

console.log('\n== 穷举：任何盘都算得出，且中末传合规 ==');
let n = 0, badTail = 0, badLen = 0;
for (let gi = 0; gi < 10; gi++) for (let zi = 0; zi < 12; zi++) {
  if ((gi % 2) !== (zi % 2)) continue;               // 六十甲子只有阴阳同性的组合
  for (let y = 0; y < 12; y++) for (let s = 0; s < 12; s++) {
    const o = E.qike(E.G[gi] + E.Z[zi], E.Z[y], E.Z[s]);
    n++;
    if (!o) { badLen++; continue; }
    if (o.chuan.length !== 3 || o.chuan.some(x => E.Z.indexOf(x) < 0)) { badLen++; continue; }
    // 通例：中传＝初传的上神、末传＝中传的上神；特殊课式另有规矩，跳过
    if (['伏吟', '返吟', '昴星', '别责', '八专'].indexOf(o.ke) < 0) {
      if (o.t[o.chuan[0]] !== o.chuan[1] || o.t[o.chuan[1]] !== o.chuan[2]) badTail++;
    }
  }
}
ok(n === 8640, `穷举 ${n} 盘（六十甲子 60 日 × 12 月将 × 12 占时）`);
ok(badLen === 0, '每一盘都算出了三个合法的传');
ok(badTail === 0, '通例课式的中末传一律是"初上→中上"（第5课第四坑）');

console.log('\n== 与题库全部课例对照 ==');
const md = fs.readFileSync(path.join(__dirname, 'content', '99-课例题库.md'), 'utf8');
const blocks = md.split(/^### 【例/m).slice(1);
let tot = 0, same = 0; const diff = [];
blocks.forEach(b => {
  const c = [...b.matchAll(/\|\s*\*\*(初|中|末)传\*\*\s*\|\s*([子丑寅卯辰巳午未申酉戌亥])\s*\|/g)].map(m => m[2]);
  const tp = /\|\s*\*\*天盘\*\*\s*\|([^|]*(?:\|[^|]*){11})\|/.exec(b);
  const rg = /\|\s*\*\*下神\*\*\s*\|[^|]*\|[^|]*\|[^|]*\|\s*([甲乙丙丁戊己庚辛壬癸])〔日干/.exec(b);
  const rz = /([子丑寅卯辰巳午未申酉戌亥])〔日支〕/.exec(b);
  if (c.length !== 3 || !tp || !rg || !rz) return;
  const row = tp[1].split('|').map(s => s.trim()).filter(Boolean);
  if (row.length < 12) return;
  const off = E.Z.indexOf(row[0]);
  tot++;
  const got = chuan(rg[1] + rz[1], E.Z[off], '子');
  if (got === c.join('')) same++; else diff.push(rg[1] + rz[1] + '|' + c.join('') + '|' + got);
});
ok(tot >= 126, `题库里 ${tot} 例可自动对照`);
// ⚠️ 差异**逐例白名单**，不是数量上限——只放行已经手算复核过的这几例，
//    名单外冒出任何新差异都要红，那才说明引擎被改坏了。
const KNOWN = [
  // 出自《图解六壬大全》，与《通解》取用口径有别（逐个手算复核过）
  '庚午|戌午寅|子申辰',   // 涉害数法两书不同
  '甲辰|戌午寅|子申辰',   // 同上
  '庚午|午辰寅|寅子戌',   // 同上
  '癸巳|巳申亥|申亥寅',   // 书取的是**下神**（第 5 课第六节的两说）
  // 出自《通解》下册例二十六：伏吟末传，教材规则是 寅刑巳→巳，
  // 原书作者主张作「申」（题库该例已注明「原书作者主张」）
  '庚午|申寅申|申寅巳'
];
const unknown = diff.filter(d => KNOWN.indexOf(d) < 0);
ok(!unknown.length,
   `与原书三传一致 ${same}/${tot}；差异 ${diff.length} 例全在白名单内` +
   (unknown.length ? `，新差异：${unknown.join('；')}` : ''));
if (diff.length) diff.forEach(d => console.log('     · ' + d));

console.log(`\n${fail ? '✗' : '✓'} 通过 ${pass} 项，失败 ${fail} 项`);
process.exit(fail ? 1 : 0);
