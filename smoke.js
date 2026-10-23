/* 冒烟测试：在 jsdom 里真跑一遍页面。
   ⭐ 这里的断言必须能真的失败——不只查"元素在不在"，还拿独立复算的盘面
      与页面渲染出来的盘逐格比对，防止内容与算法悄悄分叉。 */
const fs = require('fs');
const path = require('path');
let JSDOM;
try { ({ JSDOM } = require('jsdom')); }
catch (e) { ({ JSDOM } = require(path.join(__dirname, '..', 'bazi-course', 'node_modules', 'jsdom'))); }

const dir = __dirname;
let pass = 0, fail = 0;
const ok = (c, m) => { c ? (pass++, console.log('  ✓', m)) : (fail++, console.log('  ✗', m)); };

const dom = new JSDOM(fs.readFileSync(path.join(dir, 'index.html'), 'utf8'), {
  runScripts: 'outside-only', pretendToBeVisual: true, url: 'https://x.test/liuren-course/'
});
const { window } = dom;
const doc = window.document;
let scrolls = [];
window.scrollTo = (x, y) => { scrolls.push(typeof x === 'object' ? x.top : y); };
window.matchMedia = window.matchMedia || (() => ({ matches: false, addListener() {}, removeListener() {} }));
window.Element.prototype.scrollIntoView = function () { scrolls.push('into'); };

// ⚠️ eval 在 strict 下不会把函数声明泄到全局，而浏览器的 <script> 会。
// 去掉这一行指令，才是在模拟真实加载，而不是制造一个测不到函数的假环境。
const run = f => window.eval(fs.readFileSync(path.join(dir, f), 'utf8').replace(/^'use strict';\s*/, ''));
run('data/data-meta.js');
run('data/data-course.js');          // 预置，绕开按需加载（另有断言查 ?v=）
run('engine.js');            // 起课引擎（起盘台要用）
run('pan-detect.js');        // 起盘台的成格／毕法判定（页面里按需加载，这里预置）
run('data/data-ref.js');
run('data/data-quiz.js');            // 同上，预置绕开按需加载
// ⭐ 2026-10-23 正文拆块：课例、毕法赋的 html 在 data/q/、data/bf/，点开才加载；这里全部预置
['q', 'bf'].forEach(k => fs.readdirSync(path.join(dir, 'data', k)).sort().forEach(f => run('data/' + k + '/' + f)));
const BODY = () => window.BODY || {};
run('data/data-ge.js');
run('app.js');
const $ = s => doc.querySelector(s);
const $$ = s => [].slice.call(doc.querySelectorAll(s));
const M = window.DATA_META, C = window.DATA_COURSE, Q = window.DATA_QUIZ, GE = window.DATA_GE;


// ── 象法速查（2026-08-30 从 liuren-game 的 XF_FA/XF_LEI/XF_BZG 迁入）──
console.log('\n== 象法速查 ==');
(function () {
  const xp = path.join(dir, 'data', 'data-xf.js');
  ok(fs.existsSync(xp), 'data-xf.js 已生成');
  if (!fs.existsSync(xp)) return;
  // ⚠️ 必须套一层括号：DATA_XF 是**对象**，`{...}` 在语句位置会被当成代码块，
  //    不是对象字面量（DATA_BIFA 是数组，所以那边不加也没事）。
  const X = eval('(' + fs.readFileSync(xp, 'utf8')
    .replace(/^[\s\S]*?DATA_XF\s*=/, '').replace(/;\s*$/, '') + ')');
  ok(X.items.length === 295, `象法 295 条（含 2026-10-22 并入的天时 6 条）（实得 ${X.items.length}）`);
  ok(X.libs.length === 6, '六库（2026-10-22 并入天时晴雨）');
  const byLib = {}; X.items.forEach(i => byLib[i.lib] = (byLib[i.lib] || 0) + 1);
  ok(byLib['取象法则'] === 106 && byLib['分类类神'] === 113
     && byLib['百章歌断诀'] === 46, '前三库 106/113/46');
  // ⭐ 08/09 课写明「完整清单请查 App 的象法速查」——清单必须在站内，
  //    否则 game 冻结后那两条指路就悬空了
  ok(byLib['支神类象·白话'] === 12 && byLib['天将类象·白话'] === 12,
     '两套白话类象各 12 条（08/09 课指向的那份清单）');
  ok(X.libs.every(l => l.n === byLib[l.name]), '库计数与实际条数一致');
  ok(X.items.every(i => i.name && i.grp && i.html && i.src), '每条都有名/组/正文/出处');
  ok(M.counts.xf === 295, 'meta.counts.xf = 295（首页菜单的分母）');
  // ⚠️ FX_CATS 是练习入口（fn:startZM 这类函数引用），不是内容——不该被迁进来
  ok(!/startZM|startSC|startZL/.test(fs.readFileSync(xp, 'utf8')),
     '没有把练习入口函数当内容迁进来');
  ok(!!$('#s-xflist') && !!$('[data-go="xflist"]'), '象法屏与首页入口都在');
})();

// ── 金锁玉匙（2026-09-14 自《通解》下册外编第一节整理）──────────
// ⚠️ data-jinsuo.js 按需加载，这里直接读文件验；屏的交互在下面的异步块里真点一遍
console.log('\n== 金锁玉匙 ==');
let J = null;   // 下面的异步块也要用它核对练习链接落点
(function () {
  const jp = path.join(dir, 'data', 'data-jinsuo.js');
  ok(fs.existsSync(jp), 'data-jinsuo.js 已生成');
  if (!fs.existsSync(jp)) return;
  J = eval('(' + fs.readFileSync(jp, 'utf8')
    .replace(/^[\s\S]*?DATA_JINSUO\s*=/, '').replace(/;\s*$/, '') + ')');
  ok(J.a.length === 94 && J.a.every((e, i) => e.n === i + 1), `象类 94 首、序号连续（实得 ${J.a.length}）`);
  ok(J.b.length === 41 && J.b.every((e, i) => e.n === i + 1), `神将神煞 41 首（原书序号三十八重出，实为 41）`);
  ok(J.a.every(e => e.name && e.poem && e.quote) && J.b.every(e => e.name && e.poem && e.cond && e.quote),
     '每首都有格名/诗/原文引用块');
  ok(J.a.every(e => /通解下 p\d+/.test(e.quote)), '象类每条引用块都带下册页码');
  // ⭐ 12×12 格子：主条＋又见由 build.py 从各条「相加/又见」算出，这里独立复核几处
  const Z = '子丑寅卯辰巳午未申酉戌亥';
  const cells = []; for (const a of Z) for (const b of Z) cells.push(a + b);
  const listed = cells.filter(c => J.grid[c]);
  ok(cells.length - listed.length === J.miss.length && J.miss.length === 4,
     `原书未列 4 格（${J.miss.join('、')}），其余 ${listed.length} 格都能查到`);
  ok(J.grid['丑子'] && J.a[J.grid['丑子'].n - 1].name === '鹊噪高枝', '老师示例：丑加子 → 鹊噪高枝');
  ok(J.grid['子子'] && J.a[J.grid['子子'].n - 1].name === '重载浅水' && J.grid['戌戌'] && J.grid['戌戌'].n === 2,
     '伏吟十二式都指到重载浅水（含原书未单列的五式，条目备注写了推定）');
  ok(J.grid['辰巳'] && J.grid['辰巳'].n === -1 && J.none.length === 8, '原书「无课无诗」8 格');
  ok(J.grid['寅亥'] && J.grid['寅亥'].n === -2, '寅加亥＝玄胎课象，无诗');
  // ⚠️ 原书同一格两条认领的，主条与又见都要留着——不能替原书裁掉一条
  ok(J.grid['巳亥'] && J.grid['巳亥'].n === 53 && J.grid['巳亥'].alt.indexOf(37) >= 0, '巳加亥：主条闪电春雷，又见白浪翻江');
  ok(J.grid['辰子'] && J.grid['辰子'].n === 40 && J.grid['辰子'].alt.indexOf(41) >= 0, '辰加子：龙投枯井＋见青龙的春雷行雨');
  ok(J.grid['戌丑'] && J.grid['戌丑'].n === 19 && J.grid['戌丑'].alt.indexOf(31) >= 0, '戌加丑：主鸣鹤在阴，又见巍峰枯木');
  // ⚠️ OCR 讹字要照录进引用块、在备注里说明，不能改原文——否则 _verify_cite 对不上
  const e19 = J.a[18];
  ok(/戊加丑/.test(e19.quote) && /「戊加丑」是 OCR 讹字/.test(e19.note), '讹字照录＋备注说明（十九鸣鹤在阴）');
  ok(J.b[37].poem.startsWith('功曹太冲为草木'), '被脚注劈开的诗句已接回（三十八茂草逢春）');
  ok(M.counts.jinsuo === 94 && M.counts.jinsuob === 41, 'meta.counts 带两个分母');
  ok(!!$('#s-jinsuo') && !!$('[data-go="jinsuo"]'), '金锁玉匙屏与首页入口都在');
  ok(/data-jinsuo\.js\?v=/.test(fs.readFileSync(path.join(dir, 'app.js'), 'utf8')), '按需加载带 ?v=');
  // 内容源里每条引用都写了页码，且页码换算是「书内 = PDF + 732」
  const md = fs.readFileSync(path.join(dir, 'content', '93-金锁玉匙.md'), 'utf8');
  const cites = md.match(/〔通解下 p(\d+)(?:-\d+)?｜PDF p(\d+)/g) || [];
  ok(cites.length >= 150 && cites.every(c => {
    const m = c.match(/p(\d+)(?:-\d+)?｜PDF p(\d+)/); return +m[1] === +m[2] + 732;
  }), `93 篇 ${cites.length} 条引用页码换算一致`);
})();

// ── 首页分组（2026-08-30：11 项平铺改成四组）────────────────────
console.log('\n== 首页分组 ==');
{
  const groups = $$('.menu .mgrp').map(e => e.textContent.trim());
  ok(groups.length === 4, `四个分组（实得 ${groups.length}）`);
  ok(groups.every(g => /^[学练查读] · /.test(g)), '组名是「学/练/查/读 · 一句话」');
  const items = $$('.menu .mi');
  ok(items.length === 10, `入口 10 项一个不少（实得 ${items.length}；2026-10-22：做题训练整套删除待重做，学习路线进课程列表，源流进附篇）`);
  ok(!$('[data-go="train"]') && !$('[data-go="drill"]') && !$('#s-train') && !$('#s-drill'), '做题训练已删干净（综合训练、起课练习）');
  // ⚠️ 每一项都必须落在某个组下面——漏在组外的项在界面上会显得没头没尾
  const kids = [].slice.call($('.menu').children);
  let seen = 0, orphan = 0;
  kids.forEach(el => {
    if (el.classList.contains('mgrp')) seen++;
    else if (el.classList.contains('mi') && !seen) orphan++;
  });
  ok(!orphan, `没有落在组外的入口（${orphan} 项）`);
  // ⚠️ 底栏那三项（课程/课例/速查）在首页也有，是有意的：首页当目录、底栏当快捷。
  //    但别让它变成「四张大卡片＋底栏四栏」那种同一件事做两遍（六壬神课踩过）。
  ok($$('.menu .mi').length > $$('.tabbar button').length * 2,
     '首页目录明显比底栏宽（不是把底栏又摆一遍）');
}

// ── 附篇：源流 / 课式八要素（2026-08-30 迁入）──────────────────
console.log('\n== 附篇 ==');
(function () {
  const ep = path.join(dir, 'data', 'data-extra.js');
  ok(fs.existsSync(ep), 'data-extra.js 已生成');
  if (!fs.existsSync(ep)) return;
  const E = eval(fs.readFileSync(ep, 'utf8')
    .replace(/^[\s\S]*?DATA_EXTRA\s*=/, '').replace(/;\s*$/, ''));
  // 2026-10-22 起另有 80–91「六壬神课 App 存档」12 篇，id＝x+编号
  ok(E.length === 5, `附篇 5 篇＝源流·八要素＋旧版 3（入门与原理、速查合编、口诀；八煞九宝 2026-10-23 并进第 11 课，实得 ${E.length}）`);
  ok(/附、八煞九宝逐项详解/.test(C.find(l => l.id === "L11").html), "八煞九宝详解已并进第 11 课");
  ok(/data-wiki="97-#12"/.test(C.find(l => l.id === "L24").html) && /data-wiki="98-#\d+"/.test(C.find(l => l.id === "L18").html), "第 24 课链到毕法、第 18 课链到格局");
  ok(E.filter(x => /^x\d\d$/.test(x.id)).every(x => /迁自旧版「六壬神课」App/.test(x.text) && x.line),
     'App 存档每篇都注明迁自 App，且有一句话简介');
  ok(E.every(x => x.id && x.title && x.html), '每篇都有 id/标题/正文');
  const ids = E.map(x => x.id).filter(i => !/^x/.test(i)).sort().join(',');
  ok(ids === 'bayao,liuyuan', `id 为 bayao,liuyuan（实得 ${ids}）`);
  const bay = E.filter(x => x.id === 'bayao')[0];
  ok(bay && bay.heads.length === 8, '课式八要素正好 8 项');
  // ⚠️ 源流篇不该混进「核心逻辑/起课流程/四大断则」——那段是与 1-11 课重复的总纲摘要
  const ly = E.filter(x => x.id === 'liuyuan')[0];
  ok(ly && !/四大断则|起课流程/.test(ly.text), '源流篇没有混入重复的总纲摘要');
  ok(!!$('#s-extra'), '附篇屏在 index.html 里');
  ok($$('[data-go="extra"]').length === 1 && $$('[data-go="xarch"]').length === 1, '首页：八要素单列＋附篇列表一个入口');
  ok($$('[data-go="extra"]').every(b => b.dataset.id), '入口都带 data-id');
})();

// ── 毕法赋（2026-08-30 从 liuren-game 的 BF_KU 迁入）───────────────
// ⚠️ data-bifa.js 是按需加载的，smoke 里直接 require 进来验，别指望首屏有它
console.log('\n== 毕法赋 ==');
(function () {
  const bp = path.join(dir, 'data', 'data-bifa.js');
  ok(fs.existsSync(bp), 'data-bifa.js 已生成');
  if (!fs.existsSync(bp)) return;
  const src = fs.readFileSync(bp, 'utf8');
  ok(!/^\s*<script/.test(src), 'data-bifa.js 是纯 js');
  const B = eval(src.replace(/^[\s\S]*?DATA_BIFA\s*=/, '') .replace(/;\s*$/, ''));
  ok(B.length === 100, `毕法赋 100 法（实得 ${B.length}）`);
  ok(B.every((f, i) => f.n === i + 1), '法号 1–100 连续');
  const ge = B.reduce((a, f) => a + f.ge.length, 0);
  ok(ge === 356, `格 356（实得 ${ge}）`);
  ok(B.every(f => !f.html && BODY()['bf' + f.n] && f.ju && f.pian), '每法都有 ju/pian，正文在 data/bf/ 分块里');
  ok(src.length < 700 * 1024, `毕法赋列表瘦身到 700KB 以内（实得 ${(src.length / 1024) | 0}KB）`);
  // ⚠️ 首屏 data-meta 必须带上分母，否则首页菜单显示「—」
  ok(M.counts.bifa === 100, 'meta.counts.bifa = 100（首页菜单的分母）');
  // ⭐ 口径：统一《通解》。md 里凡与原数据不符的都留了〔订正〕，别把注抹掉
  const md = fs.readFileSync(path.join(dir, 'content', '97-毕法赋详解.md'), 'utf8');
  const fixes = (md.match(/〔订正〕/g) || []).length;
  ok(fixes >= 53, `订正注至少 53 条（月将 13 ＋ 三传 40，实得 ${fixes}）`);
  ok(/涉害深浅/.test(md) && /取下神/.test(md), '订正注带分歧类型');
  ok($('#s-bflist') && $('#s-bifa'), '毕法赋两个屏都在 index.html 里');
  ok(!!$('[data-go="bflist"]'), '首页菜单有毕法赋入口');
})();

console.log('\n== 数据与内容源一致 ==');
// ⭐ 附篇的判定是**规则不是清单**：00 是总目录，编号 ≥ 80 的都是附篇（2026-10-22 从 90 放宽）。
//    与 build.py 的 build_lessons 同一条规则——这样以后加 95- 之类不必两边改。
//    （先前写死成 (00|98|99) 的清单，加一次附篇就红一次。）
const mdFiles = fs.readdirSync(path.join(dir, 'content'))
  .filter(f => /^\d\d-/.test(f))
  .filter(f => { const n = +f.slice(0, 2); return n !== 0 && n < 80; });
ok(C.length === mdFiles.length, `课数与 content/ 的 md 数一致（${C.length}）`);
ok(M.counts.lesson === C.length, 'meta 的课数与课文数一致');
ok(M.plan.length >= C.length, `总目录计划表 ${M.plan.length} 课 ≥ 已成 ${C.length} 课`);
ok(M.plan.filter(p => p.done).length === C.length, '标 ✅ 的课数＝实际写成的课数');
ok(C.every(l => /class="src"/.test(l.html)), '每课都有出处标注');
ok(C.every(l => /自测/.test(l.text) && /答案/.test(l.text)), '每课都有自测与答案');

console.log('\n== 首页 ==');
ok($('#hLesson').textContent === String(C.length), '首页课数＝' + C.length);
ok($('#hPlan').textContent === String(M.counts.planned), '首页计划课数');
ok(+$('#hPan').textContent > 0, '首页统计了式盘数');
ok(/内容更新于/.test($('#buildInfo').textContent), '显示构建时间');
const counts = JSON.parse(window.localStorage.getItem('liuren_course_counts') || '{}');
ok(counts.lesson === C.length, '写了 liuren_course_counts 给导航看板当分母');

console.log('\n== 课程列表 ==');
$$('.mi[data-go="course"]')[0].onclick();
const rows = $$('#courseList .li');
ok(rows.length === M.plan.length, `列出全部 ${M.plan.length} 课（含未写的）`);
ok($$('#courseList .li[data-id]').length === C.length, '可点的正好是已写成的 ' + C.length + ' 课');
ok($$('#courseList .li.todo').length === M.plan.length - C.length, '其余标为待写');
ok($$('#courseList .part').length >= 6, '按六部分分组');

console.log('\n== 课文 ==');
$$('#courseList .li[data-id]')[0].onclick();
const body = $('#lessonBody');
ok(/第1课/.test($('#ttl').textContent), '顶栏显示课号');
ok(body.querySelectorAll('h2').length >= 5, '正文分节渲染');
ok(!/\*\*/.test(body.textContent), '没有残留的 markdown 星号');
ok(body.querySelectorAll('blockquote.cite').length > 0, '原文引用块有 cite 样式');
ok(body.querySelectorAll('blockquote.warn').length > 0, '易错点有 warn 样式');

console.log('\n== 式盘渲染（与独立复算逐格比对）==');
const Z = '子丑寅卯辰巳午未申酉戌亥'.split('');
const TJN = ['贵','蛇','朱','合','勾','青','空','虎','常','玄','阴','后'];
const GR_D = {甲:'丑',戊:'丑',庚:'丑',乙:'子',己:'子',丙:'亥',丁:'亥',辛:'午',壬:'巳',癸:'巳'};
const GR_N = {甲:'未',戊:'未',庚:'未',乙:'申',己:'申',丙:'酉',丁:'酉',辛:'寅',壬:'卯',癸:'卯'};
function tp(yj, zs) { const off = (Z.indexOf(yj) - Z.indexOf(zs) + 12) % 12, m = {};
  Z.forEach(d => m[d] = Z[(Z.indexOf(d) + off) % 12]); return m; }
function tj(gan, shi, t) {
  const gr = '卯辰巳午未申'.includes(shi) ? GR_D[gan] : GR_N[gan];
  const dp = Z.find(d => t[d] === gr), shun = '亥子丑寅卯辰'.includes(dp), out = {};
  TJN.forEach((n, i) => { const z = Z[((Z.indexOf(gr) + (shun ? i : -i)) % 12 + 12) % 12];
    out[Z.find(k => t[k] === z)] = n; });
  return { out, gr, dp, shun };
}
const pan = body.querySelector('.pan');
ok(!!pan && pan.querySelectorAll('.gong').length === 12, '第1课的天地盘有十二宫');
const exp = tp('未', '巳'), expTJ = tj('丙', '巳', exp);
let panOK = true, tjOK = true;
pan.querySelectorAll('.gong').forEach(g => {
  const dp = g.querySelector('.dp').textContent;
  if (g.querySelector('.tp').textContent !== exp[dp]) panOK = false;
  if (g.querySelector('.tj').textContent !== expTJ.out[dp]) tjOK = false;
});
ok(panOK, '天盘十二格＝未将加巳时的复算结果');
ok(tjOK, '天将十二格＝丙日昼贵亥临地盘酉、逆行的复算结果');
ok(expTJ.gr === '亥' && expTJ.dp === '酉' && expTJ.shun === false, '复算本身：贵人亥临酉→逆行');

console.log('\n== 四课与三传 ==');
const ke = body.querySelectorAll('.sike .ke');
ok(ke.length === 4, '四课渲染成四格');
ok(ke[0].querySelector('.lb').textContent === '第四课' &&
   ke[3].querySelector('.lb').textContent === '第一课', '四课从右到左：最左是第四课');
ok(ke[3].querySelector('.dn').textContent === '丙', '第一课下神是日干丙');
ok(/寄巳/.test(ke[3].textContent), '第一课标出日干寄宫');
const cr = body.querySelectorAll('.sanchuan .cr');
ok(cr.length === 3, '三传渲染成三行');
ok(['初传','中传','末传'].every((t, i) => cr[i].querySelector('.lb').textContent === t), '初中末顺序');
ok(cr[0].querySelector('.z').textContent === '子', '初传是子');
ok(/w-shui/.test(cr[0].querySelector('.z').className), '干支按五行上色（子＝水）');

console.log('\n== 点式盘看读法 ==');
const g0 = pan.querySelectorAll('.gong')[0];
g0.onclick();
ok(/加/.test(pan.querySelector('.panmid').textContent), '点一格后中间说出「某加某」');
ok(g0.classList.contains('hi'), '点中的格子高亮');

console.log('\n== 起盘台 ==');
$$('.mi[data-go="lab"]')[0].onclick();
const lp = $('#labPan .pan');
ok(!!lp && lp.querySelectorAll('.gong').length === 12, '起盘台画出十二宫');
ok(/逆行/.test($('#labRead').textContent), '默认丙日巳时：说明为逆行');
$('#s-gan').value = '戊'; $('#s-zs').value = '寅'; $('#s-yj').value = '未';
$('#s-gan').onchange();
ok(/夜/.test($('#labRead').textContent) && /顺行/.test($('#labRead').textContent),
   '换成戊日寅时：夜贵未临地盘寅→顺行（＝第3课例二）');
const lp2 = {};
$('#labPan .pan').querySelectorAll('.gong').forEach(g => {
  lp2[g.querySelector('.dp').textContent] = g.querySelector('.tj').textContent;
});
ok(lp2['寅'] === '贵' && lp2['卯'] === '蛇' && lp2['辰'] === '朱', '例二天将逐格：寅贵、卯蛇、辰朱');

const sleep = ms => new Promise(r => setTimeout(r, ms));
// 搜索走真实交互：填框 → 派发 input → 等 debounce。直接调内部函数测不出绑定有没有接上。
async function typeSearch(kw) {
  const q = $('#q');
  q.value = kw;
  q.dispatchEvent(new window.Event('input'));
  await sleep(220);
}

(async () => {
  console.log('\n== 吸顶盘（六壬方盘不能照搬四柱那样吸顶，吸的是四课＋三传）==');
  // ⚠️ 回到访问过的课走的是 history.go 折叠（popstate 异步），必须等一拍再断言
  $$('#courseList .li[data-id]')[0].onclick();
  await sleep(30);
  const sp = $('#stickyPan');
  ok(!!sp, '有四课的课出现吸顶条');
  ok(sp.querySelectorAll('.spc').length === 4, '吸顶条列出四课');
  ok(sp.querySelectorAll('.spc')[3].classList.contains('day'), '第一课（日干那格）高亮');
  ok(sp.querySelectorAll('.sp-sc .z').length === 3, '吸顶条列出三传');
  ok(sp.querySelector('.spc .up').textContent === '子', '吸顶条第四课上神＝子（与盘一致）');
  {
    const css = fs.readFileSync(path.join(dir, 'style.css'), 'utf8');
    const m = css.match(/\.stickypan\{[^}]*\}/);
    ok(!!m && /position:\s*sticky/.test(m[0]), '吸顶靠纯 CSS sticky');
    ok(!/new\s+IntersectionObserver/.test(fs.readFileSync(path.join(dir, 'app.js'), 'utf8')),
     '没有真的调用 IntersectionObserver 做显隐（套壳 iframe 里时灵时不灵）');
  }
  sp.onclick();
  ok($('#tocMask').classList.contains('on'), '点吸顶条弹出全盘');
  ok($('#tocMask .pan') && $('#tocMask .pan').querySelectorAll('.gong').length === 12, '弹出的是完整十二宫方盘');
  $('#tocMask').classList.remove('on');
  
  console.log('\n== 课内目录 ==');
  ok($('#fabToc').classList.contains('on'), '课文屏显示目录按钮');
  $('#fabToc').onclick();
  const tocs = $$('#tocList .toci');
  const L01 = C.find(x => x.id === 'L01');
  ok(tocs.length === L01.heads.length && tocs.length > 4, `目录项数＝本课 h2 数（${tocs.length}）`);
  ok(tocs[0].textContent === L01.heads[0].t, '目录第一项与课文第一节同名');
  scrolls = [];
  tocs[2].onclick();
  ok(scrolls.includes('into'), '点目录项滚到那一节');
  ok(!$('#tocMask').classList.contains('on'), '跳转后目录自动收起');
  
  console.log('\n== 速查 ==');
  $$('.mi[data-go="ref"]')[0].onclick();
  const R = window.DATA_REF;
  ok(R.length > 100, `抽出了 ${R.length} 张表`);
  ok(R.every(r => r.name && r.html.includes('<table') || r.html.includes('pan')), '每张表都有表名与渲染结果');
  ok($$('#refList .refi').length === R.length, '默认列出全部');
  ok($$('#refList .refg').length > 20, '按课分组');
  $('#rq').value = '寄宫';
  $('#rq').dispatchEvent(new window.Event('input'));
  await sleep(220);
  const rs = $$('#refList .refi');
  ok(rs.length > 0 && rs.length < R.length, '搜索能过滤');
  rs[0].querySelector('.refh').onclick();
  ok(rs[0].classList.contains('open'), '点表名展开表格');
  ok(rs[0].querySelector('.refb table') || rs[0].querySelector('.refb .pan'), '展开后有真表格');
  {
    const jump = rs[0].querySelector('.refj');
    jump.onclick(new window.Event('click'));
    ok($('#s-lesson').classList.contains('active'), '可从速查跳到对应课');
  }
  
  console.log('\n== 起课引擎穷举（12月将 × 12占时 × 10日干 ＝ 1440 组）==');
  {
    let bad = 0, checked = 0;
    const GD = {甲:'丑',戊:'丑',庚:'丑',乙:'子',己:'子',丙:'亥',丁:'亥',辛:'午',壬:'巳',癸:'巳'};
    const GN = {甲:'未',戊:'未',庚:'未',乙:'申',己:'申',丙:'酉',丁:'酉',辛:'寅',壬:'卯',癸:'卯'};
    for (const yj of Z) for (const zs of Z) for (const gan of '甲乙丙丁戊己庚辛壬癸') {
      checked++;
      const t = tp(yj, zs);
      // 天盘：必须是十二支的整体平移，且月将确实落在占时位上
      const offs = new Set(Z.map(d => (Z.indexOf(t[d]) - Z.indexOf(d) + 12) % 12));
      if (offs.size !== 1 || t[zs] !== yj) { bad++; continue; }
      // 天将：贵人落点正确、十二位不重不漏、顺逆与地盘位相符
      const r = tj(gan, zs, t);
      const want = '卯辰巳午未申'.includes(zs) ? GD[gan] : GN[gan];
      const names = Object.values(r.out);
      if (r.gr !== want) { bad++; continue; }
      if (names.length !== 12 || new Set(names).size !== 12) { bad++; continue; }
      if (r.shun !== '亥子丑寅卯辰'.includes(r.dp)) { bad++; continue; }
      if (t[r.dp] !== r.gr) { bad++; continue; }
    }
    ok(checked === 1440, `跑遍 ${checked} 种组合`);
    ok(bad === 0, `全部合法（天盘整体平移＋月将落占时位；贵人落点、十二将不重不漏、顺逆相符）`);
  }

  console.log('\n== 搜索 ==');
  $('#btnSearch').onclick();
  await typeSearch('月将');
  ok($$('#sres .sr').length > 0, '单词搜到结果');
  // ⚠️ 课号会超过 9（现在有 25 课），这里必须 \d+ —— 写死一位数会在第 10 课上线时假红
  ok($$('#sres .sr[data-id]').length > 0 && $$('#sres .sr[data-id]').every(b => /第\d+课/.test(b.querySelector('b').textContent)), '课文结果标出课号');
  ok($$('#sres .refg').length >= 1, '结果按来源分组（课文/附篇/格局…）');
  ok($$('#sres .sr').some(b => /<em>/.test(b.querySelector('span').innerHTML)), '命中词在片段里高亮');

  await typeSearch('月将 中气');
  const multi = $$('#sres .sr[data-id]');
  ok(multi.length > 0, '空格分隔的多词搜索有结果');
  ok(multi.every(b => {
    const l = C.find(x => x.id === b.dataset.id);
    return l.text.includes('月将') && l.text.includes('中气');
  }), '多词结果里两个词都出现');

  await typeSearch('这个词肯定不存在xyz');
  ok(/没找到/.test($('#sres').textContent), '搜不到时给提示');

  console.log('\n== 搜索跳转要滚到那一处，不是回课文顶部 ==');
  await typeSearch('中气');
  scrolls = [];
  $$('#sres .sr')[0].onclick();
  ok(!!$('#lessonBody mark.hit'), '命中处套上了 mark.hit');
  ok(scrolls.includes('into'), '滚到了命中处');

  console.log('\n== 路由与返回栈 ==');
  ok($('#s-lesson').classList.contains('active'), '当前在课文屏');
  window.history.back();
  await sleep(30);
  ok($('#s-search').classList.contains('active'), '返回回到搜索屏（栈没被截断）');
  window.history.forward();
  await sleep(30);
  ok($('#s-lesson').classList.contains('active'), '前进还能回到课文（popstate 没截断 forward 侧）');

  console.log('\n== 阅读进度 ==');
  window.scrollY = 400;
  Object.defineProperty(window.document.documentElement, 'scrollHeight', { value: 2000, configurable: true });
  Object.defineProperty(window, 'innerHeight', { value: 800, configurable: true });
  window.dispatchEvent(new window.Event('scroll'));
  await sleep(300);
  const read = JSON.parse(window.localStorage.getItem('liuren_course_read') || '{}');
  ok(Object.keys(read).length > 0, '滚动后记下了阅读百分比');

  console.log('\n== 主题 ==');
  const t0 = doc.documentElement.getAttribute('data-theme');
  $('#btnTheme').onclick();
  const t1 = doc.documentElement.getAttribute('data-theme');
  const lab1 = $('#btnTheme').textContent;
  $('#btnTheme').onclick();
  const t2 = doc.documentElement.getAttribute('data-theme');
  ok(t0 === 'lav' && t1 === 'red' && t2 === 'lav', '两套主题来回切：薰衣草→朱雀红→薰衣草');
  ok(lab1 === '薰衣草' && $('#btnTheme').textContent === '朱雀红', '按钮写的是点了会切到哪套');

  console.log('\n== 按需加载与缓存 ==');
  const app = fs.readFileSync(path.join(dir, 'app.js'), 'utf8');
  ok(/data-course\.js\?v=/.test(app), '按需加载的课文包带 ?v= 版本号');
  const sw = fs.readFileSync(path.join(dir, 'sw.js'), 'utf8');
  // ⚠️ 2026-08-25 起是「网络优先但不干等」：超时先拿缓存顶上，网络回来照样写缓存。
  //    纯网络优先会让微信里首屏干等 CSS，页面先按无样式排版画出来（用户报过）。
  ok(/fetch\(req\)[\s\S]{0,400}catch/.test(sw), 'sw 网络优先');
  ok(/setTimeout[\s\S]{0,200}caches\.match/.test(sw), '⭐ 网络超时会回退缓存（不许干等）');
  ok(/caches\.open\(CACHE\)[\s\S]{0,120}put/.test(sw), '拿到新版照样写进缓存，下次即最新');
  ok(/ignoreSearch:\s*true/.test(sw), 'sw 离线回退忽略 ?query');
  ok(/addAll[\s\S]{0,80}catch/.test(sw), 'sw 的 addAll 有 catch');

  console.log('\n== 窄屏不溢出（360px 的安卓在微信里最常见）==');
  {
    const css = fs.readFileSync(path.join(dir, 'style.css'), 'utf8');
    // 内容块不许写裸的固定宽度：360px 屏减掉 main 的左右 padding 只剩 332px，
    // 早先 .sanchuan 写死 max-width:340px，页面就能左右拖动。
    const blocks = ['.sanchuan', '.pan', '.sike'];
    blocks.forEach(sel => {
      const m = css.match(new RegExp('\\' + sel + '\\{[^}]*\\}'));
      ok(!!m, sel + ' 有样式');
      if (!m) return;
      const w = m[0].match(/(?:max-)?width:\s*([^;}]+)/);
      ok(!w || /100%|min\(/.test(w[1]), sel + ' 的宽度带 100%／min() 保护（不是裸的固定 px）');
    });
    ok(/main\{overflow-x:clip\}/.test(css.replace(/\s/g, '')), '兜底 overflow-x:clip');
    // 宽屏下三样都要横向居中：方盘靠 .panwrap 的 flex、四课靠自身 justify-content，
    // ⚠️ 三传是**列向** flex，justify-content 管不到横向，只能 margin:auto——当初漏了，
    //    2026-08-25 用户截图报「三传没有居中」。这条断言锁住它。
    const sc = css.match(/\.sanchuan\{[^}]*\}/)[0];
    ok(/margin:\s*[^;}]*auto/.test(sc), '.sanchuan 用 margin:auto 横向居中');
    ok(/\.panwrap\{[^}]*justify-content:\s*center/.test(css), '.panwrap 居中方盘');
    ok(/\.sike\{[^}]*justify-content:\s*center/.test(css), '.sike 自身居中');
    ok(!/body\{[^}]*overflow-x:\s*hidden/.test(css.replace(/\s/g, '')),
       '没有给 body 上 overflow-x:hidden（那会让 sticky 失效）');
  }

  console.log('\n== 学习进度折叠 ==');
  {
    const card = $('#progCard'), tog = $('#progTog');
    ok(!!tog, '进度标题是可点的折叠头');
    ok(!card.classList.contains('open'), '默认收起（25 个课号 chip 太占屏）');
    // 进度条和"x/25 已读完"必须始终露在外面，折的只是 chip
    ok(/\d+ \/ \d+ 课已读完/.test($('#progPct').textContent), '百分比常显');
    ok(!!$('#progBar'), '进度条常显');
    ok($$('#progChips .chip').length === M.list.length, '收起时 chip 仍然渲染了（只是 CSS 隐藏）');
    tog.onclick();
    ok(card.classList.contains('open'), '点一下展开');
    ok(tog.getAttribute('aria-expanded') === 'true', 'aria-expanded 跟着变');
    tog.onclick();
    ok(!card.classList.contains('open'), '再点收起');
  }

  console.log('\n== 格局详解 ==');
  {
    ok(GE.length === M.counts.ge && GE.length >= 25, `格局 ${GE.length} 格，与 meta 计数一致`);
    ok(GE.every((g, i) => g.n === i + 1), `序号 1…${GE.length} 连续`);
    ok(GE.every(g => g.name && g.html), '每格都有格名与正文');
    ok(GE.every(g => g.line), '每格都有「一句话」摘要（列表要显示）');
    // ⚠️ 出处分两源：1–25 出自《通解》中册，26–66 是 2026-08-30 从 game 的
    //    K64 迁来的**讲义**六十四课经。**每格都必须标明出自哪一本**——
    //    以前只认「通解中」，把讲义那批全判成缺出处了。
    const bad = GE.filter(g => !/通解中|讲义/.test(g.html));
    ok(!bad.length, '每格都注明出处（通解中册或讲义）'
       + (bad.length ? '（缺：' + bad.map(x => x.name) + '）' : ''));
    // ⭐ 23 个格两书重名，讲义说法并列在原节里——别被后续编辑抹掉
    const both = GE.filter(g => /通解中/.test(g.html) && /讲义（六十四课经）/.test(g.html));
    ok(both.length === 23, `23 格并列了通解与讲义两说（实得 ${both.length}）`);
    ok($('#mGe').textContent === String(M.counts.ge), '首页格数读 counts，没写死');

    $$('.mi[data-go="gelist"]')[0].onclick();
    await sleep(10);
    const rows = $$('#geRows .gerow');
    ok(rows.length === GE.length, `列表列出 ${rows.length} 格`);
    rows[0].onclick();
    await sleep(30);
    ok(/游子/.test($('#ttl').textContent), '点开第一格，标题是格名');
    ok(/class="src"/.test($('#geBody').innerHTML), '详情页带出处标注');
    ok(!!$('#geNext'), '有「下一格」');
  }

  console.log('\n== 课例题库 ==');
  {
    ok(Q.items.length === M.counts.quiz && Q.items.length >= 126,
       `课例 ${Q.items.length} 例，与 meta 计数一致`);
    ok(Q.topics.reduce((a, t) => a + t.n, 0) === Q.items.length, '各占类题数之和＝总例数');
    // ⚠️ 例号是跨占类的全局连续号，界面直接显示——断了就会出现"两个例12"
    const ns = Q.items.map(x => x.n).sort((a, b) => a - b);
    ok(ns.every((v, i) => v === i + 1), `例号 1…${ns.length} 连续不跳号`);
    ok(Q.items.filter(x => x.star).length === M.counts.quizstar &&
       M.counts.quizstar >= 44, `入门精选 ${M.counts.quizstar} 例`);
    ok(Q.items.every(x => !x.html && BODY()['q' + x.n] && x.cat && x.title), '每例都有占类／标题，正文在 data/q/ 分块里');
    ok(fs.statSync(path.join(dir, 'data', 'data-quiz.js')).size < 900 * 1024, '课例列表瘦身到 900KB 以内');
    // ⚠️ 盘是复算的，每例都该有式盘；没有就是 md 的表格写歪了、mdlite 没认出来
    const nopan = Q.items.filter(x => !/class="pan"/.test(BODY()['q' + x.n]));
    ok(!nopan.length, `每例都渲染出式盘（缺 ${nopan.length} 例）`);
    ok(Q.items.every(x => /四课/.test(BODY()['q' + x.n]) && /三传/.test(BODY()['q' + x.n])), '四课与三传都在');
    // 标签：不能出现"每例都有"的废标签（那种筛了等于没筛）
    const tc = {};
    Q.items.forEach(x => (x.tags || []).forEach(t => tc[t] = (tc[t] || 0) + 1));
    const useless = Object.keys(tc).filter(t => tc[t] === Q.items.length);
    ok(!useless.length, '没有命中率 100% 的废标签' + (useless.length ? '：' + useless : ''));

    // 首页那格数字在初始渲染时就填好了，不必先跳回首页再断言
    ok($('#mQuiz').textContent === String(M.counts.quiz), '首页课例数读 counts，没写死');

    // 走真实交互（点首页入口），直接调内部函数测不出绑定接没接上
    $$('.mi[data-go="qlist"]')[0].onclick();
    await sleep(10);
    const grps = $$('#qRows .qgrp');
    ok(grps.length === Q.topics.length, `列表分成 ${grps.length} 组（＝占类数）`);
    ok(grps.every(g => !g.classList.contains('open')), '默认全部折叠');
    const rows = $$('#qRows .qrow');
    ok(rows.length === Q.items.length, '所有例都渲染出来了（折叠只是隐藏）');
    ok(rows.every(r => r.querySelector('.qn')), '每行都有例号');
    // 筛选：点"入门精选"，必须自动展开，否则筛出来的还藏在折叠里
    const starChip = $$('#qFilters .chip').filter(c => /入门精选/.test(c.textContent))[0];
    ok(!!starChip, '有「入门精选」筛选');
    starChip.click();
    ok($$('#qRows .qgrp').every(g => g.classList.contains('open')), '一筛就自动展开');
    ok($$('#qRows .qrow').length === Q.items.filter(x => x.star).length,
       '筛出来的正好是带 ⭐ 的那些');
    $$('#qFilters .chip').filter(c => /^全部/.test(c.textContent))[0].click();

    $$('#qRows .qrow')[0].onclick();
    await sleep(30);
    ok(/class="pan"/.test($('#quizBody').innerHTML), '详情页画出式盘');
    ok(/例 1|课例 1/.test($('#ttl').textContent), '标题带例号');
    ok(!!$('#quizBody .stickypan'), '课例也吸顶四课三传');
    ok(!!$('#qNext'), '有「下一例」');

  }

  console.log('\n== 首屏防闪（关键样式内联）==');
  {
    const rawHtml = fs.readFileSync(path.join(dir, 'index.html'), 'utf8');
    const head = rawHtml.slice(0, rawHtml.indexOf('</head>'));
    // ⚠️ 别把这段内联样式当冗余删掉：style.css 是外部文件，微信里网络一慢就迟迟不到，
    //    页面会先按浏览器默认排版画出来（所有 .screen 同时显示、内容占满整屏、中文回落宋体），
    //    用户 2026-08-25 截到的就是那个样子。
    ok(/<style>[\s\S]*?<\/style>/.test(head), 'head 里有内联的关键样式');
    const inline = /<style>([\s\S]*?)<\/style>/.exec(head)[1];
    ok(/\.screen\s*\{[^}]*display:\s*none/.test(inline),
       '⭐ 内联了 .screen{display:none}——否则所有屏会一起堆出来，这是最难看的一种');
    ok(/main\s*\{[^}]*max-width/.test(inline), '内联了 main 的 max-width（否则内容占满整屏）');
    ok(/body\s*\{[^}]*background/.test(inline), '内联了底色（否则先白后黑地闪）');
    // ⚠️ 别用 indexOf('style.css')：上面的注释里就有这个字面量，会把位置比错
    ok(head.indexOf('<style>') < head.search(/<link[^>]+stylesheet/),
       '内联样式在 <link> 之前——外部 CSS 一到就正常接管，不用 !important');
  }

  console.log('\n== 套壳适配 ==');
  ok(/wst-frame-guard/.test(app) && /window\.self\s*!==\s*window\.top/.test(app),
     'iframe 内加 wst-frame-guard');
  ok(/history\.pushState/.test(app) && /history\.go\(/.test(app), 'history 包装齐全');

  console.log('\n== 底栏（任何一屏都能回首页）==');
  {
    const css2 = fs.readFileSync(path.join(dir, 'style.css'), 'utf8');
    const tabs = $$('.tabbar button');
    ok(tabs.length === 4, `底栏 4 个 tab（${tabs.map(b => b.querySelector('span').textContent).join(' ')}）`);
    ok(tabs.every(b => ['home', 'course', 'qlist', 'ref'].includes(b.dataset.tab)),
       '四个 tab 指向的都是真实的根屏');
    // ⚠️ 这条是这次改动的起因：套壳在五术堂里时，本站返回键曾被 CSS 藏掉，
    //    而套壳那条「返回首页」是回导航首页、不是回本站 —— 别再把它藏回去。
    ok(!/wst-frame-guard\s+\.back\s*\{\s*display:\s*none/.test(css2),
       '套壳里没有把本站返回键藏掉');
    ok(/main\{[^}]*padding:[^}]*--tabh/.test(css2), '正文底部留出了底栏的高度');
    ok(/\.fab\{[^}]*bottom:calc\(var\(--tabh\)/.test(css2), '目录悬浮键抬到了底栏之上');
    // 金锁玉匙屏：真点两排字出诗、搜索、页签、从练习判分跳过来直接定位
    run('data/data-jinsuo.js');
    $$('.mi[data-go="jinsuo"]')[0].onclick();
    await sleep(10);
    ok($('#s-jinsuo').classList.contains('active') && $('#ttl').textContent === '金锁玉匙', '进金锁玉匙屏');
    ok($$('#jsPick .jz').length === 24, '两排各 12 个字');
    $$('#jsPick .jz[data-r="a"][data-z="丑"]')[0].onclick();
    $$('#jsPick .jz[data-r="b"][data-z="子"]')[0].onclick();
    ok(/鹊噪高枝/.test($('#jsHit').textContent) && /求谋皆遂/.test($('#jsHit').textContent), '点 丑·子 → 鹊噪高枝全诗');
    ok(/〔通解下 p1068/.test($('#jsHit').innerHTML), '命中卡带原文与页码');
    $$('#jsPick .jz[data-r="b"][data-z="巳"]')[0].onclick();
    $$('#jsPick .jz[data-r="a"][data-z="辰"]')[0].onclick();
    ok(/无发用无课/.test($('#jsHit').textContent), '辰·巳 → 原书明说无课无诗');
    $$('#jsPick .jz[data-r="a"][data-z="巳"]')[0].onclick();
    $$('#jsPick .jz[data-r="b"][data-z="亥"]')[0].onclick();
    ok(/闪电春雷/.test($('#jsHit').textContent) && /又见/.test($('#jsHit').textContent) && /白浪翻江/.test($('#jsHit').textContent),
       '巳·亥 → 主条与又见都显示');
    ok($$('#jsList .jse').length === 94, '列表默认列象类 94 首');
    $$('#jsTabs [data-tab="b"]')[0].onclick();
    ok($$('#jsList .jse').length === 41, '切到神将神煞 41 首');
    $$('#jsTabs [data-tab="a"]')[0].onclick();
    $('#jsq').value = '升迁';
    $('#jsq').oninput();
    await sleep(200);
    ok($$('#jsList .jse').length >= 1 && $$('#jsList .jse').length < 94 && /鹊噪高枝/.test($('#jsList').textContent), '搜「升迁」缩到含此词的条目');
    $('#jsq').value = '';
    $('#jsq').oninput();
    await sleep(200);
    // id＝「天地」两字直接定位到那一格（原由起课练习判分后跳来，2026-10-22 练习删除后仍保留这个入口能力）
    window.__go('jinsuo', '丑子');
    await sleep(10);
    {
      const g = J.grid['丑子'];
      const want = !g ? '原书未列' : g.n === -1 ? '无发用无课' : g.n === -2 ? '玄胎课象' : J.a[g.n - 1].name;
      ok($('#s-jinsuo').classList.contains('active') && new RegExp(want).test($('#jsHit').textContent), `id 直达「丑加子」那一格（${want}）`);
    }
    // 真点一次：底栏 → 课程列表 → 课文，再从课文一步回首页
    tabs[1].onclick();
    await sleep(30);
    ok($('#s-course').classList.contains('active'), '点底栏「课程」到课程列表');
    $$('#courseList .li[data-id]')[0].onclick();
    await sleep(30);
    ok($('#s-lesson').classList.contains('active'), '再进到课文里');
    tabs[0].onclick();
    await sleep(30);
    ok($('#s-home').classList.contains('active'), '⭐ 点底栏「首页」一步回到首页');
    ok($$('.tabbar button.on').length === 1 && $$('.tabbar button.on')[0].dataset.tab === 'home',
       '底栏高亮跟着当前屏走');
    tabs[3].onclick();
    await sleep(30);
    ok($('#s-ref').classList.contains('active'), '点底栏「速查」直达速查屏');
  }

  console.log(`\n${fail ? '✗' : '✓'} 通过 ${pass} 项，失败 ${fail} 项`);
  process.exit(fail ? 1 : 0);
})();
