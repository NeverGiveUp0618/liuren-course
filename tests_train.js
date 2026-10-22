/* 综合训练（2026-10-22 自六壬神课 App 迁入）：十三类都出得了题、答案在选项里、盘与引擎一致、能答能记。 */
const fs = require('fs'), path = require('path');
const { JSDOM } = require('jsdom');
const dir = __dirname;
let pass = 0, fail = 0;
const ok = (c, m) => { c ? pass++ : (fail++, console.log('  ✗', m)); };
const dom = new JSDOM(fs.readFileSync(path.join(dir, 'index.html'), 'utf8'), { runScripts: 'outside-only', pretendToBeVisual: true, url: 'https://x.test/liuren-course/' });
const w = dom.window; w.scrollTo = () => {};
const run = f => w.eval(fs.readFileSync(path.join(dir, f), 'utf8'));
fs.readdirSync(path.join(dir, 'data')).filter(f => f.endsWith('.js')).forEach(f => run('data/' + f));
['engine.js', 'train-core.js'].forEach(run);
// ⚠️ app.js/train.js 顶部有 'use strict'：分两次 eval 时各自的顶层 var 只活在自己那次 eval 里，
//    浏览器里两个 <script> 却共用全局——所以测试里拼成一次 eval，才和浏览器一致。
w.eval(fs.readFileSync(path.join(dir, 'app.js'), 'utf8') + '\n;' + fs.readFileSync(path.join(dir, 'train.js'), 'utf8').replace("'use strict';", ''));
const D = w.document, $ = s => D.querySelector(s), $$ = s => [...D.querySelectorAll(s)];
(async () => {
  const H = w.__train, TC = w.TrainCore, G = H.TGEN, CATS = H.TCATS.map(c => c[0]);
  ok(CATS.length === 13, '十三类');
  CATS.forEach(c => {
    const qs = (H.TDYN[c] ? G[c](3) : G[c]());
    ok(qs.length > 0, c + ' 出得了题（' + qs.length + '）');
    ok(qs.every(q => q.opts.includes(q.a) && q.opts.length >= 2 && new Set(q.opts).size === q.opts.length), c + ' 每题答案都在选项里且选项不重复');
    if (!['k64'].includes(c)) ok(qs.every(q => q.opts.filter(o => o === q.a).length === 1), c + ' 只有一个正解');
  });
  // 盘一律走 engine.js（上神）
  for (let i = 0; i < 200; i++) {
    const st = TC.randState(), r = w.LiurenEngine.qike(st.rg + st.rz, st.yj.yj, st.zs);
    if ([st.cc, st.zc, st.mc].join('') !== r.chuan.join('') || st._ke !== r.ke) { ok(false, '三传/课体与 engine.js 不一致：' + st.mt); break; }
  }
  ok(true, '200 张随机盘三传课体都＝engine.js');
  // 甲子日亥将卯时：通解取上神＝重审 戌午寅（App 取下神会不同）
  const s0 = TC.makeState('甲子', '亥', '卯');
  ok(s0._ke === '重审' && s0.cc + s0.zc + s0.mc === '戌午寅', '口径锁：甲子日亥将卯时＝重审 戌午寅');
  ok(!TC.k64Detect.errs.length, '六十四课经判定规则无报错');
  // 题面不能剧透课体名
  const zq = G.zm(20);
  ok(zq.every(q => !KE(q)), '九宗门题面不含课体名');
  function KE(q) { return /元首|重审|比用|知一|涉害|遥克|昴星|别责|八专|伏吟|返吟/.test(q.q); }
  // 界面：今日挑战能答、错了进错题本、对了移出
  H.show('train','daily'); await new Promise(r => setTimeout(r, 30));
  ok($$('#trainBody .topt').length >= 2, '今日挑战出题了');
  const q = H.tr.qs[0];
  const wrongBtn = $$('#trainBody .topt').find(b => q.opts[+b.dataset.k] !== q.a && !(q.alt || []).includes(q.opts[+b.dataset.k]));
  wrongBtn.click();
  ok($('#tFb').textContent.includes('正解'), '答错给正解与解析');
  let td = JSON.parse(w.localStorage.getItem('liuren_course_train'));
  ok(td.nb[q.id] && td.st[q.cat].n === 1, '错题进错题本、按类记账');
  H.show('train','nb'); await new Promise(r => setTimeout(r, 30));
  $('#tNbGo').click();
  const q2 = H.tr.qs[0];
  $$('#trainBody .topt').find(b => q2.opts[+b.dataset.k] === q2.a).click();
  td = JSON.parse(w.localStorage.getItem('liuren_course_train'));
  ok(!td.nb[q2.id], '错题做对一次就移出');
  H.show('train','report'); await new Promise(r => setTimeout(r, 30));
  ok($$('#trainBody .ttab tr').length === 14, '掌握度表 13 类');
  ok(!!$('[data-go="train"]'), '首页有综合训练入口');
  // 起盘台：并入 App 的自选起课器——四课三传与 engine 一致
  H.show('lab'); await new Promise(r => setTimeout(r, 30));
  const g = $('#s-gan'), z = $('#s-zhi'), y = $('#s-yj'), s = $('#s-zs');
  g.value = '甲'; g.dispatchEvent(new w.Event('change')); z.value = '子'; y.value = '亥'; s.value = '卯';
  z.dispatchEvent(new w.Event('change'));
  ok([...z.options].every(o => '子寅辰午申戌'.includes(o.value)), '甲日只给阳支');
  ok(/初 戌 → 中 午 → 末 寅/.test($('#labFull').textContent.replace(/\s+/g, ' ')), '起盘台排出 甲子日亥将卯时 三传 戌午寅：' + $('#labFull').textContent.slice(0, 80));
  ok(/成格/.test($('#labFull').textContent) && /毕法/.test($('#labFull').textContent), '起盘台列出成格与毕法初判');
  // 全站搜：附篇/格局/毕法/课例/象法也搜得到（以前只搜 25 课）
  H.show('search'); const sq = $('#q'); sq.value = '晴雨'; sq.dispatchEvent(new w.Event('input'));
  await new Promise(r => setTimeout(r, 400));
  ok([...D.querySelectorAll('#sres .refg')].some(g => /旧版 App 存档/.test(g.textContent)), '搜「晴雨」能搜到附篇里的天时晴雨');
  sq.value = '游子课'; sq.dispatchEvent(new w.Event('input')); await new Promise(r => setTimeout(r, 300));
  ok([...D.querySelectorAll('#sres .refg')].some(g => g.textContent === '格局'), '搜「游子课」能搜到格局');
  // 首页精简后入口还都找得到
  H.show('train', 'menu'); await new Promise(r => setTimeout(r, 30));
  ok(!!$('#trainBody [data-t="drill"]'), '综合训练里有「手填三传」（原起课练习）');
  H.show('course'); await new Promise(r => setTimeout(r, 30));
  ok(!!$('#toOutline'), '课程列表顶上有学习路线');
  console.log(fail ? `✗ 失败 ${fail} 项（通过 ${pass}）` : `✓ 综合训练全部通过（${pass} 项）`);
  process.exit(fail ? 1 : 0);
})();
