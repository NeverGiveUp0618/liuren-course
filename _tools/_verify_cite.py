# -*- coding: utf-8 -*-
"""逐条回查大六壬教材引文：「」里的原文是否真的出现在所标 PDF 页上。
用法: python3 verify_cite.py   —— 全绿才算引文可回查。"""
import re,glob,os
SRC="/private/tmp/claude-501/-Users-xiaojin/404e36e5-811f-4d03-801d-25a063f69971/scratchpad/txt/通解_上.txt"
OB="/Users/xiaojin/Documents/文稿同步文件夹/03_学习 (Learning)/Seafile/学习资料/自创项目/liuren-course/content"
raw=open(SRC).read().split("\n")
pages={};cur=None
for ln in raw:
    m=re.match(r"^第 (\d+) 页$",ln.strip())
    if m: cur=int(m.group(1)); pages.setdefault(cur,[]); continue
    if cur is not None: pages.setdefault(cur,[]).append(ln)
pages={k:"".join(v) for k,v in pages.items()}
CJK=re.compile(r"[一-鿿]")
def norm(s): return "".join(c for c in s if CJK.match(c))
npages={k:norm(v) for k,v in pages.items()}
allpg=sorted(npages)
CITE=re.compile(r"〔通解上 p([\d\-]+)｜PDF p([\d\-]+)〕")
bad=[];ok=0;total=0;untraced=[]
for f in sorted(glob.glob(os.path.join(OB,"*.md"))):
    lines=open(f).read().split("\n")
    buf=[];start=0;blks=[]
    for i,ln in enumerate(lines):
        if ln.startswith(">"):
            if not buf: start=i+1
            buf.append(ln)
        else:
            if buf: blks.append((start,"".join(buf))); buf=[]
    if buf: blks.append((start,"".join(buf)))
    for start,text in blks:
        if "出处标注" in text: continue          # 教材说明行，非引文
        segs=[];last=0
        for m in CITE.finditer(text):
            segs.append((text[last:m.end()],m.group(2)));last=m.end()
        for seg,pdfpg in segs:
            total+=1
            pgs=[int(x) for x in pdfpg.split("-")]
            pgrange=list(range(pgs[0],pgs[-1]+1))
            frags=re.findall(r"「([^」]{6,})」",seg)
            if not frags:
                untraced.append((os.path.basename(f),start,pdfpg));continue
            problems=[]
            for q in frags:
                for s in re.split(r"…+",q):
                    ns=norm(s)
                    if len(ns)<8: continue
                    if any(ns in npages.get(p,"") for p in pgrange): continue
                    where=[p for p in allpg if ns in npages[p]]
                    problems.append((s[:26],where[:4]))
            if problems: bad.append((os.path.basename(f),start,problems,pdfpg))
            else: ok+=1
print("引文条目 %d：命中 %d，需复核 %d，转述未加引号 %d"%(total,ok,len(bad),len(untraced)))
for b in bad:
    print("-"*58); print("%s 行%s  标注 PDF p%s"%(b[0],b[1],b[3]))
    for s,where in b[2]: print("    x %s…  实际在 PDF页 %s"%(s,where if where else "全书未找到"))
for u in untraced: print("  · 转述(无「」)，页码需人工确认：%s 行%s PDF p%s"%u)

