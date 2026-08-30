# -*- coding: utf-8 -*-
"""
一次性迁移工具：liuren-game 的 XF_FA / XF_LEI / XF_BZG（象法速查库）→ content/96-象法速查.md

三个库共 265 条：
  XF_FA  106 条 取象法则   〔《图解六壬大全》第 1、2 部〕
  XF_LEI 113 条 分类类神   〔同上〕
  XF_BZG  46 条 百章歌断诀 〔通解 p110-111 · 李九万六壬百章歌〕

⚠️ **不并进「速查」屏**：那屏是按「第几课」分组、每条带「到第 N 课看讲解」按钮的，
   而象法条目不属于任何一课，硬塞进去要在 renderRef 里到处特判。自成一屏更干净。
⚠️ game 里同屏的 FX_CATS 是**练习入口**（`fn:startZM` 这类函数引用），不是内容，不迁。
⚠️ 跑完一次就够。**content/96-…md 从此是内容源**，别再从 game 重抽。

用法：python3 _tools/_mk96.py [--dry]
"""
import importlib.util, json, os, subprocess, sys, tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
OUT  = os.path.join(ROOT, 'content', '96-象法速查.md')

LIBS = [('取象法则', 'XF_FA',  '《图解六壬大全》第 1、2 部'),
        ('分类类神', 'XF_LEI', '《图解六壬大全》第 1、2 部'),
        ('百章歌断诀', 'XF_BZG', '《通解》p110-111 · 李九万六壬百章歌')]
# 结构与上面三库完全不同（每条是一张表，不是要点行），单独渲染
LIBS2 = [('支神类象·白话', 'LX_ZHI', '讲义·神将类象（白话整理）'),
         ('天将类象·白话', 'LX_TJ',  '讲义·神将类象（白话整理）')]
CN = '一二三四五六七八九十'


def load():
    spec = importlib.util.spec_from_file_location('mk97', os.path.join(HERE, '_mk97.py'))
    mk97 = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mk97)
    src = open(mk97.GAME, encoding='utf-8').read()

    def block(name):
        i = src.find('const %s=' % name)
        if i < 0:
            sys.exit('找不到 ' + name)
        j = i + len('const %s=' % name)
        op = src[j]
        cl = {'[': ']', '{': '}'}[op]
        d, instr = 0, None
        for k in range(j, len(src)):
            c = src[k]
            if instr:
                if c == '\\':
                    continue
                if c == instr:
                    instr = None
                continue
            if c in '"\'`':
                instr = c
                continue
            if c == op:
                d += 1
            elif c == cl:
                d -= 1
                if d == 0:
                    return src[j:k + 1]
        sys.exit(name + ' 括号不配对')

    allv = LIBS + LIBS2
    parts = ';'.join('const %s=%s' % (v, block(v)) for _, v, _ in allv)
    js = ('%s;process.stdout.write(JSON.stringify({%s}));'
          % (parts, ','.join('%s:%s' % (v, v) for _, v, _ in allv)))
    fd, p = tempfile.mkstemp(suffix='.js', dir=HERE)
    os.write(fd, js.encode('utf-8')); os.close(fd)
    try:
        o = subprocess.run(['node', p], capture_output=True, text=True)
        if o.returncode:
            sys.exit('node 失败：\n' + o.stderr[:1500])
        return json.loads(o.stdout)
    finally:
        os.remove(p)


def rows_table(pairs):
    r"""把 [[标签, 文本], …] 渲染成两列表。
    ⚠️ 表里不能出现行首的 **粗体**——build_xf 靠 `^\*\*名\*\*` 认条目起点。"""
    L = ['| | |', '|---|---|']
    for k, v in pairs:
        L.append('| **%s** | %s |' % (k, str(v).replace('|', '｜')))
    return L


def zhi_item(it, src):
    L = ['**%s · %s**' % (it['n'], it.get('jn', '')), '']
    pairs = [('五行方位', '%s · %s' % (it.get('wx', ''), it.get('fw', '')))]
    if it.get('xs'):
        pairs.append(('形象', it['xs']))
    pairs += [(k, v) for k, v in it.get('rows', [])]
    L += rows_table(pairs)
    L += ['', '〔出处〕%s' % src, '']
    return L


def tj_item(it, src):
    L = ['**%s · %s**' % (it['n'], it.get('gz', '')), '']
    pairs = []
    if it.get('lv'):
        pairs.append(('等第', it['lv']))
    if it.get('yong'):
        pairs.append(('主用', it['yong']))
    pairs += [(k, v) for k, v in it.get('rows', [])]
    L += rows_table(pairs)
    if it.get('st'):
        L += ['', '临十二支：', '', '| 临 | 名 | 断 |', '|---|---|---|']
        for z, nm, txt in it['st']:
            L.append('| %s | %s | %s |' % (z, nm, str(txt).replace('|', '｜')))
    L += ['', '〔出处〕%s' % src, '']
    return L


def main():
    dry = '--dry' in sys.argv
    data = load()
    total = sum(len(data[v]) for _, v, _ in LIBS)

    L = ['# 大六壬 · 象法速查', '']
    L += [
        '> **这是什么**：断课时**按事查规则**的一册速查。共 %d 条，分三库：'
        '**取象法则**（怎么取象、主次怎么排）、**分类类神**（占什么事看什么字）、'
        '**百章歌断诀**（古歌里的实用断法）。' % total,
        '> **和课文的关系**：第 8、9、12 课讲**类象与类神的道理**，'
        '第 13–17 课讲**断法框架**；本篇是它们的**查用面**——'
        '道理读过一遍之后，实际断课时翻这里。',
        '> **怎么用**：不必从头读。**按分组或关键词查**。',
        '',
        '> ⚠️ **只录规则，不配课盘**。这三库在原书里就是条文形式，'
        '没有随附的例盘；要看盘请去「课例」。',
        '> ⚠️ **百章歌只录原文，不编白话解**——古歌一句多义，'
        '硬译反而把可用的歧义抹掉了。',
        '',
        '---',
        '',
    ]

    stats = []
    for idx, (title, var, srcnote) in enumerate(LIBS):
        items = data[var]
        # 保持原库内的先后，只把同 group 的聚到一起（原库本就按 group 排，这里只是稳定归并）
        groups, order = {}, []
        for it in items:
            g = it.get('group') or '未分组'
            if g not in groups:
                groups[g] = []
                order.append(g)
            groups[g].append(it)
        L.append('## %s、%s' % (CN[idx], title))
        L.append('')
        L.append('> 共 **%d** 条，%d 组。出处：%s' % (len(items), len(order), srcnote))
        L.append('')
        for g in order:
            L.append('### %s' % g)
            L.append('')
            for it in groups[g]:
                L.append('**%s**' % it['name'])
                L.append('')
                if it.get('key'):
                    L.append('- **要点**　%s' % it['key'])
                if it.get('use'):
                    L.append('- **怎么用**　%s' % it['use'])
                L.append('')
                L.append('〔出处〕%s' % it.get('src', srcnote))
                L.append('')
        L.append('---')
        L.append('')
        stats.append((title, len(items), len(order)))

    # ── 两套白话类象（结构不同，单独渲染）──────────────────────
    # ⭐ 为什么收进来：08 课写着「完整清单请查『六壬神课』App 的象法速查」、
    #    09 课写着「（App 的象法速查已收录）」——课程当初就把清单外包给 game，
    #    game 冻结后那两条指路会悬空，所以清单必须落到本站。
    for j, (title, var, srcnote) in enumerate(LIBS2):
        items = data[var]
        L.append('## %s、%s' % (CN[len(LIBS) + j], title))
        L.append('')
        L.append('> 共 **%d** 条。%s' % (len(items), srcnote))
        L.append('> ⚠️ **这两库在 game 里没有逐条标源**，只能标到册。'
                 '课文里的类象一律带页码可回查，两者别混。')
        L.append('')
        L.append('### 十二%s' % ('支神' if var == 'LX_ZHI' else '天将'))
        L.append('')
        for it in items:
            L += (zhi_item if var == 'LX_ZHI' else tj_item)(it, srcnote)
        L.append('---')
        L.append('')
        stats.append((title, len(items), 1))
        total += len(items)

    md = '\n'.join(L).rstrip() + '\n'
    for t, n, g in stats:
        print('  %s　%d 条 / %d 组' % (t, n, g))
    print('  合计 %d 条　md %d 行 / %.1f KB'
          % (total, md.count('\n') + 1, len(md.encode()) / 1024))
    if dry:
        print('(--dry，未写)')
        return
    open(OUT, 'w', encoding='utf-8').write(md)
    print('已写 ' + OUT)


if __name__ == '__main__':
    main()
