/* 起盘台（全盘＋成格／毕法初判）与全站搜索。2026-10-22 做题训练删除后，原 tests_train.js 里这两块挪到这里。 */
const fs = require('fs'), path = require('path');
const { JSDOM } = require('jsdom');
const dir = __dirname;
let pass = 0, fail = 0;
const ok = (c, m) => { c ? pass++ : (fail++, console.log('  ✗', m)); };
const dom = new JSDOM(fs.readFileSync(path.join(dir, 'index.html'), 'utf8'), { runScripts: 'outside-only', pretendToBeVisual: true, url: 'https://x.test/liuren-course/' });
const w = dom.window; w.scrollTo = () => {};
const run = f => w.eval(fs.readFileSync(path.join(dir, f), 'utf8'));
fs.readdirSync(path.join(dir, 'data')).filter(f => f.endsWith('.js')).forEach(f => run('data/' + f));
['engine.js', 'pan-detect.js', 'app.js'].forEach(run);
const D = w.document, $ = s => D.querySelector(s), $$ = s => [...D.querySelectorAll(s)];
const sleep = n => new Promise(r => setTimeout(r, n));
(async () => {
  const P = w.PanDetect;
  // 盘一律走 engine.js（《通解》取上神）
  let bad = 0;
  for (let i = 0; i < 300; i++) {
    const gi = Math.floor(Math.random() * 10), zi = Math.floor(Math.random() * 6) * 2 + gi % 2;
    const rgz = '甲乙丙丁戊己庚辛壬癸'[gi] + '子丑寅卯辰巳午未申酉戌亥'[zi];
    const yj = '子丑寅卯辰巳午未申酉戌亥'[Math.floor(Math.random() * 12)], zs = '子丑寅卯辰巳午未申酉戌亥'[Math.floor(Math.random() * 12)];
    const st = P.makeState(rgz, yj, zs), r = w.LiurenEngine.qike(rgz, yj, zs);
    if ([st.cc, st.zc, st.mc].join('') !== r.chuan.join('') || st._ke !== r.ke) bad++;
    P.k64Detect(st);
    if (P.k64Detect.errs.length) bad++;
  }
  ok(!bad, '300 张随机盘：三传课体＝engine.js，成格规则无报错');
  const s0 = P.makeState('甲子', '亥', '卯');
  ok(s0._ke === '重审' && s0.cc + s0.zc + s0.mc === '戌午寅', '口径锁：甲子日亥将卯时＝重审 戌午寅（取上神）');
  // 起盘台界面
  w.__go('lab'); await sleep(30);
  const g = $('#s-gan'), z = $('#s-zhi');
  g.value = '甲'; g.onchange(); z.value = '子'; $('#s-yj').value = '亥'; $('#s-zs').value = '卯'; z.onchange();
  await sleep(30);
  ok([...z.options].every(o => '子寅辰午申戌'.includes(o.value)), '甲日只给阳支');
  const t = $('#labFull').textContent.replace(/\s+/g, ' ');
  ok(/初 戌 → 中 午 → 末 寅/.test(t), '起盘台排出 甲子日亥将卯时 三传 戌午寅');
  ok(/成格/.test(t) && /毕法/.test(t), '起盘台列出成格与毕法初判');
  // 全站搜
  w.__go('search'); const q = $('#q');
  q.value = '晴雨'; q.dispatchEvent(new w.Event('input')); await sleep(400);
  ok($$('#sres .refg').some(x => /附篇|旧版/.test(x.textContent)), '搜「晴雨」能搜到附篇');
  q.value = '游子课'; q.dispatchEvent(new w.Event('input')); await sleep(300);
  ok($$('#sres .refg').some(x => x.textContent === '格局'), '搜「游子课」能搜到格局');
  w.__go('course'); await sleep(30);
  ok(!!$('#toOutline'), '课程列表顶上有学习路线');
  console.log(fail ? `✗ 失败 ${fail} 项（通过 ${pass}）` : `✓ 起盘台与搜索全部通过（${pass} 项）`);
  process.exit(fail ? 1 : 0);
})();
