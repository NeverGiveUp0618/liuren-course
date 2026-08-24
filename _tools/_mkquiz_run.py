# -*- coding: utf-8 -*-
import sys, json, re
sys.path.insert(0, "/private/tmp/claude-501/-Users-xiaojin/404e36e5-811f-4d03-801d-25a063f69971/scratchpad")
from mkquiz import *

ALL = json.load(open(S_ := "/private/tmp/claude-501/-Users-xiaojin/404e36e5-811f-4d03-801d-25a063f69971/scratchpad/lr_full.json"))
INTRO = set()   # 入门精选的 44 例 → 标 ⭐
import subprocess
INTRO = set(json.loads(subprocess.run(["node","-e","""
const fs=require("fs"),vm=require("vm");
const h=fs.readFileSync("/Users/xiaojin/Documents/文稿同步文件夹/03_学习 (Learning)/Seafile/学习资料/自创项目/liuren-game/index.html","utf8");
const i=h.indexOf("const DR_CASES=");const r=h.slice(i);const m=r.slice(1).search(/\\n(const|var|let|function|\\/\\*)/);
const ctx={};vm.runInNewContext(r.slice(0,m+1)+";o=DR_CASES.map(c=>c.id)",ctx);
console.log(JSON.stringify(ctx.o));"""],capture_output=True,text=True).stdout))

# ⚠️ 这两处**源头 liuren-game 已经改好了**（2026-08-24），这里只留一句说明，
#    让读者知道这张盘与某些流传版本不同。别再在这里改数据——那会造成两边分叉。
NOTE = {
 'bing2': '〔订正〕原数据月将作「辰」（辰加酉＝第六局），与格名自称的「第五局」、'
          '与「卯为日鬼加干」（己寄未，干上须为卯）、与三传卯亥未的递取（须 off=8）'
          '三处都对不上；月将取**巳**三处同时成立，是唯一解，已订正。',
 'lmai4': '〔订正〕原标「第二局」，但月将＝占时，实为**伏吟第一局**；'
          '三传丑戌未正是伏吟课的**用刑取传**（丑刑戌、戌刑未），与第一局吻合，已订正。',
}

CATS = ['求财','求官','占病','占婚','占产','占宅','买卖','失物','词讼','逃亡','谋事','趋谒','进退','因财致祸','天时','迁移']
CN = '一二三四五六七八九十'
def cnum(i): return CN[i] if i < 10 else '十' + (CN[i-10] if i > 10 else '')

out = []
out.append("""# 大六壬 · 课例题库

> **这是什么**：把每一个课例拆成「盘 → 分步推 → 落断」的自测题。**先自己看盘推一遍，再往下看拆解**。
> **和 25 课课文的关系**：课文讲规则，这里练规则怎么落到一张具体的盘上。每例都标了考点，点考点能筛出同类题连着做。
> **⭐ 的含义**：⭐ 是**入门精选**——每个占类挑 3-5 例最典型的，时间少就只做带 ⭐ 的。

> ⚠️ **出处与课文不是一个体系**：课文引的是《大六壬通解》，逐句可按页码回查；
> 本题库的课例主要出自**叶飘然《图解六壬大全》**（少量出自《通解》中册），
> **原书未标页码，无法逐句回查**，只能给到格名。两边的出处口径请分开看。

> ⚠️ **盘是复算的，不是照抄**：原书只给日干支／月将／占时／三传四样，
> 天盘、天将、四课、遁干、六亲、旬空**全部按课文第 2-7 课的方法重排**，所以盘必然自洽。
> 复算与原书文字冲突的地方，已在该例下注明：
> **〔订正〕**＝原数据错了、已改（2 例）；**〔存疑〕**＝盘是据原书零星描述反推的，
> 干上支上与格局说法都吻合，但原书另给的三传按此盘排不出来（5 例）——
> 这 5 例**学格局照读，别拿它当「三传怎么起」的范例**。

---
""")

stat = dict(n=0, star=0, bycat={})
for ci, cat in enumerate(CATS):
    items = [c for c in ALL if c['cat'] == cat]
    if not items: continue
    out.append("## %s、%s\n" % (cnum(ci), cat))
    for c in items:
        bd = dict(c['board'])
        b = build(bd)
        mt = bd.get('mt', '')
        notes = []
        if c['id'] in NOTE: notes.append(NOTE[c['id']])
        # board.warn ＝ 盘是据原书零星描述反推的，三传与本盘的递取对不上
        if bd.get('warn'): notes.append('〔存疑〕' + bd['warn'])
        tg = tags_of(c, b)
        star = '⭐ ' if c['id'] in INTRO else ''
        stat['n'] += 1; stat['star'] += (1 if star else 0)
        stat['bycat'][cat] = stat['bycat'].get(cat, 0) + 1
        out.append("### 【例%d】%s%s %s\n" % (stat['n'], star, plain(c['name']),
                   ' '.join('`%s`' % t[0] for t in tg)))
        out.append("**格**：%s\n" % mt)
        out.append("**占问**：%s\n" % plain(c['bg']))
        out.append(md_pan(b) + "\n")
        out.append("**四课**\n\n" + md_sike(b) + "\n")
        out.append("**三传**\n\n" + md_sanchuan(b) + "\n")
        out.append("**盘要点**：%s\n" % plain(c['bnote']))
        for nt in notes: out.append("> " + nt + "\n")
        out.append("**怎么断**\n")
        for st in c['steps']:
            out.append("**%s**\n" % plain(st['h']))
            out.append("- **要点**：%s\n" % plain(st['p']))
            out.append("- **本盘**：%s\n" % plain(st['a']))
        out.append("**断语**：%s%s\n" % (plain(c['duan']), '（吉）' if c.get('dgood') else ''))
        out.append("**回顾**：%s\n" % plain(c['recap']))
        out.append("〔出处〕%s\n" % c['src'])
        out.append("---\n")

open("/Users/xiaojin/Documents/文稿同步文件夹/03_学习 (Learning)/Seafile/学习资料/自创项目/liuren-course/content/99-课例题库.md","w").write("\n".join(out))
print("✓ 生成 %d 例（⭐入门精选 %d）" % (stat['n'], stat['star']))
print("  分类：" + "  ".join("%s%d" % (k, v) for k, v in stat['bycat'].items()))
