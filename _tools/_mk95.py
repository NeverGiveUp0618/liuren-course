# -*- coding: utf-8 -*-
"""
一次性迁移工具：liuren-game 的 BY S_DATA（课式八要素）→ content/95-课式八要素.md

⚠️ 变量名 `BYS_DATA` 里的 BYS ＝ **八要素**，不是「八煞九宝」（那在第 11 课，是另一回事）。
   八要素＝太岁·月建·日辰·占时·月将·空亡·本命·行年。

为什么单独成篇：这八项在课程里是**散着的**（月将在第 2 课、日辰在第 4 课、
旬空与年命在第 7 课、神煞在第 20 课），但**「排盘前先把八项列出来」这个动作**
和每一项各自的「应用·讲义 N 条」，课程里没有集中的一处。

⚠️ 跑完一次就够，md 从此是内容源。
用法：python3 _tools/_mk95.py [--dry]
"""
import html as _html
import importlib.util, json, os, re, subprocess, sys, tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
OUT  = os.path.join(ROOT, 'content', '95-课式八要素.md')


def load():
    spec = importlib.util.spec_from_file_location('mk97', os.path.join(HERE, '_mk97.py'))
    mk97 = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mk97)
    g = open(mk97.GAME, encoding='utf-8').read()
    i = g.find('const BYS_DATA=')
    j = i + len('const BYS_DATA=')
    d, instr = 0, None
    for k in range(j, len(g)):
        c = g[k]
        if instr:
            if c == '\\':
                continue
            if c == instr:
                instr = None
            continue
        if c in '"\'`':
            instr = c
            continue
        if c == '[':
            d += 1
        elif c == ']':
            d -= 1
            if d == 0:
                lit = g[j:k + 1]
                break
    else:
        sys.exit('✗ BYS_DATA 括号不配对')
    fd, p = tempfile.mkstemp(suffix='.js', dir=HERE)
    os.write(fd, ('const B=%s;process.stdout.write(JSON.stringify(B));' % lit).encode()); os.close(fd)
    try:
        o = subprocess.run(['node', p], capture_output=True, text=True)
        if o.returncode:
            sys.exit('node 失败：\n' + o.stderr[:1200])
        return json.loads(o.stdout)
    finally:
        os.remove(p)


def inline(s):
    s = re.sub(r'<b>(.*?)</b>', r'**\1**', str(s), flags=re.S)
    s = re.sub(r'<br\s*/?>', ' ', s)
    s = re.sub(r'<[^>]+>', '', s)
    return _html.unescape(s).strip()


def main():
    dry = '--dry' in sys.argv
    B = load()
    L = ['# 大六壬 · 课式八要素', '']
    L += [
        '> **这是什么**：**太岁·月建·日辰·占时·月将·空亡·本命·行年**——'
        '排盘之前先把这八项列出来，断课时逐项对照。每项含定义与「应用」若干条。',
        '> **和课文的关系**：这八项在 25 课里是**散着讲**的'
        '（月将在第 2 课、日辰在第 4 课、旬空与年命在第 7 课、神煞在第 20 课）；'
        '本篇把它们**并成一张检查单**，并补上各自的应用条。',
        '> **怎么用**：起完盘照着八项过一遍，缺哪项补哪项；'
        '断课卡住时回来看哪一项被漏掉了。',
        '',
        '> ⚠️ 本篇迁自「六壬神课」App，**原文未逐条标页码**，只标到册。'
        '课文里的对应内容一律带页码可回查，两者别混。',
        '',
        '---',
        '',
    ]
    n_item = 0
    for it in B:
        L.append('## %s%s' % (it['n'], '（%s）' % it['sub'] if it.get('sub') else ''))
        L.append('')
        if it.get('one'):
            L += ['> **一句话**　%s' % inline(it['one']), '']
        for blk in it.get('blocks', []):
            if blk.get('h'):
                L += ['### ' + inline(blk['h']), '']
            if blk.get('p'):
                L += [inline(blk['p']), '']
            if blk.get('ul'):
                L += ['- %s' % inline(x) for x in blk['ul']]
                L.append('')
            if blk.get('tbl'):
                # tbl 是 {head:[...], rows:[[...]]}，不是裸二维数组
                tb = blk['tbl']
                head, rows = tb.get('head') or [], tb.get('rows') or []
                if head or rows:
                    w = max([len(head)] + [len(r) for r in rows]) if rows else len(head)
                    if head:
                        L.append('| ' + ' | '.join(inline(c) for c in head) + ' |')
                        L.append('|' + '---|' * w)
                    for r in rows:
                        cells = [inline(c) for c in r] + [''] * (w - len(r))
                        L.append('| ' + ' | '.join(cells) + ' |')
                    L.append('')
            if blk.get('note'):
                L += ['> ⚠️ %s' % inline(blk['note']), '']
        L += ['〔出处〕讲义 · 课式八要素', '', '---', '']
        n_item += 1
    md = re.sub(r'\n{3,}', '\n\n', '\n'.join(L)).rstrip() + '\n'
    print('  %d 项　%d 行 / %.1f KB' % (n_item, md.count('\n') + 1, len(md.encode()) / 1024))
    if n_item != 8:
        sys.exit('✗ 应为 8 项，实得 %d' % n_item)
    if dry:
        print(md[:900]); print('...(--dry，未写)')
        return
    open(OUT, 'w', encoding='utf-8').write(md)
    print('已写 ' + OUT)


if __name__ == '__main__':
    main()
