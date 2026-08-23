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
# ⚠️ 引文常跨页（原书一句话被页脚劈开）。按页分别 in 判断会把这类全判成"全书未找到"，
#    所以拼成一条连续全文，记下每页的区间，再看命中位置压在哪几页上。
allpg=sorted(pages)
full=""; span={}
for p_ in allpg:
    t=norm(pages[p_]); span[p_]=(len(full),len(full)+len(t)); full+=t
def pages_of(a,b):
    return [p_ for p_ in allpg if span[p_][0] < b and a < span[p_][1]]
def find_pages(ns):
    out=[];i=full.find(ns)
    while i>=0 and len(out)<6:
        out.append(tuple(pages_of(i,i+len(ns))))
        i=full.find(ns,i+1)
    return out
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
                for s_ in re.split(r"…+",q):
                    ns=norm(s_)
                    if len(ns)<8: continue
                    hits=find_pages(ns)
                    if any(set(h)&set(pgrange) for h in hits): continue
                    problems.append((s_[:26],[list(h) for h in hits]))
            if problems: bad.append((os.path.basename(f),start,problems,pdfpg))
            else: ok+=1
print("引文条目 %d：命中 %d，需复核 %d，转述未加引号 %d"%(total,ok,len(bad),len(untraced)))
for b in bad:
    print("-"*58); print("%s 行%s  标注 PDF p%s"%(b[0],b[1],b[3]))
    for s_,where in b[2]: print("    x %s…  实际在 PDF页 %s"%(s_,where if where else "全书未找到"))
for u in untraced: print("  · 转述(无「」)，页码需人工确认：%s 行%s PDF p%s"%u)

