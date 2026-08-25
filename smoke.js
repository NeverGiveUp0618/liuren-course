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
run('engine.js');            // 起课引擎（练习要用）
run('data/data-ref.js');
run('data/data-quiz.js');            // 同上，预置绕开按需加载
run('data/data-ge.js');
run('app.js');
const $ = s => doc.querySelector(s);
const $$ = s => [].slice.call(doc.querySelectorAll(s));
const M = window.DATA_META, C = window.DATA_COURSE, Q = window.DATA_QUIZ, GE = window.DATA_GE;

console.log('\n== 数据与内容源一致 ==');
// ⚠️ 00 是总目录、99 是课例题库——都不是课，别把它们算进课数
const mdFiles = fs.readdirSync(path.join(dir, 'content'))
  .filter(f => /^\d\d-/.test(f) && !/^(00|98|99)-/.test(f));
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
  ok($$('#sres .sr').every(b => /第\d+课/.test(b.querySelector('b').textContent)), '结果标出课号');
  ok($$('#sres .sr').some(b => /<em>/.test(b.querySelector('span').innerHTML)), '命中词在片段里高亮');

  await typeSearch('月将 中气');
  const multi = $$('#sres .sr');
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
  $('#btnTheme').onclick();
  const t2 = doc.documentElement.getAttribute('data-theme');
  $('#btnTheme').onclick();
  const t3 = doc.documentElement.getAttribute('data-theme');
  ok(t0 === null && t1 === 'light' && t2 === 'dark' && t3 === null, '主题三态循环：随→浅→深→随');

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

  console.log('\n== 起课练习 ==');
  {
    ok(!!window.LiurenEngine, '引擎已加载');
    $$('.mi[data-go="drill"]')[0].onclick();
    await sleep(20);
    const body = $('#drillBody');
    ok(/日/.test($('.drillhd').textContent), '出题给出日干支·月将·占时');
    ok($$('#drillBody .dke td').length === 4, '四课摆出来了');
    ok($$('#drillBody .dsel select').length === 3, '三传三个下拉');
    ok($$('#drillBody [data-ke]').length >= 10, '课体选项覆盖十种课式');

    // 没填全不该判分
    $('#dOk').onclick();
    ok(/还没填全/.test($('#dFb').textContent), '三传没填全会拦下');

    // 照抄正解 → 必须全对
    const E2 = window.LiurenEngine;
    const hd = $('.drillhd span').textContent;
    const m = /^(..)日\s*(.)将\s*(.)时$/.exec(hd.replace(/\s+/g, ' ').trim());
    ok(!!m, '题面能解析出盘的三要素');
    const o = E2.qike(m[1], m[2], m[3]);
    [0, 1, 2].forEach(i => { $('#dc' + i).value = o.chuan[i]; });
    $$('#drillBody [data-ke]').filter(x => x.dataset.ke === o.ke)[0].onclick();
    $('#dOk').onclick();
    ok(/全对/.test($('#dFb').textContent), '照着正解答 → 判全对');
    ok(!!$('#dFb .dfb.good'), '全对时用 good 样式');

    // 故意答错 → 要指出错在哪一步，而不是只说"错"
    const wrong = E2.Z[(E2.Z.indexOf(o.chuan[0]) + 1) % 12];
    $('#dc0').value = wrong;
    $('#dOk').onclick();
    const fb = $('#dFb').textContent;
    ok(/再看看/.test(fb), '答错判错');
    ok(/初传错了/.test(fb), '⭐ 明确指出是初传错了（不是笼统说错）');
    ok(/第\d课/.test(fb), '纠错提示带课号，能回去复习');
    ok(new RegExp(o.ke).test(fb), '讲解里点明本盘的课式');

    // 计分要累积
    const st = JSON.parse(window.localStorage.getItem('liuren_course_drill') || '{}');
    ok(st.n >= 2 && st.ok >= 1, `练习记录累积（已练 ${st.n} 题、对 ${st.ok} 题）`);
    ok(st.byKe && Object.keys(st.byKe).length >= 1, '按课式分别记账（将来能挑薄弱课式）');
  }

  console.log('\n== 格局详解 ==');
  {
    ok(GE.length === M.counts.ge && GE.length >= 25, `格局 ${GE.length} 格，与 meta 计数一致`);
    ok(GE.every((g, i) => g.n === i + 1), '序号 1…25 连续');
    ok(GE.every(g => g.name && g.html), '每格都有格名与正文');
    ok(GE.every(g => g.line), '每格都有「一句话」摘要（列表要显示）');
    // ⚠️ 这批全部出自中册，出处必须是「通解中」——标成上册就是页码算错了
    const bad = GE.filter(g => !/通解中/.test(g.html));
    ok(!bad.length, '每格都带中册出处' + (bad.length ? '（缺：' + bad.map(x => x.name) + '）' : ''));
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
    ok(Q.items.every(x => x.html && x.cat && x.title), '每例都有 html／占类／标题');
    // ⚠️ 盘是复算的，每例都该有式盘；没有就是 md 的表格写歪了、mdlite 没认出来
    const nopan = Q.items.filter(x => !/class="pan"/.test(x.html));
    ok(!nopan.length, `每例都渲染出式盘（缺 ${nopan.length} 例）`);
    ok(Q.items.every(x => /四课/.test(x.html) && /三传/.test(x.html)), '四课与三传都在');
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

  console.log(`\n${fail ? '✗' : '✓'} 通过 ${pass} 项，失败 ${fail} 项`);
  process.exit(fail ? 1 : 0);
})();
