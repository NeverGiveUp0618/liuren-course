# -*- coding: utf-8 -*-
"""
一次性迁移工具：liuren-game 的 p5 屏「三式源流」段 → content/94-六壬源流.md

为什么单独成篇：课程 25 课**完全没有历史章**——它从第 1 课「六壬在算什么」直接进起课，
源流、考古实证、唐六典、历朝脉络、天文三才背景一概没讲。这 2,890 字是 game 独有的。

⚠️ 只取 p5 屏里「什么是三式」到「六壬里最根本的阴阳」之间那一段；
   p5 后面的起课与断法内容与课文重复，**不迁**。
⚠️ 跑完一次就够，md 从此是内容源。

用法：python3 _tools/_mk94.py [--dry]
"""
import html as _html
import importlib.util, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
OUT  = os.path.join(ROOT, 'content', '94-六壬源流.md')


def game_html():
    spec = importlib.util.spec_from_file_location('mk97', os.path.join(HERE, '_mk97.py'))
    mk97 = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mk97)
    g = open(mk97.GAME, encoding='utf-8').read()
    st = sorted((m.start(), m.group(1))
                for m in re.finditer(r'<div id="(p[a-zA-Z0-9_-]*)" class="screen', g))
    rng = {}
    for i, (p, sid) in enumerate(st):
        rng[sid] = (p, st[i + 1][0] if i + 1 < len(st) else g.find('<script>', p))
    h = g[rng['p5'][0]:rng['p5'][1]]
    a = h.find('什么是「三式」')
    # ⚠️ 终点不是「六壬里最根本的阴阳」——那之前还夹着一段「理论基础与核心架构」，
    #    内容是核心逻辑／起课流程／四大断则／五行属性的总纲摘要，
    #    与第 1–11 课全面重复，**不属于源流，不迁**。
    b = h.find('理论基础与核心架构')
    if a < 0 or b < 0:
        sys.exit('✗ 在 p5 里定位不到源流段的起止')
    seg = h[h.rfind('<div', 0, a):h.rfind('<', 0, b)]
    # 但那段里的「核心书目」是书志，属源流，单独捞回来
    tail = h[b:h.find('六壬里最根本的阴阳')]
    mm = re.search(r'核心书目[^<]*', tail)
    return seg, (mm.group(0) if mm else '')


def inline(s):
    """行内标签 → markdown。⚠️ <b> 常包住关键词，丢了就没了重点。"""
    s = re.sub(r'<b>(.*?)</b>', r'**\1**', s, flags=re.S)
    s = re.sub(r'<span[^>]*>(.*?)</span>', r'\1', s, flags=re.S)
    s = re.sub(r'<br\s*/?>', ' ', s)
    s = re.sub(r'<[^>]+>', '', s)
    return _html.unescape(s).strip()


def table_md(tb):
    rows = []
    for tr in re.findall(r'<tr>(.*?)</tr>', tb, re.S):
        cells = [inline(c) for c in re.findall(r'<t[hd][^>]*>(.*?)</t[hd]>', tr, re.S)]
        if cells:
            rows.append(cells)
    if not rows:
        return []
    n = max(len(r) for r in rows)
    rows = [r + [''] * (n - len(r)) for r in rows]
    out = ['| ' + ' | '.join(rows[0]) + ' |', '|' + '---|' * n]
    for r in rows[1:]:
        out.append('| ' + ' | '.join(r) + ' |')
    return out + ['']


def convert(seg):
    L = []
    # 顺序扫描：表格 / 折叠标题 / 折叠正文 / 普通段
    pat = re.compile(
        r'<table class="m5-tbl">(?P<tb>.*?)</table>'
        r'|<button class="m5-sub-tog"[^>]*>(?P<sub>.*?)</button>'
        r'|<div class="m5-text([^"]*)"[^>]*>(?P<tx>.*?)</div>', re.S)
    for m in pat.finditer(seg):
        if m.group('tb') is not None:
            L += table_md(m.group('tb'))
        elif m.group('sub') is not None:
            L += ['### ' + inline(m.group('sub')), '']
        else:
            cls, txt = m.group(3) or '', inline(m.group('tx'))
            if not txt:
                continue
            if 'red' in cls:
                # ⚠️ game 里的红色行常是「标题：一整句正文」写在一起。
                #    太长就在第一个「：」切开，前半当标题、后半当正文，
                #    否则目录里全是长句子。
                plain = txt.replace('**', '')
                if len(plain) > 26 and '：' in plain:
                    head, rest = txt.split('：', 1)
                    L += ['## ' + head.replace('**', ''), '', rest.strip(), '']
                else:
                    L += ['## ' + plain, '']
            elif 'gold' in cls:
                L += ['> 💡 ' + txt, '']
            else:
                L += [txt, '']
    return L


def main():
    dry = '--dry' in sys.argv
    seg, books = game_html()
    body = convert(seg)
    if books:
        body += ['## 主要古籍', '', books.strip(), '']
    L = ['# 大六壬 · 源流与背景', '']
    L += [
        '> **这是什么**：六壬**从哪来、什么时候成型、在三式里是什么位置**。'
        '25 课课文从第 1 课直接进起课，不讲这些；这一篇补上。',
        '> **要不要读**：**不读也不影响起课断课**。想知道自己学的这门东西'
        '有多老、凭什么可信，再来看。',
        '',
        '> ⚠️ **本篇最要紧的一条**：源流里**传说、文献猜测、文字线索、实物铁证**'
        '是四个不同层级的证据，别混着当史实用。下面的表就是按这四层排的。',
        '> ⚠️ 本篇迁自「六壬神课」App，**原文未逐条标页码**，只能标到出处册。',
        '',
        '---',
        '',
    ]
    L += body
    L += ['---', '', '〔出处〕讲义上册 · 六壬源流与三式背景（2026-08-30 自「六壬神课」App 迁入）', '']
    md = '\n'.join(L)
    md = re.sub(r'\n{3,}', '\n\n', md).rstrip() + '\n'
    print('  %d 行 / %.1f KB　标题 %d 个　表 %d 张'
          % (md.count('\n') + 1, len(md.encode()) / 1024,
             md.count('\n## '), md.count('|---')))
    if dry:
        print(md[:1200]); print('...(--dry，未写)')
        return
    open(OUT, 'w', encoding='utf-8').write(md)
    print('已写 ' + OUT)


if __name__ == '__main__':
    main()
