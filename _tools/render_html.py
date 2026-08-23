# -*- coding: utf-8 -*-
import json,os
SP="/private/tmp/claude-501/-Users-xiaojin/404e36e5-811f-4d03-801d-25a063f69971/scratchpad"
docs=json.load(open(os.path.join(SP,"liuren-course.json")))
nav=''.join(f'<button class="navitem" data-t="{d["id"]}"><span class="navlab">{d["label"]}</span>'
            f'<span class="navttl">{d["short"]}</span></button>' for d in docs)
nav+='<button class="navitem" data-t="lab"><span class="navlab">工具</span><span class="navttl">起盘台 · 转动天盘</span></button>'
secs=''.join(f'<section class="doc" id="doc-{d["id"]}">{d["html"]}</section>' for d in docs)

CSS = r"""
:root{
  --ground:#EEEDF1; --paper:#FAF9FB; --line:#D6D4DE;
  --ink:#191C28; --ink-2:#4A4E60; --ink-3:#7A7E90;
  --blue:#2C4A70; --blue-soft:#E2E7EF; --gold:#9A6B14; --gold-soft:#F2E9D6;
  --red:#8C2F35; --red-soft:#F3E3E3; --green:#2F5B4A;
  --pan-ground:#F4F1E9; --pan-line:#C9C3B4;
  --f-disp:"Noto Serif SC",Songti SC,STSong,serif;
  --f-body:-apple-system,BlinkMacSystemFont,"PingFang SC","Hiragino Sans GB","Microsoft YaHei",sans-serif;
  --f-mono:"IBM Plex Mono",ui-monospace,Menlo,monospace;
}
:root{--surface:#F5F4F8;}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){
  --ground:#101219; --surface:#171A23; --paper:#1B1E29; --line:#2E3240;
  --ink:#E2E5EE; --ink-2:#A9AEBF; --ink-3:#787E92;
  --blue:#89AEDA; --blue-soft:#1E2836; --gold:#D6A548; --gold-soft:#2A2318;
  --red:#D98A8E; --red-soft:#2B1D1E; --green:#7FB79F;
  --pan-ground:#1D2029; --pan-line:#3A3F4E;
}}
:root[data-theme="dark"]{
  --ground:#101219; --surface:#171A23; --paper:#1B1E29; --line:#2E3240;
  --ink:#E2E5EE; --ink-2:#A9AEBF; --ink-3:#787E92;
  --blue:#89AEDA; --blue-soft:#1E2836; --gold:#D6A548; --gold-soft:#2A2318;
  --red:#D98A8E; --red-soft:#2B1D1E; --green:#7FB79F;
  --pan-ground:#1D2029; --pan-line:#3A3F4E;
}
*{box-sizing:border-box}
body{margin:0;background:var(--ground);color:var(--ink);font-family:var(--f-body);
  font-size:16px;line-height:1.85;-webkit-text-size-adjust:100%}
.wrap{max-width:1180px;margin:0 auto;padding:0 18px 80px;display:grid;grid-template-columns:250px 1fr;gap:38px}
header.top{grid-column:1/-1;padding:34px 0 22px;border-bottom:1px solid var(--line);margin-bottom:26px}
.brand{display:flex;align-items:baseline;gap:14px;flex-wrap:wrap}
h1.site{font-family:var(--f-disp);font-weight:600;font-size:29px;margin:0;letter-spacing:.06em}
.site em{font-style:normal;color:var(--blue)}
.sub{color:var(--ink-3);font-size:13px;font-family:var(--f-mono);letter-spacing:.04em}
.tagline{margin:10px 0 0;color:var(--ink-2);font-size:14.5px;max-width:60ch}
nav.toc{position:sticky;top:18px;align-self:start;display:flex;flex-direction:column;gap:2px;max-height:88vh;overflow:auto}
.navitem{all:unset;cursor:pointer;padding:9px 12px;border-radius:3px;display:flex;flex-direction:column;gap:1px;border-left:2px solid transparent}
.navitem:hover{background:var(--surface)}
.navitem:focus-visible{outline:2px solid var(--blue);outline-offset:1px}
.navitem.on{background:var(--surface);border-left-color:var(--gold)}
.navlab{font-family:var(--f-mono);font-size:10.5px;letter-spacing:.14em;text-transform:uppercase;color:var(--gold)}
.navttl{font-size:14px;color:var(--ink-2);line-height:1.45}
.navitem.on .navttl{color:var(--ink);font-weight:600}
main{min-width:0}
.doc{display:none;animation:fade .28s ease}
.doc.on{display:block}
@keyframes fade{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:none}}
@media (prefers-reduced-motion:reduce){.doc{animation:none}}
h1{font-family:var(--f-disp);font-weight:600;font-size:27px;line-height:1.45;margin:6px 0 20px;text-wrap:balance;
   padding-bottom:14px;border-bottom:2px solid var(--ink)}
h2{font-family:var(--f-disp);font-weight:600;font-size:20.5px;margin:44px 0 14px;text-wrap:balance;
   padding-left:12px;border-left:3px solid var(--blue)}
h3{font-size:16.5px;font-weight:700;margin:28px 0 10px;color:var(--ink)}
h4{font-size:15px;font-weight:700;margin:20px 0 8px;color:var(--ink-2)}
p{margin:12px 0;max-width:66ch}
ul,ol{max-width:66ch;padding-left:22px;margin:12px 0}
li{margin:6px 0}
hr{border:0;border-top:1px solid var(--line);margin:34px 0}
strong{font-weight:700}
code{font-family:var(--f-mono);font-size:.88em;background:var(--surface);padding:1px 5px;border-radius:3px}
.wiki{color:var(--blue);border-bottom:1px dotted var(--blue)}
blockquote{margin:16px 0;padding:13px 16px;border-radius:2px;font-size:15px;line-height:1.8;max-width:66ch;
  background:var(--surface);border-left:3px solid var(--line);color:var(--ink-2)}
blockquote.cite{background:var(--paper);border-left-color:var(--blue);font-family:var(--f-disp);color:var(--ink)}
blockquote.warn{background:var(--red-soft);border-left-color:var(--red)}
blockquote.star{background:var(--gold-soft);border-left-color:var(--gold)}
blockquote.tip{background:var(--blue-soft);border-left-color:var(--blue)}
.tw{overflow-x:auto;margin:18px 0;border:1px solid var(--line);border-radius:3px;background:var(--paper)}
table{border-collapse:collapse;width:100%;font-size:14.5px;font-variant-numeric:tabular-nums}
th{background:var(--surface);font-weight:700;text-align:left;padding:9px 12px;border-bottom:1px solid var(--line);white-space:nowrap;font-size:13.5px}
td{padding:9px 12px;border-bottom:1px solid var(--line);vertical-align:top}
td:first-child,th:first-child{white-space:nowrap}
tr:last-child td{border-bottom:0}
pre.board{font-family:var(--f-mono);background:var(--pan-ground);color:var(--ink);border:1px solid var(--pan-line);
  border-radius:3px;padding:14px 16px;overflow-x:auto;font-size:13.5px;line-height:1.9;margin:16px 0}
/* ── 式盘 ── */
.panwrap{margin:22px 0}
.pan{display:grid;grid-template-columns:repeat(4,1fr);grid-template-rows:repeat(4,1fr);
  width:min(360px,100%);aspect-ratio:1;background:var(--pan-ground);border:1.5px solid var(--pan-line);gap:0}
.gong{border:.5px solid var(--pan-line);display:flex;flex-direction:column;align-items:center;justify-content:center;
  gap:1px;padding:2px;position:relative;cursor:default}
.gong .tj{font-family:var(--f-body);font-size:11px;color:var(--gold);line-height:1.2}
.gong .tp{font-family:var(--f-disp);font-size:22px;font-weight:600;color:var(--ink);line-height:1.15}
.gong .dp{font-family:var(--f-mono);font-size:10px;color:var(--ink-3);line-height:1.2}
.gong.hi{background:var(--gold-soft)}
.panmid{grid-row:2/4;grid-column:2/4;border:.5px solid var(--pan-line);display:flex;align-items:center;justify-content:center;
  text-align:center;font-family:var(--f-mono);font-size:11px;color:var(--ink-3);padding:6px;line-height:1.6}
.panlegend{font-size:12px;color:var(--ink-3);margin:8px 0 0;display:flex;flex-wrap:wrap;gap:10px;align-items:center}
.panlegend .k{font-family:var(--f-mono);font-size:10.5px;padding:1px 6px;border-radius:2px}
.panlegend .k.tj{color:var(--gold);background:var(--gold-soft)}
.panlegend .k.tp{color:var(--ink);background:var(--surface)}
.panlegend .k.dp{color:var(--ink-3);background:var(--surface)}
/* ── 起盘台 ── */
.lab{display:none}.lab.on{display:block}
.ctrl{display:flex;flex-wrap:wrap;gap:16px;margin:20px 0 24px;padding:16px;background:var(--paper);border:1px solid var(--line);border-radius:3px}
.fld{display:flex;flex-direction:column;gap:5px}
.fld label{font-family:var(--f-mono);font-size:10.5px;letter-spacing:.12em;text-transform:uppercase;color:var(--gold)}
.fld select{font-family:var(--f-body);font-size:15px;padding:6px 10px;border:1px solid var(--line);border-radius:3px;
  background:var(--surface);color:var(--ink)}
.fld select:focus-visible{outline:2px solid var(--blue)}
.readout{font-size:14.5px;color:var(--ink-2);margin:14px 0;padding:12px 14px;background:var(--blue-soft);border-radius:3px;max-width:66ch}
.readout b{color:var(--ink)}
@media(max-width:900px){
  .wrap{grid-template-columns:1fr;gap:20px;padding:0 15px 60px}
  nav.toc{position:static;flex-direction:row;overflow-x:auto;gap:6px;padding-bottom:6px;
    border-bottom:1px solid var(--line);max-height:none}
  .navitem{border-left:0;border-bottom:2px solid transparent;min-width:132px;flex-shrink:0;padding:8px 10px}
  .navitem.on{border-left-color:transparent;border-bottom-color:var(--gold)}
  h1{font-size:22px}h2{font-size:18.5px}body{font-size:15.5px}
  .pan{width:100%;max-width:330px;margin:0 auto}
}
"""

JS = r"""
const Z="子丑寅卯辰巳午未申酉戌亥".split("");
const TJ=["贵","蛇","朱","合","勾","青","空","虎","常","玄","阴","后"];
const TJFULL={贵:"天乙贵人",蛇:"螣蛇",朱:"朱雀",合:"六合",勾:"勾陈",青:"青龙",空:"天空",虎:"白虎",常:"太常",玄:"玄武",阴:"太阴",后:"天后"};
const GRD={甲:"丑",戊:"丑",庚:"丑",乙:"子",己:"子",丙:"亥",丁:"亥",辛:"午",壬:"巳",癸:"巳"};
const GRN={甲:"未",戊:"未",庚:"未",乙:"申",己:"申",丙:"酉",丁:"酉",辛:"寅",壬:"卯",癸:"卯"};
const ZHOU="卯辰巳午未申";
const YJ={亥:"正月·雨水后",戌:"二月·春分后",酉:"三月·谷雨后",申:"四月·小满后",未:"五月·夏至后",午:"六月·大暑后",
  巳:"七月·处暑后",辰:"八月·秋分后",卯:"九月·霜降后",寅:"十月·小雪后",丑:"十一月·冬至后",子:"十二月·大寒后"};
const SHEN={子:"神后",丑:"大吉",寅:"功曹",卯:"太冲",辰:"天罡",巳:"太乙",午:"胜光",未:"小吉",申:"传送",酉:"从魁",戌:"河魁",亥:"登明"};
const CELLS=[["巳",1,1],["午",1,2],["未",1,3],["申",1,4],["酉",2,4],["戌",3,4],["亥",4,4],["子",4,3],["丑",4,2],["寅",4,1],["卯",3,1],["辰",2,1]];
function tianpan(yj,zs){const off=(Z.indexOf(yj)-Z.indexOf(zs)+12)%12;const m={};Z.forEach(d=>m[d]=Z[(Z.indexOf(d)+off)%12]);return m;}
function tianjiang(gan,shi,tp){
  const gr=ZHOU.includes(shi)?GRD[gan]:GRN[gan];
  const dp=Z.find(d=>tp[d]===gr);
  const shun="亥子丑寅卯辰".includes(dp);
  const out={};
  TJ.forEach((n,i)=>{const z=Z[((Z.indexOf(gr)+(shun?i:-i))%12+12)%12];out[Z.find(k=>tp[k]===z)]=n;});
  return {tj:out,gr,dp,shun};
}
function draw(el,tp,tj,mid){
  el.innerHTML=CELLS.map(([z,r,c])=>
    `<div class="gong" style="grid-row:${r};grid-column:${c}"><span class="tj">${tj[z]||""}</span>`+
    `<span class="tp">${tp[z]||""}</span><span class="dp">${z}</span></div>`).join("")+
    `<div class="panmid">${mid}</div>`;
}
document.addEventListener("DOMContentLoaded",()=>{
  const items=[...document.querySelectorAll(".navitem")];
  const docs=[...document.querySelectorAll(".doc")];
  const lab=document.getElementById("lab");
  function show(t){
    items.forEach(b=>b.classList.toggle("on",b.dataset.t===t));
    docs.forEach(d=>d.classList.toggle("on",d.id==="doc-"+t));
    lab.classList.toggle("on",t==="lab");
    window.scrollTo({top:0,behavior:"instant"});
    try{localStorage.setItem("lrc_tab",t)}catch(e){}
  }
  items.forEach(b=>b.addEventListener("click",()=>show(b.dataset.t)));
  let init="00"; try{init=localStorage.getItem("lrc_tab")||"00"}catch(e){}
  if(!items.some(b=>b.dataset.t===init)) init="00";
  show(init);
  // 起盘台
  const sy=document.getElementById("s-yj"),ss=document.getElementById("s-zs"),sg=document.getElementById("s-gan"),
        pan=document.getElementById("labpan"),ro=document.getElementById("labread");
  Z.forEach(z=>{sy.add(new Option(z+"将（"+SHEN[z]+"）· "+YJ[z],z));ss.add(new Option(z+"时",z));});
  "甲乙丙丁戊己庚辛壬癸".split("").forEach(g=>sg.add(new Option(g+"日",g)));
  sy.value="未";ss.value="巳";sg.value="丙";
  function upd(){
    const yj=sy.value,zs=ss.value,gan=sg.value;
    const tp=tianpan(yj,zs),r=tianjiang(gan,zs,tp);
    draw(pan,tp,r.tj,`${gan}日 ${zs}时<br>${yj}将`);
    const zhou=ZHOU.includes(zs);
    ro.innerHTML=`<b>${yj}将加${zs}时</b>：天盘整体${(Z.indexOf(yj)-Z.indexOf(zs)+12)%12?"旋转 "+((Z.indexOf(yj)-Z.indexOf(zs)+12)%12)+" 位":"与地盘重合（<b>伏吟</b>）"}。`+
      `<br>${gan}日 ${zs}时属<b>${zhou?"昼":"夜"}</b>（${zhou?"卯至申":"酉至寅"}）→ 用${zhou?"昼":"夜"}贵 <b>${r.gr}</b>；`+
      `天盘${r.gr}临地盘 <b>${r.dp}</b>（${"亥子丑寅卯辰".includes(r.dp)?"亥子丑寅卯辰":"巳午未申酉戌"}六位）→ 天将<b>${r.shun?"顺行":"逆行"}</b>。`;
  }
  [sy,ss,sg].forEach(s=>s.addEventListener("change",upd));
  upd();
  // 正文式盘：点一格看这一格在说什么
  document.addEventListener("click",e=>{
    const g=e.target.closest(".gong");if(!g)return;
    const p=g.closest(".pan");if(!p)return;
    p.querySelectorAll(".gong").forEach(x=>x.classList.remove("hi"));
    g.classList.add("hi");
    const mid=p.querySelector(".panmid");
    const tp=g.querySelector(".tp").textContent,dp=g.querySelector(".dp").textContent,tj=g.querySelector(".tj").textContent;
    if(mid&&tp){mid.dataset.orig=mid.dataset.orig||mid.innerHTML;
      mid.innerHTML=`<span style="color:var(--ink)">${tp} 加 ${dp}</span>`+(tj?`<br>乘 ${TJFULL[tj]||tj}`:"");}
  });
});
"""

HTML=f"""<title>大六壬课程</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap">
<style>{CSS}</style>
<div class="wrap">
  <header class="top">
    <div class="brand">
      <h1 class="site">大六壬<em>课程</em></h1>
      <span class="sub">依赖驱动 · 25 课 · 已成 3 课</span>
    </div>
    <p class="tagline">把《大六壬通解》按知识依赖顺序重排的一套自学教程：一课一课往下读，读完能自己起课、自己断课。所有引文都标了书内页码与 PDF 页码，可直接回查原书。</p>
  </header>
  <nav class="toc">{nav}</nav>
  <main>
    {secs}
    <section class="lab" id="lab">
      <h1>起盘台 · 转动天盘</h1>
      <p>第 2、3 课的两个动作——<b>月将加时</b>起天盘、<b>贵人落点定顺逆</b>排天将——在这里可以直接拨着看。改一个下拉框，整圈就跟着转。</p>
      <div class="ctrl">
        <div class="fld"><label for="s-yj">月将</label><select id="s-yj"></select></div>
        <div class="fld"><label for="s-zs">占时</label><select id="s-zs"></select></div>
        <div class="fld"><label for="s-gan">日干</label><select id="s-gan"></select></div>
      </div>
      <div class="panwrap"><div class="pan" id="labpan"></div>
        <p class="panlegend"><span class="k tj">天将</span><span class="k tp">天盘</span><span class="k dp">地盘</span>　点任意一格，中间会说出它的读法</p>
      </div>
      <div class="readout" id="labread"></div>
      <blockquote class="warn">⚠️ 这是教材配套的演示工具，只做天盘与天将两步，<b>不起四课三传</b>——那两步分别是第 4 课和第 5、6 课的内容。四课三传请用 App 的起课器。</blockquote>
    </section>
  </main>
</div>
<script>{JS}</script>
"""
open(os.path.join(SP,"liuren-course.html"),"w").write(HTML)
print("字节:",len(HTML))
