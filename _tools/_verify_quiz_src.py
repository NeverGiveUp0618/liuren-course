# -*- coding: utf-8 -*-
"""课例题库的〔出处〕回查，两种口径分别验：

  ① 出自《图解六壬大全》的（原书不标页码）——只验**格名**原书确有其名；
  ② 出自《通解》下册历代课例的（标了「〔通解下 pN｜PDF pM〕」）——按**页码**回查：
     那一页确实有这个「例X：」，并顺带验 PDF 换算（下册 ＋732）。

课文的引文由 _verify_cite.py 回查《通解》；题库的课例出自《图解六壬大全》，
标的是**格名**而不是整句引文，所以单独一个脚本——只验"这个格名原书确有其名"。
找不到的多半是：格名记岔了、把两个格拼成一个、或者其实出自别处。

原文 txt 见 _ref/（.gitignore 挡着，跑 _tools/_mkref.py 重建）。
"""
import os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
REF = os.path.join(ROOT, '_ref')
QUIZ = os.path.join(ROOT, 'content', '99-课例题库.md')
BOOKS = ['大全1_占法神煞.txt', '大全2_吉凶占断.txt', '大全3_毕法赋.txt',
         '通解_上.txt', '通解_中.txt', '通解_下.txt']

texts = {}
for b in BOOKS:
    p = os.path.join(REF, b)
    if os.path.exists(p):
        texts[b] = open(p, encoding='utf-8').read()
if not texts:
    sys.exit('✗ _ref/ 下没有原书 txt，先跑：python3 _tools/_mkref.py')

md = open(QUIZ, encoding='utf-8').read()
# ### 【例12】⭐ 标题 …  然后往下找 〔出处〕这一行
cases = re.findall(r'^### 【例(\d+)】.*?^〔出处〕(.+?)$', md, re.M | re.S)
if not cases:
    sys.exit('✗ 题库里一条〔出处〕都没解析到，格式可能变了')

# ── ② 通解下册：按页码回查 ─────────────────────────────
XIA = texts.get('通解_下.txt', '')
import bisect
_pg = [(m.start(), int(m.group(1))) for m in re.finditer(r'(?m)^第 (\d+) 页$', XIA)]
def page_text(n):
    """第 n 页那一段正文（到下一页标记为止）"""
    for i, (st, p) in enumerate(_pg):
        if p == n:
            end = _pg[i + 1][0] if i + 1 < len(_pg) else len(XIA)
            return XIA[st:end]
    return ''

miss, hit = [], 0
for n, src in cases:
    m = re.search(r'〔通解下 p(\d+)｜PDF p(\d+)〕', src)
    if m:
        bp, pdfp = int(m.group(1)), int(m.group(2))
        if pdfp - bp != 732:
            miss.append((n, '下册 p%d/PDF p%d' % (bp, pdfp), 'PDF 换算应为 ＋732'))
            continue
        if not XIA:
            miss.append((n, 'p%d' % bp, '_ref/通解_下.txt 缺，跳过'))
            continue
        # 出处里的「例十九（…）」——取「例X」去那一页找
        em = re.search(r'(例[一二三四五六七八九十百零〇\d]+)', src)
        tag = em.group(1) + '：' if em else ''
        body = page_text(bp)
        if not body:
            miss.append((n, 'p%d' % bp, '原书没有这一页'))
        elif tag and tag not in body:
            # 例标题常被 OCR 断到前一页末，容许往前一页找
            if tag in page_text(bp - 1):
                hit += 1
            else:
                miss.append((n, tag + ' p%d' % bp, '这一页找不到该例标题'))
        else:
            hit += 1
        continue
    # 「飘《图解六壬大全·毕法赋》·末助初财格」→ 取最后一段做格名
    name = src.strip().split('·')[-1].strip()
    if not name:
        miss.append((n, src.strip(), '出处里没有格名'))
        continue
    # ⚠️ 同一个格在题库里可能有两三例，当初加了区分号：「鬼护财格①」「闭口格(一)」
    #    「太阳照武格(二)」——原书当然搜不到这些号，先剥掉
    name = re.sub(r'[①-⑳]|[(（][一二三四五六七八九十\d]+[)）]\s*$', '', name).strip()
    if not name:
        miss.append((n, src.strip(), '剥掉序号后是空的'))
        continue
    # 「XX格」「XX课」去掉尾字再找一次，原书偶尔只写前半
    cands = [name] + ([name[:-1]] if name[-1] in '格课' else [])
    where = [b for b in texts if any(c in texts[b] for c in cands)]
    if where:
        hit += 1
    else:
        miss.append((n, name, '六本原书里都搜不到'))

print('题库课例 %d 例，〔出处〕回查命中 %d 例（格名／页码两种口径）' % (len(cases), hit))
if miss:
    print('\n找不到的 %d 例（不一定是错，也可能原书用了别的写法）：' % len(miss))
    for n, name, why in miss:
        print('  例%-4s %-22s %s' % (n, name, why))
else:
    print('✓ 每一例的格名都能在原书里找到')
sys.exit(0)
