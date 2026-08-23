# -*- coding: utf-8 -*-
"""逐条回查大六壬教材引文：「」里的原文是否真的出现在所标 PDF 页上。

⭐ 三册的书内页码与 PDF 页码换算各不相同（已用章节标题核对过）：
     上册 书内 = PDF − 15      中册 书内 = PDF + 364      下册 书内 = PDF + 732
   引文标注写 〔通解上 p21｜PDF p36〕，册名决定查哪一本、用哪套换算。
⚠️ 引文常被页脚劈成两页，所以这里把每册拼成一条连续全文再定位，
   否则跨页的句子会全被误报成"全书未找到"。
用法：python3 _tools/_verify_cite.py    —— 需复核为 0 才算引文可回查。
"""
import glob
import os
import re

HERE = os.path.dirname(os.path.abspath(__file__))
OB = os.path.join(os.path.dirname(HERE), 'content')
SRC_DIR = '/private/tmp/claude-501/-Users-xiaojin/404e36e5-811f-4d03-801d-25a063f69971/scratchpad/txt'
BOOKS = {'上': ('通解_上.txt', -15), '中': ('通解_中.txt', 364), '下': ('通解_下.txt', 732)}
CJK = re.compile(r'[一-鿿]')


def norm(s):
    return ''.join(c for c in s if CJK.match(c))


def load(fn):
    """→ (全文, {页: (起, 止)})"""
    pages, cur = {}, None
    for ln in open(os.path.join(SRC_DIR, fn), encoding='utf-8').read().split('\n'):
        m = re.match(r'^第 (\d+) 页$', ln.strip())
        if m:
            cur = int(m.group(1))
            pages.setdefault(cur, [])
            continue
        if cur is not None:
            pages.setdefault(cur, []).append(ln)
    full, span = '', {}
    for p in sorted(pages):
        t = norm(''.join(pages[p]))
        span[p] = (len(full), len(full) + len(t))
        full += t
    return full, span


BOOK = {}
for k, (fn, off) in BOOKS.items():
    if os.path.exists(os.path.join(SRC_DIR, fn)):
        BOOK[k] = load(fn) + (off,)
    else:
        print('  ⚠️ 缺少原文：%s（该册的引文将跳过）' % fn)

CITE = re.compile(r'〔通解([上中下]) p([\d\-]+)｜PDF p([\d\-]+)〕')


def find_pages(book, ns):
    full, span, _ = BOOK[book]
    out, i = [], full.find(ns)
    while i >= 0 and len(out) < 6:
        out.append(tuple(p for p in span if span[p][0] < i + len(ns) and i < span[p][1]))
        i = full.find(ns, i + 1)
    return out


bad, ok, total, untraced, skipped = [], 0, 0, [], 0
for f in sorted(glob.glob(os.path.join(OB, '*.md'))):
    lines = open(f, encoding='utf-8').read().split('\n')
    buf, start, blks = [], 0, []
    for i, ln in enumerate(lines):
        if ln.startswith('>'):
            if not buf:
                start = i + 1
            buf.append(ln)
        else:
            if buf:
                blks.append((start, ''.join(buf)))
                buf = []
    if buf:
        blks.append((start, ''.join(buf)))
    for start, text in blks:
        if '出处标注' in text:      # 教材说明行，不是引文
            continue
        segs, last = [], 0
        for m in CITE.finditer(text):
            segs.append((text[last:m.end()], m.group(1), m.group(2), m.group(3)))
            last = m.end()
        for seg, book, inner, pdfpg in segs:
            total += 1
            if book not in BOOK:
                skipped += 1
                continue
            # 顺手核对两个页码的换算关系对不对
            off = BOOK[book][2]
            a = [int(x) for x in inner.split('-')]
            b = [int(x) for x in pdfpg.split('-')]
            if a[0] != b[0] + off:
                bad.append((os.path.basename(f), start,
                            [('页码换算不符：书内 p%s 应为 PDF p%s' % (a[0], a[0] - off), [])], pdfpg))
                continue
            rng = list(range(b[0], b[-1] + 1))
            frags = re.findall(r'「([^」]{6,})」', seg)
            if not frags:
                untraced.append((os.path.basename(f), start, book, pdfpg))
                continue
            problems = []
            for q in frags:
                for s_ in re.split(r'…+', q):
                    ns = norm(s_)
                    if len(ns) < 8:
                        continue
                    hits = find_pages(book, ns)
                    if any(set(h) & set(rng) for h in hits):
                        continue
                    problems.append((s_[:26], [list(h) for h in hits]))
            if problems:
                bad.append((os.path.basename(f), start, problems, pdfpg))
            else:
                ok += 1

print('引文条目 %d：命中 %d，需复核 %d，转述未加引号 %d%s'
      % (total, ok, len(bad), len(untraced),
         ('，缺原文跳过 %d' % skipped) if skipped else ''))
for b in bad:
    print('-' * 58)
    print('%s 行%s  标注 PDF p%s' % (b[0], b[1], b[3]))
    for s_, where in b[2]:
        print('    x %s…  实际在 PDF页 %s' % (s_, where if where else '全书未找到'))
for u in untraced:
    print('  · 转述(无「」)，页码需人工确认：%s 行%s 通解%s PDF p%s' % u)
