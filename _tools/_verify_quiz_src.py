# -*- coding: utf-8 -*-
"""课例题库的〔出处〕格名回查：126 例每一例标的格名，在原书里找不找得到。

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

miss, hit = [], 0
for n, src in cases:
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

print('题库课例 %d 例，〔出处〕格名能在原书找到的 %d 例' % (len(cases), hit))
if miss:
    print('\n找不到的 %d 例（不一定是错，也可能原书用了别的写法）：' % len(miss))
    for n, name, why in miss:
        print('  例%-4s %-22s %s' % (n, name, why))
else:
    print('✓ 每一例的格名都能在原书里找到')
sys.exit(0)
