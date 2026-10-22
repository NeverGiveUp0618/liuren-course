# -*- coding: utf-8 -*-
"""
一次性合并工具（2026-10-22，用户：「能合并的内容可以合并」）。把旧版 App 存档附篇并进对应的主篇：

  87 天时晴雨速查      → 96 象法速查 新增第六库「天时晴雨」
  91 天将支神新书补义  → 96 象法速查 第四、五库每条表格末尾加「新书补义」一行
  90 毕法主题版＋象义  → 97 毕法赋详解 每一法末尾加「旧版主题释义」「毕法象义」
  80＋81＋82          → 80-旧版·入门与原理.md（一篇三章）
  83＋84＋85＋86      → 83-旧版·速查合编.md（一篇四章）

合并完删掉被并走的原篇。⚠️ 非幂等：检测到 MARK 就拒绝重跑。
毕法这一步直接从旧版 App 源码取数据（liuren-game git 历史），不从 90 的 md 反解析。
用法：python3 _tools/_merge_old.py
⚠️ 已跑过（2026-10-22）。当时踩坑：删旧篇用 glob('80-*.md') 认文件，把刚写好的合编篇当成旧篇删了——
   旧篇路径必须在写新文件之前就取定。下面 combine 已按这个改。
"""
import glob, json, os, re, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
C = os.path.join(ROOT, 'content')
MARK = '<!-- merged-old-2026-10-22 -->'
GAME = os.path.join(os.path.dirname(ROOT), 'liuren-game')
H = subprocess.run(['git', '-C', GAME, 'show', '0b3b228~1:legacy.html'], capture_output=True, text=True, check=True).stdout

sys.path.insert(0, HERE)
from _mk_app import h2m, inl  # noqa: E402  （HTML→md 工具复用；它在 import 时会读旧 App，见下）


def f(pat):
    r = glob.glob(os.path.join(C, pat))
    return r[0] if r else None


def rd(p): return open(p, encoding='utf-8').read()
def wr(p, s): open(p, 'w', encoding='utf-8').write(s)


def js(name):
    m = re.search(r'\n(?:const|let|var)\s+' + name + r'\s*=', H)
    nx = re.search(r'\n(?:const|let|var|function|class)\s', H[m.end():])
    src = H[m.start() + 1:m.end() + nx.start()] + '\nprocess.stdout.write(JSON.stringify(' + name + '));'
    return json.loads(subprocess.run(['node', '-e', src], capture_output=True, text=True, check=True).stdout)


def body_of(md):
    """去掉存档篇自己的标题与开头说明块，只留正文。"""
    return md.split('\n---\n', 1)[1].strip() if '\n---\n' in md else md


def demote(md, n=1):
    return re.sub(r'^(#{2,5}) ', lambda m: '#' * (len(m.group(1)) + n) + ' ', md, flags=re.M)


xf_p, bf_p = f('96-*.md'), f('97-*.md')
xf, bf = rd(xf_p), rd(bf_p)
if MARK in xf or MARK in bf:
    sys.exit('✗ 已合并过（见 MARK），不重跑')

# ── 1. 天时 → 象法第六库 ──
tw = body_of(rd(f('87-*.md')))
items = []
for m in re.finditer(r'^## (.+?)\n([\s\S]*?)(?=^## |\Z)', tw, re.M):
    items.append('**%s**\n\n%s\n〔出处〕旧版 App · 天时晴雨速查' % (m.group(1).strip(), m.group(2).strip()))
xf = xf.rstrip() + '\n\n---\n\n## 六、天时晴雨\n\n> 共 **%d** 条。2026-10-22 自旧版 App「天时 · 晴雨速查」并入（原附篇 87）。课程 25 课没有天时一课。\n\n### 占天气\n\n%s\n' % (
    len(items), '\n\n'.join(items))

# ── 2. 新书补义 → 支神／天将表格末行 ──
tjb, zsb = js('TJ_BOOK'), js('ZS_BOOK')
hit = 0
def add_row(md, key, text):
    global hit
    # 条目形如「**子 · 神后**」「**贵人 · …**」，其后紧跟表格；在表格最后一行后插一行
    m = re.search(r'^\*\*' + re.escape(key) + r'(?: · [^*]+)?\*\*\n\n(\|[^\n]*\n)+', md, re.M)
    if not m:
        return md
    hit += 1
    row = '| **新书补义** | %s |\n' % text.replace('|', '｜')
    return md[:m.end()] + row + md[m.end():]
for k, v in zsb.items():
    xf = add_row(xf, k, v)
for k, v in tjb.items():
    xf = add_row(xf, k, v)
print('新书补义并入 %d / %d 条' % (hit, len(tjb) + len(zsb)))
xf = xf.rstrip() + '\n\n' + MARK + '\n'

# ── 3. 毕法主题版＋象义 → 97 每一法 ──
fa, det, xi = js('BF_FA'), js('BF_DETAIL'), js('BF_XIANG')
secs = list(re.finditer(r'^## 第 (\d+) 法　([^：\n]+)', bf, re.M))
name2i = {m.group(2).strip(): k for k, m in enumerate(secs)}
add = {k: [] for k in range(len(secs))}
for t in fa:
    k = name2i.get(t['f'])
    s = '> **旧版主题释义**（%s）：%s' % (t['c'], inl(t['m']))
    if det.get(t['f']):
        s += '\n>\n' + '\n'.join('> ' + ln if ln else '>' for ln in h2m(det[t['f']]).strip().split('\n'))
    add[k].append(s)
miss = []
for x in xi:
    nm = re.sub(r'^第\d+法·', '', x['src'])
    k = name2i.get(nm)
    if k is None:   # 名字略有出入（如「虽忧狐假虎威」少一字）：按前四字认
        c = [i for n, i in name2i.items() if n[:4] == nm[:4]]
        k = c[0] if len(c) == 1 else None
    s = '> **毕法象义**〔%s〕%s：%s　**用法**：%s' % (inl(x['group']), inl(x['name']), inl(x['key']), inl(x['use']))
    if k is None:
        miss.append(s + '（原标「%s」）' % x['src'])
    else:
        add[k].append(s)
out, last = [], 0
for k, m in enumerate(secs):
    end = secs[k + 1].start() if k + 1 < len(secs) else len(bf)
    seg = bf[m.start():end]
    tail = ''
    mm = re.search(r'\n---\s*\n*$', seg)
    if mm:
        seg, tail = seg[:mm.start()], seg[mm.start():]
    if add[k]:
        seg = seg.rstrip() + '\n\n### 旧版 App 的说法\n\n' + '\n\n'.join(add[k]) + '\n'
    out.append(bf[last:m.start()] + seg + tail)
    last = end
bf = ''.join(out) + bf[last:]
if miss:
    bf = bf.rstrip() + '\n\n---\n\n## 附　对不上法目的毕法象义\n\n' + '\n\n'.join(miss) + '\n'
print('毕法：主题版 %d 法，象义并入 %d 条，对不上 %d 条' % (len(fa), len(xi) - len(miss), len(miss)))
bf = bf.rstrip() + '\n\n' + MARK + '\n'
wr(xf_p, xf); wr(bf_p, bf)

# ── 4. 旧版入门三篇、速查四篇各合成一篇 ──
CN = '一二三四五六七八九十'
def combine(pats, out_name, title, what):
    parts = []
    olds = [f(p) for p in pats]          # ⚠️ 先取定旧篇路径，别等写完新篇再 glob
    for i, pth in enumerate(olds):
        md = rd(pth)
        t = re.match(r'#\s*(.+)', md).group(1).strip()
        parts.append('## %s、%s\n\n%s' % (CN[i], t, demote(body_of(md))))
    head = ('# %s\n\n> **这是什么**：%s\n> ⚠️ **迁自旧版「六壬神课」App（2026-10-22 旧版退役时整体收入，同日把几篇合成这一篇）**，'
            '原文照录、未逐条标页码；文中的「本站」「App」都指旧版。与课文重复的地方**以课文为准**；'
            '旧版三传取下神、涉害按孟仲季，现在全站按《通解》取上神、数克害。\n\n---\n\n') % (title, what)
    wr(os.path.join(C, out_name), head + '\n\n---\n\n'.join(parts) + '\n\n' + MARK + '\n')
    for pth in olds:
        os.remove(pth)

combine(['80-*.md', '81-*.md', '82-*.md'], '80-旧版·入门与原理.md', '旧版 · 入门与原理',
        '旧版 App 的三篇入门读物合编：白话入门（四层结构）、壬学心法（七步起盘实例）、算法逻辑梳理（程序视角）。')
combine(['83-*.md', '84-*.md', '85-*.md', '86-*.md'], '83-旧版·速查合编.md', '旧版 · 速查合编',
        '旧版 App 的四块速查合编：九宗门体系与发用流程、起课查表与干支关系、知识速查十章、取用神·六亲类神。')
for pat in ('87-*.md', '90-*.md', '91-*.md'):
    os.remove(f(pat))
print('✓ 合并完成')
