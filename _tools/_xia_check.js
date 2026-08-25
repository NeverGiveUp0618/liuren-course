/* 下册课例参数校验：用起课引擎复算三传，与原书自述的三传比对。
   用法：node _tools/_xia_check.js <日干支> <月将> <占时> [原书三传如"申亥寅"]
        node _tools/_xia_check.js --find <日干支> <原书三传>   # 反推月将占时
   ⚠️ 口径＝《通解》发用取上神，与教材/engine.js 一致（App 取下神，别拿它来判对错）。
   ⚠️⚠️ --find 常给出 12 个等价解：三传只取决于**月将与占时之差**，不取决于两者的绝对值。
        要定死是哪一组，得另找内证——天将（昼夜贵人不同）、正文里的「日上某某」「支上某某」，
        或原书自己写的时辰。别拿 --find 的第一条就当答案。 */
const path = require('path');
require(path.join(__dirname, '..', 'engine.js'));
const E = globalThis.LiurenEngine, Z = E.Z;
const a = process.argv.slice(2);
if (a[0] === '--find') {
  const [, r, want] = a, hits = [];
  for (const yj of Z) for (const zs of Z) {
    const o = E.qike(r, yj, zs);
    if (o && o.chuan.join('').startsWith(want)) hits.push(`${yj}将${zs}时 → ${o.chuan.join('')} ${o.ke}`);
  }
  console.log(hits.length ? hits.join('\n') : '无解——日干支或三传可能抄错');
} else {
  const [r, yj, zs, want] = a, o = E.qike(r, yj, zs);
  const got = o ? o.chuan.join('') : 'X';
  console.log(`${r} ${yj}将${zs}时 → ${got} ${o ? o.ke + (o.ge ? '·' + o.ge : '') : ''}`
    + (want ? (got.startsWith(want) || got === want ? '  ✓与原书合' : `  ✗原书作 ${want}`) : ''));
}
