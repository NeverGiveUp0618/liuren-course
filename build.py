# -*- coding: utf-8 -*-
"""把 content/ 里的 markdown 编译成站点数据。

⭐ content/*.md 是唯一内容源，data/*.js 全是产物——改了会被下次构建覆盖。
   永远只在 content/ 里改内容，然后重跑本脚本。

⚠️ 自检是**下限不是等号**：课会一直加，少了报错退出（防解析器吞内容），
   多了只提示一句。曾在别的项目写成 `!=` ，加一课就构建失败。
"""
import json
import os
import re
import sys
import time

import mdlite

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, 'content')
BASIC_SRC = os.path.join(HERE, 'content-basic')
OUT = os.path.join(HERE, 'data')

BASE_LESSONS = 25      # 已成课数下限
TOTAL_PLANNED = 25    # 大纲里排定的总课数


def read(p):
    with open(p, encoding='utf-8') as f:
        return f.read()


def write_js(name, varname, obj):
    os.makedirs(OUT, exist_ok=True)
    p = os.path.join(OUT, name)
    with open(p, 'w', encoding='utf-8') as f:
        f.write('/* 本文件由 build.py 生成，勿手改。源：content/ */\n')
        f.write('window.%s=%s;' % (varname, json.dumps(obj, ensure_ascii=False)))
    return os.path.getsize(p)


def one_line(md):
    """抽「本课的一句话」，做目录里的副标题。"""
    m = re.search(r'\*\*本课的一句话\*\*：\*\*(.+?)\*\*', md)
    if m:
        return m.group(1).strip()
    m = re.search(r'\[!conclusion\][^\n]*\n>\s*\*\*(.+?)\*\*', md)
    if m:
        return m.group(1).strip()
    m = re.search(r'\*\*一句话\*\*：(.+)', md)
    return m.group(1).strip() if m else ''


def parse_plan(md):
    """从总目录里解析 25 课的计划表——**未成课的标题也只有这一个来源**，
    别在 app.js 里另抄一份，两处早晚对不上。"""
    plan = []
    part = ''
    for ln in md.split('\n'):
        m = re.match(r'^###\s+(第.+?部分[^（(]*)', ln.strip())
        if m:
            part = m.group(1).strip().replace('·', '·').strip()
            continue
        if not ln.startswith('|'):
            continue
        cells = [c.strip() for c in ln.strip().strip('|').split('|')]
        if len(cells) < 4 or not re.match(r'^\d+$', cells[0]):
            continue
        title = re.sub(r'\[\[([^\]]+)\]\]', r'\1', cells[1])
        title = title.replace('**', '').replace('⭐', '').strip()
        title = re.sub(r'^\d\d-', '', title)
        plan.append({'num': int(cells[0]), 'part': part, 'title': title,
                     'line': cells[2].strip(), 'done': '✅' in cells[3]})
    return plan


def build_lessons(collect_md=None):
    out = []
    for fn in sorted(os.listdir(SRC)):
        # ⭐ 附篇的判定是**规则不是清单**：00 是总目录，编号 ≥ 80 的都是附篇
        #   （2026-10-22 从 90 放宽到 80：App 退役，80–91 收「六壬神课」存档）
        #   （96 象法速查、97 毕法赋详解、98 格局详解、99 课例题库）。
        #   ⚠️ smoke.js 里有同一条规则，加附篇时两边都不用改——但改规则要一起改。
        if not fn.endswith('.md'):
            continue
        mnum = re.match(r'(\d\d)-', fn)
        if not mnum or mnum.group(1) == '00' or int(mnum.group(1)) >= 80:
            continue
        m = re.match(r'^(\d\d)-(.+)\.md$', fn)
        if not m:
            print('  跳过（文件名不合规）：', fn)
            continue
        md = read(os.path.join(SRC, fn))
        heads = []
        html = mdlite.md2html(md, collect_headings=heads)
        title = re.search(r'^# (.+)$', md, re.M).group(1).strip()
        # 「第2课 · 地盘与天盘：月将加时」→ 短标题
        short = title.split('·', 1)[-1].strip()
        if collect_md is not None:
            collect_md.append((int(m.group(1)), short, md))
        out.append({
            'id': 'L' + m.group(1),
            'num': int(m.group(1)),
            'title': title,
            'short': short,
            'line': one_line(md),
            'html': html,
            'heads': [{'l': l, 't': t, 'a': a} for l, t, a in heads if l == 2],
            'text': mdlite.strip_md(md),
        })
    return out


def build_basic_lessons():
    """公开课＋中级校对稿重组课。B01… 与《通解》L01… 分轨存放。"""
    out = []
    if not os.path.isdir(BASIC_SRC):
        return out
    for fn in sorted(os.listdir(BASIC_SRC)):
        m = re.match(r'^B(\d\d)-(.+)\.md$', fn)
        if not m:
            continue
        md = read(os.path.join(BASIC_SRC, fn))
        heads = []
        html = mdlite.md2html(md, collect_headings=heads)
        html = style_basic_lesson(html)
        title = re.search(r'^# (.+)$', md, re.M).group(1).strip()
        short = title.split('·', 1)[-1].strip()
        part = re.search(r'^> \*\*课程分部\*\*：(.+)$', md, re.M)
        out.append({
            'id': 'B' + m.group(1), 'num': int(m.group(1)), 'title': title,
            'short': short, 'line': one_line(md),
            'part': part.group(1).strip() if part else '初中级课程',
            'html': html,
            'heads': [{'l': l, 't': t, 'a': a} for l, t, a in heads if l == 2],
            'text': mdlite.strip_md(md),
            'sources': len(re.findall(r'^\*\*来源\*\*：', md, re.M)),
            'pan_pending': len(re.findall(r'盘面待补', md)),
        })
    ns = [x['num'] for x in out]
    if ns != list(range(1, len(out) + 1)):
        sys.exit('✗ 初中级课程编号不连续：%s' % ns)
    return out


def style_basic_lesson(html):
    """把初中级课程已经梳理好的语义标记，渲染成真正的学习层级。

    内容源仍是 Markdown；这里只做表现层分组，不删改老师的规则、步骤和案例。
    这些标题原先只是一行粗体，手机上会和正文混成一片。
    """
    groups = {
        'core': ('要', {
            '核心理解', '核心判断', '案例要解决的问题', '案例目的',
            '天将不能脱离占问定吉凶', '老师明确讲出的原则', '佐证法的用法'
        }),
        'steps': ('步', {
            '老师明确讲出的步骤与层次', '判断步骤', '判断顺序',
            '占断主线', '用三传看趋势', '同一课分别回答两个问题'
        }),
        'practice': ('验', {'实战提醒', '老师的实战经验'}),
    }
    for cls, (badge, labels) in groups.items():
        for label in labels:
            pat = (r'<p><strong>' + re.escape(label) + r'</strong></p>\s*'
                   r'(?P<body><(?P<tag>ul|ol|p)>.*?</(?P=tag)>)')
            repl = ('<section class="study-card study-%s">'
                    '<div class="study-h"><i>%s</i><b>%s</b></div>\g<body></section>'
                    % (cls, badge, label))
            html = re.sub(pat, repl, html, flags=re.S)

    # 课件盘和底下的讲解不包成一整块，避免影响盘面吸顶；
    # 只给案例起始处一个醒目标签。
    html = html.replace('<p><strong>课件原盘复排</strong></p>',
                        '<div class="study-label study-pan"><i>盘</i><b>课件原盘复排</b></div>')

    # 开头一句话是本课的结论卡；课程分部/学习方式降成辅助信息。
    html = re.sub(
        r'<p><strong>本课的一句话</strong>：<strong>(.*?)</strong></p>',
        r'<div class="basic-lead"><span>结论</span><b>\1</b></div>', html, count=1, flags=re.S)
    html = re.sub(r'<blockquote>(<p><strong>课程分部</strong>.*?)</blockquote>',
                  r'<div class="basic-meta">\1</div>', html, count=1, flags=re.S)
    return html


def build_mindmap():
    """总览导图：content/导图.json 是源（手写骨架），这里只校验课号并输出。"""
    fp = os.path.join(HERE, 'content', '导图.json')
    if not os.path.exists(fp):
        return {}
    mm = json.loads(read(fp))
    ok = set('L%02d' % n for n in range(1, 26))
    for b in mm['branches']:
        for n in b['nodes']:
            for k in ('go', 'go2'):
                if n.get(k) and n[k] not in ok:
                    sys.exit('✗ 导图里的课号不存在：%s（%s）' % (n[k], n['t']))
    return mm


def _callout(md, kind):
    """取 `> [!kind] 标题` 这个提示框：返回 (标题, 正文md)；没有则 (None, None)。"""
    m = re.search(r'^> \[!%s\][ \t]*(.*)\n((?:>.*\n?)*)' % kind, md, re.M)
    if not m:
        return None, None
    body = '\n'.join(re.sub(r'^>\s?', '', l) for l in m.group(2).split('\n')).strip()
    return m.group(1).strip(), body


def _first_table(md):
    """「先看总表…」那一行之后紧跟的表格；返回 (小标题, 表md)。"""
    m = re.search(r'^\*\*(先看总表[^*]*)\*\*\s*\n\s*\n((?:\|.*\n?)+)', md, re.M)
    return (m.group(1), m.group(2).strip()) if m else (None, None)


def build_review():
    """复习卡：每课一张——本课问题（先想）→ 点开看结论＋总表＋规则。
    全部从课文里的提示框和「先看总表」自动抽，不另写一份内容。"""
    items = []
    srcs = [('main', os.path.join(HERE, 'content'), r'^(\d\d)-.+\.md$'),
            ('basic', BASIC_SRC, r'^B(\d\d)-.+\.md$')]
    for kind, d, pat in srcs:
        if not os.path.isdir(d):
            continue
        for fn_ in sorted(os.listdir(d)):
            m = re.match(pat, fn_)
            if not m or (kind == 'main' and not (1 <= int(m.group(1)) <= 25)):
                continue
            md = read(os.path.join(d, fn_))
            _, q = _callout(md, 'question')
            _, concl = _callout(md, 'conclusion')
            if kind == 'basic' and not concl:
                mm = re.search(r'\*\*本课的一句话\*\*：\*\*(.+?)\*\*', md)
                concl = mm.group(1) if mm else None
            tt, tab = _first_table(md)
            rt, rule = _callout(md, 'rule')
            if not (q and concl):
                continue
            title_m = re.search(r'^# (.+)$', md, re.M)
            title = re.sub(r'^大六壬初中级课程\s*', '', title_m.group(1).strip()) if title_m else fn_
            items.append({
                'kind': kind, 'num': int(m.group(1)), 'title': title,
                'id': ('L%s' if kind == 'main' else 'B%s') % m.group(1),
                'q': mdlite.md2html(q), 'concl': mdlite.md2html(concl),
                'tt': (tt or '').replace('先看总表：', ''), 'table': mdlite.md2html(tab) if tab else '',
                'rt': rt or '', 'rule': mdlite.md2html(rule) if rule else '',
                'text': mdlite.strip_md('\n'.join(x for x in [q, concl, tab or '', rule or ''] if x)),
            })
    return items


def _refname(t):
    """表名要短到能在一行里扫过去：去掉「一、」这类序号，冒号后的解释也去掉。
    ⚠️ 只有冒号前还剩得下东西才切——「例：2007年…」切完只剩「例」，那还不如留全句。"""
    if not t:
        return ''
    t = re.sub(r'^[一二三四五六七八九十〇\d]+\s*[、.．]\s*', '', t.strip())
    head = re.split(r'[：:]', t)[0].strip()
    if len(head) >= 3:
        t = head
    t = re.sub(r'[（(][^）)]*[）)]', '', t).strip('　 ·—-')
    return t if 2 <= len(t) <= 20 else ''


def build_ref(lessons_md):
    """把各课正文里的表抽出来做「速查」。

    ⭐ 表本身还是长在课文里（内容源只有一处），这里只是**换一种检索方式**——
       学完之后真要用时，翻的就是这些表，不该每次都靠搜索在万字长文里捞。
    ⚠️ 表名不另写一份：取表格上方最近的小标题／加粗短语，改了课文这里跟着变。
    """
    out = []
    for num, title, md in lessons_md:
        lines = md.split('\n')
        h2 = h3 = ''
        i = 0
        while i < len(lines):
            ln = lines[i]
            m = re.match(r'^##\s+(.*)$', ln)
            if m and not ln.startswith('###'):
                h2 = re.sub(r'[⭐⚠️💡\s]+', '', m.group(1)).strip()
                h3 = ''
            m = re.match(r'^###\s+(.*)$', ln)
            if m:
                h3 = re.sub(r'[⭐⚠️💡\s]+', '', m.group(1)).strip()
            if ln.startswith('|'):
                start = i
                while i < len(lines) and lines[i].startswith('|'):
                    i += 1
                block = lines[start:i]
                if len(block) < 3:          # 至少 表头+分隔+一行
                    continue
                # 表名：紧邻上一行若是短说明（**xxx** 或以：结尾）就用它，否则用小标题
                lead = ''
                skip_ref = False
                for j in range(start - 1, max(-1, start - 3), -1):
                    t = lines[j].strip()
                    if not t:
                        continue
                    if '先看总表' in t:     # 课首总表是课内摘要，别混进「速查」
                        skip_ref = True
                    if len(t) <= 40 and not t.startswith(('|', '>', '-', '#')):
                        lead = re.sub(r'[*`（(].*', '', t).strip('：: ')
                    break
                if skip_ref:
                    continue
                # ⭐ 盘类的表按结构特征直接命名——同一节里三张盘若都取上方那句引导语，
                #    会出现三个同名条目（第 1 课就是「先看一眼完整的课」×3）。
                head = block[0]
                if '地盘' in head and head.count('|') >= 13:
                    name = '天地盘'
                elif '第四课' in head and '第一课' in head:
                    name = '四课'
                elif any(x.startswith('| **初传**') or x.startswith('| 初传') for x in block):
                    name = '三传'
                else:
                    name = _refname(lead) or _refname(h3) or _refname(h2) or ('第%d课的表' % num)
                out.append({
                    'num': num, 'lesson': title, 'sec': h3 or h2, 'name': name or h2,
                    'html': mdlite.md2html('\n'.join(block)),
                    'text': mdlite.strip_md('\n'.join(block)),
                })
                continue
            i += 1
    # 同一课里重名的表（例一/例二/自测答案各有一张盘）加个序号，列表里才分得清
    seen = {}
    for r in out:
        seen.setdefault((r['num'], r['name']), []).append(r)
    for (num, name), group in seen.items():
        if len(group) > 1:
            for k, r in enumerate(group, 1):
                r['name'] = '%s %s' % (name, '①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳'[k - 1] if k <= 20 else str(k))
    return out


def build_basic_ref():
    """把初中级课程按「一个二级标题＝一张速查卡」重组。

    初中级课文不是表格课，不能复用 build_ref() 只抽表格的办法。
    这里直接取课文里已经梳理好的「核心理解／判断步骤／实战提醒」，
    只去掉已在课文中单独展示的天地盘、四课、三传表和讲稿出处。
    这样速查与课文只有一份内容源，后续修课文会自动同步。
    """
    out = []
    if not os.path.isdir(BASIC_SRC):
        return out
    pan_labels = {'课件原盘复排', '天地盘', '四课', '三传'}
    for fn in sorted(os.listdir(BASIC_SRC)):
        m = re.match(r'^B(\d\d)-(.+)\.md$', fn)
        if not m:
            continue
        num = int(m.group(1))
        md = read(os.path.join(BASIC_SRC, fn))
        title_m = re.search(r'^# (.+)$', md, re.M)
        title = title_m.group(1).strip() if title_m else fn[:-3]
        part_m = re.search(r'^> \*\*课程分部\*\*：(.+)$', md, re.M)
        part = part_m.group(1).strip() if part_m else '初中级课程'
        heads = list(re.finditer(r'^##\s+(.+)$', md, re.M))
        for i, h in enumerate(heads):
            end = heads[i + 1].start() if i + 1 < len(heads) else len(md)
            name = re.sub(r'^[一二三四五六七八九十〇\d]+\s*[.、．]\s*', '', h.group(1)).strip()
            lines = md[h.end():end].strip().split('\n')
            kept = []
            skip_table = False
            for line in lines:
                s = line.strip()
                if s.startswith('|'):
                    skip_table = True
                    continue
                if skip_table and not s:
                    skip_table = False
                    continue
                skip_table = False
                label = re.match(r'^\*\*([^*]+)\*\*\s*$', s)
                if label and label.group(1).strip() in pan_labels:
                    continue
                if s.startswith('<small>') and s.endswith('</small>'):
                    continue
                kept.append(line)
            body_md = '\n'.join(kept).strip()
            text = mdlite.strip_md(body_md).strip()
            if len(text) < 12:
                continue
            out.append({
                'num': num, 'lesson': title, 'part': part, 'name': name,
                'html': mdlite.md2html(body_md), 'text': text,
            })
    return out


def build_ge():
    """98-格局详解.md → 一格一条，供「格局」屏按格名查。
    ⚠️ 这不是课，也不进速查表——速查表长在课文里，这里是中册格局汇总的详解。"""
    fp = os.path.join(SRC, '98-格局详解.md')
    if not os.path.exists(fp):
        return []
    md = read(fp)
    out = []
    # ## 12. 侵害课   —— 附录那节没有序号，不收
    for m in re.finditer(r'^## (\d+)\. (.+?)$', md, re.M):
        beg = m.start()
        nxt = re.search(r'^## ', md[m.end():], re.M)
        body = md[beg:m.end() + nxt.start()] if nxt else md[beg:]
        name = m.group(2).strip()
        line = ''
        one = re.search(r'\|\s*\*\*一句话\*\*\s*\|\s*(.+?)\s*\|', body)
        if one:
            line = re.sub(r'\*\*', '', one.group(1))
        out.append({'n': int(m.group(1)), 'name': name, 'line': line,
                    'html': mdlite.md2html(body), 'text': mdlite.strip_md(body)})
    ns = [x['n'] for x in out]
    if ns != list(range(1, len(ns) + 1)):
        sys.exit('✗ 格局序号不连续：%s' % ns)
    return out


_CN = {c: i for i, c in enumerate('〇一二三四五六七八九')}


def _cn2n(t):
    """一百以内的中文数：五十二、一百、十、二十"""
    if t == '一百':
        return 100
    if '十' in t:
        a, b = t.split('十')
        return (_CN[a] if a else 1) * 10 + (_CN[b] if b else 0)
    return _CN.get(t, 0)


def deep_link(html, ge):
    """课文里的「第N法」→ 毕法赋那一法；格局名（98 的条目名，带「课」字）→ 那一格。
    ⭐ 2026-10-23：课讲用法、97/98 当查表——两边不再各讲一遍，课里点一下就到详解。
    ⚠️ 只替换标签外的正文，不碰属性和已有链接；格名每课只链第一次出现，免得满屏是链接。"""
    names = []
    for g in ge:
        for part in re.split(r'\s*/\s*', g['name']):
            if part.endswith('课') and len(part) >= 3:
                names.append((part, g['n']))
    names.sort(key=lambda x: -len(x[0]))
    pat_ge = re.compile('|'.join(re.escape(n) for n, _ in names)) if names else None
    num = dict(names)
    done = set()
    out, depth = [], 0
    for seg in re.split(r'(<[^>]+>)', html):
        if seg.startswith('<'):
            if re.match(r'<a[\s>]', seg):
                depth += 1
            elif seg.startswith('</a'):
                depth -= 1
            out.append(seg)
            continue
        if depth or not seg:
            out.append(seg)
            continue
        def fa(m):
            n = _cn2n(m.group(1))
            if not 1 <= n <= 100:
                return m.group(0)
            return '<a class="wiki" data-wiki="97-#%d">%s</a>' % (n, m.group(0))
        seg = re.sub(r'第([一二三四五六七八九十百]{1,4})法', fa, seg)
        if pat_ge:
            # 先把已生成的毕法链接切开，只在纯文字段里找格名
            parts = re.split(r'(<a [^>]+>[^<]*</a>)', seg)
            for i, t in enumerate(parts):
                if t.startswith('<a '):
                    continue
                def gm(m):
                    if m.group(0) in done:
                        return m.group(0)
                    done.add(m.group(0))
                    return '<a class="wiki" data-wiki="98-#%d">%s</a>' % (num[m.group(0)], m.group(0))
                parts[i] = pat_ge.sub(gm, t)
            seg = ''.join(parts)
        out.append(seg)
    return ''.join(out)


def build_extra():
    """94 六壬源流 / 95 课式八要素 —— 两篇独立附篇，整篇一条，走「附篇」屏。

    ⚠️ 都不是课（编号 ≥ 90 已被 build_lessons 排除）。
       2026-08-30 自 liuren-game 迁入：94 出 p5 屏的源流段（工具 _mk94.py），
       95 出 BYS_DATA（工具 _mk95.py）。
    """
    out = []
    pairs = [('94-六壬源流.md', 'liuyuan'), ('95-课式八要素.md', 'bayao')]
    # 80–92：「六壬神课」App 退役时整体收入的存档（2026-10-22，工具 _tools/_mk_app.py）
    pairs += [(fn, 'x' + fn[:2]) for fn in sorted(os.listdir(SRC))
              if re.match(r'^(8\d|9[0-2])-.+\.md$', fn)]
    for fn, key in pairs:
        fp = os.path.join(SRC, fn)
        if not os.path.exists(fp):
            continue
        md = read(fp)
        m = re.match(r'#\s*(.+)', md)
        w = re.search(r'\*\*这是什么\*\*：(.+)', md)
        out.append({'id': key, 'num': int(fn[:2]), 'file': fn, 'title': (m.group(1) if m else fn).strip(),
                    'line': (w.group(1).strip() if w else ''),
                    'heads': re.findall(r'^##\s+(.+)$', md, re.M),
                    'html': mdlite.md2html(md), 'text': mdlite.strip_md(md)})
    return out


def build_xf():
    """96-象法速查.md → 三库 × 若干组 × 条目，供「象法」屏按组或关键词查。

    ⚠️ 这不是课，也不进「速查」屏——那屏按第几课分组、每条带「到第 N 课看讲解」，
       象法条目不属于任何一课。2026-08-30 从 liuren-game 的
       XF_FA／XF_LEI／XF_BZG 迁来（工具 _tools/_mk96.py，只留出处，不进构建）。
    """
    fp = os.path.join(SRC, '96-象法速查.md')
    if not os.path.exists(fp):
        return [], []
    md = read(fp)
    libs, items = [], []
    parts = re.split(r'^## [一二三四五六七八九十]+、(.+)$', md, flags=re.M)
    for i in range(1, len(parts), 2):
        lib = parts[i].strip()
        body = parts[i + 1]
        cnt = 0
        for gm in re.finditer(r'^### (.+?)$', body, re.M):
            nxt = re.search(r'^### ', body[gm.end():], re.M)
            gbody = body[gm.end():gm.end() + nxt.start()] if nxt else body[gm.end():]
            gbody = gbody.split('\n---')[0]
            grp = gm.group(1).strip()
            # 一条＝**名** → 正文 → 〔出处〕。
            # ⚠️ 正文既可能是要点行（前三库），也可能是表格（两套白话类象），
            #    所以不限定形状，只非贪婪吃到〔出处〕为止。
            # ⚠️ 靠「行首 **粗体** 单独成行」认条目起点——渲染时表内不许出现这种行。
            for em in re.finditer(r'^\*\*(.+?)\*\*\n\n([\s\S]*?)\n〔出处〕(.+?)$',
                                  gbody, re.M):
                items.append({'lib': lib, 'grp': grp, 'name': em.group(1).strip(),
                              'html': mdlite.md2html(em.group(2)),
                              'text': mdlite.strip_md(em.group(2)),
                              'src': em.group(3).strip()})
                cnt += 1
        libs.append({'name': lib, 'n': cnt})
    if len(items) != 295:
        sys.exit('✗ 象法条目数 %d，应为 295（106+113+46+12+12＋天时6，2026-10-22 并入）——解析器可能吞了条目'
                 % len(items))
    return libs, items


def build_bifa():
    """97-毕法赋详解.md → 一法一条（法内含若干格），供「毕法」屏按法号或格名查。

    ⚠️ 这不是课。源出《图解六壬大全·第三部》，2026-08-30 从 liuren-game 的
       BF_KU 迁来（迁移工具留在 _tools/_mk97.py，只为留出处，不进构建）。
    ⚠️ 盘一律按 engine.js 复算（《通解》口径），与原数据不符处 md 里已逐张注明。
    """
    fp = os.path.join(SRC, '97-毕法赋详解.md')
    if not os.path.exists(fp):
        return []
    md = read(fp)
    out = []
    for m in re.finditer(r'^## 第 (\d+) 法\u3000(.+?)：(.+?)$', md, re.M):
        beg = m.start()
        nxt = re.search(r'^## ', md[m.end():], re.M)
        body = md[beg:m.end() + nxt.start()] if nxt else md[beg:]
        ges = re.findall(r'^### (.+?)：', body, re.M)
        out.append({'n': int(m.group(1)), 'ju': m.group(2).strip(),
                    'pian': m.group(3).strip(), 'ge': ges,
                    'html': mdlite.md2html(body), 'text': mdlite.strip_md(body)})
    ns = [x['n'] for x in out]
    if ns != list(range(1, len(ns) + 1)):
        sys.exit('✗ 毕法赋法号不连续：%s…%s（共 %d）' % (ns[:3], ns[-3:], len(ns)))
    return out


def build_jinsuo():
    """93-金锁玉匙.md → 初传查表：象类 94 首（按「X加Y」查）＋神将神煞 41 首＋12×12 格子。

    ⚠️ 不是课，不进「速查」屏。源出《通解》下册第七章第一节（2026-09-14，工具 _tools/_mk93.py 只留出处）。
    ⭐ 格子（grid）在这里算，不在 md 里另画一张表：每格＝第一条把它写进「相加」的条目，
       其余认领它的条目（别条的「相加」或「又见」）进 alt——原书同一格常被两条认领，
       主次的取舍理由都在各条「备注」里，这里只照 md 写的分主次，不再裁决。
    """
    fp = os.path.join(SRC, '93-金锁玉匙.md')
    if not os.path.exists(fp):
        return None
    md = read(fp)
    Z = '子丑寅卯辰巳午未申酉戌亥'
    secA = md.index('\n## 一、')
    secX = md.index('\n### 原书交叉注')
    secB = md.index('\n## 二、')
    intro = md[:secA]
    partA, xref, partB = md[secA:secX], md[secX:secB], md[secB:]

    def fields(blk):
        f = {}
        for m in re.finditer(r'^- (相加|又见|卦|诗|备注|条件)：(.*)$', blk, re.M):
            f[m.group(1)] = m.group(2).strip()
        q = re.search(r'^> (.+)$', blk, re.M)
        f['quote'] = mdlite.md2html(q.group(0)) if q else ''
        return f

    def pairs(s):
        if not s or s.startswith('（'):
            return []
        return [x.strip().replace('加', '') for x in s.split('·') if '加' in x]

    A, xuantai = [], None
    for m in re.finditer(r'^### (.+?)$', partA, re.M):
        nxt = re.search(r'^### ', partA[m.end():], re.M)
        blk = partA[m.start():m.end() + nxt.start()] if nxt else partA[m.start():]
        f = fields(blk)
        h = m.group(1)
        if h.startswith('玄胎课象'):
            xuantai = {'name': '玄胎课象', 'gua': f.get('卦', ''), 'quote': f['quote']}
            continue
        mm = re.match(r'(\d+)\. (.+)$', h)
        A.append({'n': int(mm.group(1)), 'name': mm.group(2).strip(),
                  'p': pairs(f.get('相加', '')), 'also': pairs(f.get('又见', '')),
                  'gua': f.get('卦', ''), 'poem': f.get('诗', ''), 'note': f.get('备注', ''),
                  'quote': f['quote']})
    if [x['n'] for x in A] != list(range(1, 95)):
        sys.exit('✗ 金锁玉匙象类条目应为 1..94，实得 %d' % len(A))
    if not xuantai:
        sys.exit('✗ 金锁玉匙缺玄胎课象条')
    B = []
    for m in re.finditer(r'^### (\d+)\. (.+?)$', partB, re.M):
        nxt = re.search(r'^### ', partB[m.end():], re.M)
        blk = partB[m.start():m.end() + nxt.start()] if nxt else partB[m.start():]
        f = fields(blk)
        B.append({'n': int(m.group(1)), 'name': m.group(2).strip(), 'cond': f.get('条件', ''),
                  'poem': f.get('诗', ''), 'note': f.get('备注', ''), 'quote': f['quote']})
    if [x['n'] for x in B] != list(range(1, 42)):
        sys.exit('✗ 金锁玉匙神将神煞条目应为 1..41，实得 %d' % len(B))
    none = re.search(r'^- 无课无诗：(.+?)（', partA, re.M)
    none = pairs(none.group(1)) if none else []

    grid = {}
    for e in A:
        for c in e['p']:
            if c not in grid:
                grid[c] = {'n': e['n'], 'alt': []}
            else:
                grid[c]['alt'].append(e['n'])
    for e in A:
        for c in e['also']:
            grid.setdefault(c, {'n': 0, 'alt': []})['alt'].append(e['n'])
    for c in none:
        if c in grid:
            sys.exit('✗ 金锁玉匙：%s 既标无课又有条目认领' % c)
        grid[c] = {'n': -1, 'alt': []}
    grid['寅亥'] = {'n': -2, 'alt': []}
    cells = [a + b for a in Z for b in Z]
    bad = [c for c in grid if c not in cells]
    if bad:
        sys.exit('✗ 金锁玉匙：相加写错了字：%s' % bad)
    miss = [c for c in cells if c not in grid]
    # ⚠️ 原书没点名的格是事实（多为课式里排不出的），这里只报数不补——补了就是编造
    print('  金锁玉匙：象类 %d 首 / 神将神煞 %d 首；格子 144，原书未列 %d 格（%s）'
          % (len(A), len(B), len(miss), '、'.join(a + '加' + b for a, b in miss)))
    return {'intro': mdlite.md2html(intro), 'a': A, 'xuantai': xuantai,
            'xref': mdlite.md2html(xref), 'b': B, 'grid': grid, 'none': none, 'miss': miss,
            'text': mdlite.strip_md(md)}


def build_quiz():
    """99-课例题库.md → 按占类分组的课例。
    ⚠️ 题库的 md 是**生成物的再加工**（源在 liuren-game 的 DR_CASES/DR_CASELIB），
       但落地之后**以这个 md 为准**——盘是照课文第 2-7 课的方法复算的，game 那边没有。"""
    fp = os.path.join(SRC, '99-课例题库.md')
    if not os.path.exists(fp):
        return [], []
    md = read(fp)
    # 分类：## 一、求财
    cats, items = [], []
    parts = re.split(r'^## [一二三四五六七八九十]+、(.+)$', md, flags=re.M)
    for i in range(1, len(parts), 2):
        cat = parts[i].strip()
        body = parts[i + 1]
        blocks = re.split(r'^### (?=【例\d)', body, flags=re.M)
        cnt = 0
        for blk in blocks[1:]:
            head = blk.split('\n', 1)[0]
            m = re.match(r'【例(\d+)】\s*(⭐\s*)?(.+?)\s*(`.*)?$', head)
            if not m:
                sys.exit('✗ 题头解析不了：' + head[:60])
            n = int(m.group(1))
            tags = re.findall(r'`([^`]+)`', m.group(4) or '')
            title = m.group(3).strip()
            html = mdlite.md2html('### ' + blk)
            items.append({'n': n, 'cat': cat, 'title': title,
                          'star': 1 if m.group(2) else 0, 'tags': tags,
                          'html': html, 'text': mdlite.strip_md(blk)})
            cnt += 1
        cats.append({'name': cat, 'n': cnt})
    # ⚠️ 例号必须**从 1 连续排到底**：它是跨占类的全局序号，界面上直接显示
    ns = sorted(x['n'] for x in items)
    if ns != list(range(1, len(items) + 1)):
        sys.exit('✗ 例号不连续：共 %d 例，但编号是 %s…%s' % (len(ns), ns[:3], ns[-3:]))
    return cats, items


def build_mufu():
    """100-王牧夫初级案例库.md → 独立的初级案例列表。

    与 99 课例题库分开：99 按占类训练，这里按王牧夫原案顺序学习，
    并强制每例同时保留「古文原断」与「白话拆解」。
    """
    fp = os.path.join(SRC, '100-王牧夫初级案例库.md')
    if not os.path.exists(fp):
        return []
    md = read(fp)
    blocks = re.split(r'^### (?=【入门例\d+】)', md, flags=re.M)
    items = []
    gan = '甲乙丙丁戊己庚辛壬癸'
    zhi = '子丑寅卯辰巳午未申酉戌亥'
    for blk in blocks[1:]:
        head = blk.split('\n', 1)[0]
        m = re.match(r'【入门例(\d+)】\s*(.+?)\s*(`.*)?$', head)
        if not m:
            sys.exit('✗ 王牧夫题头解析不了：' + head[:60])
        n = int(m.group(1))
        tags = re.findall(r'`([^`]+)`', m.group(3) or '')
        title = m.group(2).strip()
        if '**古文原断**' not in blk or '**白话拆解**' not in blk:
            sys.exit('✗ 王牧夫入门例 %d 缺「古文原断」或「白话拆解」' % n)
        # 吸顶条第一段只照录原案实际存下来的年月日时，不补造四柱。
        # 月份常只有「七月／未月」而没有月干，时辰也常只有时支；
        # 因此保留原粒度，不根据历法擅自推算月柱、时柱。
        q = re.search(r'^\*\*占问\*\*：(.+)$', blk, flags=re.M)
        qtext = (q.group(1) if q else '').replace('**', '')
        g = re.search(r'^\*\*格\*\*：(.+)$', blk, flags=re.M)
        gtext = (g.group(1) if g else '').replace('**', '')
        source_time = qtext + ' ' + title + ' ' + gtext
        year = re.search(r'([%s][%s])年' % (gan, zhi), qtext)
        month = re.search(r'((?:闰)?(?:正|冬|腊|[一二三四五六七八九十%s])+月)' % zhi, qtext)
        day = re.search(r'([%s][%s])日' % (gan, zhi), source_time)
        hour = re.search(r'([%s])时' % zhi, source_time)
        cal = []
        if year: cal.append({'k': '年', 'v': year.group(1)})
        if month: cal.append({'k': '月', 'v': month.group(1)})
        if day: cal.append({'k': '日', 'v': day.group(1)})
        if hour: cal.append({'k': '时', 'v': hour.group(1)})
        items.append({'n': n, 'title': title, 'tags': tags, 'cal': cal,
                      'html': mdlite.md2html('### ' + blk),
                      'text': mdlite.strip_md(blk)})
    ns = sorted(x['n'] for x in items)
    if ns != list(range(1, len(items) + 1)):
        sys.exit('✗ 王牧夫入门例号不连续：%s' % ns)
    return items


_TJ_PAN_CHARS = set(
    '甲乙丙丁戊己庚辛壬癸子丑寅卯辰巳午未申酉戌亥'
    '贵貴蛇朱合六勾青空虎白常玄阴陰后後龙龍陈陳'
    '父母兄弟官鬼妻财財孙孫传傳初中末用日干支上下神遁旬'
    '六亲親天乙人将將空亡年月时時昼晝夜'
)


def strip_tongjie_raw_pan(blk):
    """复排盘已经显示时，删掉原文开头重复的 OCR 旧盘字符块。

    只处理“原书案例原文”引文中的连续盘式行：题头、年月日时、脚注、
    正议／断曰／案验以及书中现代讲解一律保留。返回 (正文, 是否删盘)。
    """
    lines = blk.splitlines()
    try:
        begin = lines.index('**原书案例原文**') + 1
    except ValueError:
        return blk, False
    end = next((i for i in range(begin, len(lines))
                if lines[i].startswith('**书中现代讲解') or lines[i].startswith('〔出处〕')), len(lines))
    quoted = [i for i in range(begin, end) if lines[i].startswith('>') and lines[i][1:].strip()]
    if not quoted:
        return blk, False

    def is_pan_line(text):
        text = text.strip()
        if not text:
            return False
        if '|' in text:                       # OCR 后仍保留成 Markdown 表格的课盘
            return True
        if re.search(r'[，。；！？：:“”《》]', text):
            return False                      # 完整语句、注文和断语不当盘面删
        chars = [c for c in text if '\u3400' <= c <= '\u9fff']
        if not chars:
            return bool(re.fullmatch(r'[-—\s◎○←→\d]+', text))
        allowed = sum(c in _TJ_PAN_CHARS for c in chars)
        return len(chars) >= 2 and allowed / len(chars) >= .80 and len(text) <= 140

    # 第一条非空引文是例题题头，永远保留；之后寻找第一个真正的盘式行。
    start = next((i for i in range(quoted[0] + 1, end)
                  if lines[i].startswith('>') and is_pan_line(lines[i][1:].strip())), None)
    if start is None:
        return blk, False
    stop = start
    while stop < end:
        if not lines[stop].startswith('>'):
            stop += 1
            continue
        text = lines[stop][1:].strip()
        if not text or is_pan_line(text):
            stop += 1
            continue
        break
    cleaned = lines[:start] + lines[stop:]
    return '\n'.join(cleaned), True


def build_tongjie():
    """101-大六壬通解案例库.md → 独立的通解案例库。

    内容由 _tools/import_tongjie_cases.py 从三册 OCR 批量生成；列表与正文
    分开，避免数百例一次全部下载。
    """
    fp = os.path.join(SRC, '101-大六壬通解案例库.md')
    if not os.path.exists(fp):
        return []
    # 通解 OCR 把大多数竖排课盘压成了一行普通文字。这里用已逐例审计的
    # 日干支／月将／占时／三传重建结构化盘面；参数不足或原文内部冲突时宁缺勿造。
    from _tools._mkquiz import build as build_pan, md_pan, md_sike, md_sanchuan
    audit_path = os.path.join(HERE, '_audit', 'tongjie-pan-audit.json')
    audit_rows = json.loads(read(audit_path)) if os.path.exists(audit_path) else []
    audit = {(x['volume'], x['index']): x for x in audit_rows}
    md = read(fp)
    blocks = re.split(r'^### (?=【通解[^】]+】)', md, flags=re.M)
    items = []
    for blk in blocks[1:]:
        head = blk.split('\n', 1)[0]
        m = re.match(r'【通解([上中下])册(\d+)】\s*(.+?)(?:\s+`([^`]+)`)?$', head)
        if not m:
            sys.exit('✗ 通解案例题头解析不了：' + head[:80])
        volume, n, title, category = m.group(1), int(m.group(2)), m.group(3).strip(), (m.group(4) or '未分类')
        if '**原书案例原文**' not in blk:
            sys.exit('✗ 通解%s册第 %d 例缺原书案例原文' % (volume, n))
        info = re.search(r'^\*\*原案信息\*\*：(.+)$', blk, re.M)
        cal = []
        if info and not info.group(1).startswith('原文未'):
            for k, v in re.findall(r'([年月日时])([^\s·]+)', info.group(1)):
                cal.append({'k': k, 'v': v})
        audit_row = audit.get((volume, n), {})
        pan_html = ''
        pan_ok = False
        no_pan_reason = ''
        status = audit_row.get('status')
        if status == 'excluded_non_liuren':
            no_pan_reason = '本例是六爻纳甲卦，不是六壬四课三传，因此不生成六壬课盘。'
        elif status == 'manual_source_unresolved':
            no_pan_reason = '原书题头与四课日干互相冲突，无法确定唯一参数，暂不伪造课盘。'
        elif not (audit_row.get('rgz') and audit_row.get('yj') and audit_row.get('zs') and audit_row.get('computed_chuan')):
            no_pan_reason = '原书未保留足够的日干支、月将或占时，无法可靠复排，暂不补造课盘。'
        else:
            # 人工已从原书版面读出的三传优先；其余用统一引擎复排值。
            source_chuan = audit_row.get('manual_scan_chuan') or audit_row.get('computed_chuan')
            if source_chuan and len(source_chuan) == 3:
                board = build_pan({'r': audit_row['rgz'], 'yj': audit_row['yj'], 'zs': audit_row['zs'],
                                   'sc': list(source_chuan)})
                notes = []
                if status == 'mismatch_manual_scan':
                    notes.append('> ⚠️ **原书盘面**：三传按原书照录；它与本站统一发用口径的复排结果不同，不擅自改原文。')
                elif status == 'reconstructed_no_source_chuan':
                    notes.append('> ℹ️ **参数复排盘**：原书三传未能从 OCR 版面可靠读出，以题头日干支、月将、占时按本站口径复排。')
                elif audit_row.get('yj_basis') == 'month_inferred':
                    notes.append('> ℹ️ **月将推定盘**：题头只记月份，月将按该月通常值推定，交节附近应以原始日期再核。')
                pan_md = '\n\n'.join([
                    '#### 课盘',
                    *notes,
                    '**天地盘**', md_pan(board),
                    '**四课**', md_sike(board),
                    '**三传**', md_sanchuan(board),
                ])
                pan_html = mdlite.md2html(pan_md)
                pan_ok = True
        if not pan_ok:
            pan_html = '<blockquote class="warn"><p><strong>课盘说明</strong>：%s</p></blockquote>' % no_pan_reason
        display_blk, raw_pan_removed = strip_tongjie_raw_pan(blk) if pan_ok else (blk, False)
        fulltext = mdlite.strip_md(display_blk)
        case_html = mdlite.md2html('### ' + display_blk)
        case_html = case_html.replace('</h3>', '</h3>' + pan_html, 1)
        items.append({'id': {'上': 'u', '中': 'm', '下': 'l'}[volume] + ('%03d' % n),
                      'n': n, 'volume': volume, 'title': title, 'category': category,
                      'tags': [volume + '册', category], 'cal': cal,
                      'html': case_html, 'pan': pan_ok, 'raw_pan_removed': raw_pan_removed,
                      'modern': '**书中现代讲解（全文照录）**' in blk,
                      # 列表包只留轻量检索文本；古文全文单独按需加载。
                      'text': '%s %s册 %s %s' % (title, volume, category, (info.group(1) if info else '')),
                      'search_text': fulltext})
    keys = [(x['volume'], x['n']) for x in items]
    if len(keys) != len(set(keys)):
        sys.exit('✗ 通解案例存在重复册别/例号')
    by_volume = {}
    for item in items:
        by_volume.setdefault(item['volume'], []).append(item['n'])
    expected = {'上': 75, '中': 197, '下': 570}
    for volume, nums in by_volume.items():
        if nums != list(range(1, expected[volume] + 1)):
            sys.exit('✗ 通解%s册例号不连续：共 %d 例' % (volume, len(nums)))
    return items


def write_bodies(kind, items, key, chunk_of):
    """⭐ 2026-10-23 大文件拆分：正文 html 从列表里拿出来，按块写进 data/<kind>/<块>.js，
    点开哪条才加载哪块。列表里留标题、标签和 text（全站搜索要用）。
    每条记下块号 c；页面里按 BODY[kind + 编号] 取正文。"""
    d = os.path.join(OUT, kind)
    if os.path.isdir(d):
        for f in os.listdir(d):
            os.remove(os.path.join(d, f))
    os.makedirs(d, exist_ok=True)
    chunks = {}
    for it in items:
        c = chunk_of(it)
        it['c'] = c
        chunks.setdefault(c, {})[kind + str(it[key])] = it.pop('html')
    total = 0
    for c, body in chunks.items():
        p = os.path.join(d, '%s.js' % c)
        with open(p, 'w', encoding='utf-8') as f:
            f.write('/* 本文件由 build.py 生成，勿手改。源：content/ */\n')
            f.write('Object.assign(window.BODY=window.BODY||{},%s);' % json.dumps(body, ensure_ascii=False))
        total += os.path.getsize(p)
    return len(chunks), total


def stamp_assets():
    """⚠️ 2026-10-22：微信 X5 无视 ?v=、按路径缓存——用户在微信里看到的整页都是旧版。
    把样式、脚本、数据包复制进 b/<内容哈希>/，index.html 改指过去：内容一变路径就变，X5 只能拿新的。
    ⚠️ 源文件仍是根目录的 style.css / app.js / data/*.js，**别去改 b/ 里的**。
    最近八版目录必须保留：用户若仍拿着微信缓存的旧 index，按需点速查或案例时
    还会请求旧哈希路径；立刻删目录会让它误报“网络失败”。
    git 按内容去重，没变的文件换了路径也不会多占仓库。"""
    import hashlib, shutil
    files = ['style.css', 'engine.js', 'app.js', 'pan-detect.js'] + \
            ['data/' + os.path.relpath(os.path.join(r, f), os.path.join(HERE, 'data'))
             for r, _, fs in sorted(os.walk(os.path.join(HERE, 'data'))) for f in sorted(fs) if f.endswith('.js')]
    h = hashlib.md5()
    for f in files:
        h.update(f.encode()); h.update(open(os.path.join(HERE, f), 'rb').read())
    tag = h.hexdigest()[:10]
    bdir = os.path.join(HERE, 'b')
    os.makedirs(bdir, exist_ok=True)
    history_path = os.path.join(bdir, 'history.json')
    try:
        history = json.loads(read(history_path))
        if not isinstance(history, list):
            history = []
    except Exception:
        history = []
    history = [x for x in history if isinstance(x, str) and x != tag] + [tag]
    history = history[-8:]
    for d in os.listdir(bdir):
        p = os.path.join(bdir, d)
        if os.path.isdir(p) and d not in history:
            shutil.rmtree(p)
    with open(history_path, 'w', encoding='utf-8') as f:
        json.dump(history, f, ensure_ascii=False, indent=2)
        f.write('\n')
    dst = os.path.join(bdir, tag)
    for f in files:
        os.makedirs(os.path.dirname(os.path.join(dst, f)), exist_ok=True)
        shutil.copyfile(os.path.join(HERE, f), os.path.join(dst, f))
    pre = 'b/%s/' % tag
    ip = os.path.join(HERE, 'index.html')
    html = read(ip)
    html = re.sub(r'<!--ASSET-CSS-->.*?<!--/ASSET-CSS-->',
                  '<!--ASSET-CSS--><link rel="stylesheet" href="%sstyle.css"><!--/ASSET-CSS-->' % pre, html, flags=re.S)
    html = re.sub(r'<!--ASSET-JS-->.*?<!--/ASSET-JS-->',
                  ('<!--ASSET-JS--><script>window.ASSET=\'%s\'</script>\n<script src="%sdata/data-meta.js"></script>\n'
                   '<script src="%sengine.js"></script>\n<script src="%sapp.js"></script><!--/ASSET-JS-->') % (pre, pre, pre, pre),
                  html, flags=re.S)
    open(ip, 'w', encoding='utf-8').write(html)
    return tag


def main():
    if not os.path.isdir(SRC):
        sys.exit('找不到内容源目录：%s' % SRC)
    lessons_md = []
    lessons = build_lessons(lessons_md)
    outline_md = read(os.path.join(SRC, '00-总目录与学习路线.md'))
    outline = mdlite.md2html(outline_md)

    if len(lessons) < BASE_LESSONS:
        sys.exit('✗ 只解析到 %d 课，少于下限 %d ——解析器可能吞了内容'
                 % (len(lessons), BASE_LESSONS))
    if len(lessons) > BASE_LESSONS:
        print('  提示：已有 %d 课，可把 build.py 的 BASE_LESSONS 抬到 %d'
              % (len(lessons), len(lessons)))

    bad = [l['id'] for l in lessons if '## 自测' not in l['text'].replace(' ', '')
           and '自测' not in l['text']]
    if bad:
        sys.exit('✗ 这些课没有自测题：%s' % bad)
    noans = [l['id'] for l in lessons if '答案' not in l['text']]
    if noans:
        sys.exit('✗ 这些课有自测没答案：%s' % noans)
    nocite = [l['id'] for l in lessons if 'class="src"' not in l['html']]
    if nocite:
        sys.exit('✗ 这些课一条出处都没有：%s' % nocite)

    basic_lessons = build_basic_lessons()
    counts = {'lesson': len(lessons), 'basicLesson': len(basic_lessons), 'planned': TOTAL_PLANNED,
              'pan': sum(l['html'].count('class="pan"') for l in lessons),
              'cite': sum(l['html'].count('class="src"') for l in lessons)}
    plan = parse_plan(outline_md)
    done_nums = {l['num'] for l in lessons}
    miss = [p['num'] for p in plan if p['done'] and p['num'] not in done_nums]
    if miss:
        sys.exit('✗ 总目录里标了 ✅ 但 content/ 里没有这几课：%s' % miss)
    extra = [n for n in done_nums if n not in {p['num'] for p in plan}]
    if extra:
        sys.exit('✗ 这几课没写进总目录的计划表：%s' % extra)
    counts['planned'] = len(plan) or TOTAL_PLANNED

    meta = {'name': '六壬神课', 'built': time.strftime('%Y-%m-%d %H:%M'),
            'counts': counts, 'outline': outline, 'plan': plan,
            'list': [{'id': l['id'], 'num': l['num'], 'short': l['short'],
                      'line': l['line']} for l in lessons],
            'basicList': [{'id': l['id'], 'num': l['num'], 'short': l['short'],
                           'line': l['line'], 'part': l['part'], 'sources': l['sources'],
                           'pan_pending': l['pan_pending']} for l in basic_lessons]}

    ref = build_ref(lessons_md)
    counts['ref'] = len(ref)
    basic_ref = build_basic_ref()
    review = build_review()
    counts['basicRef'] = len(basic_ref)
    ge = build_ge()
    counts['ge'] = len(ge)
    for l in lessons:
        l['html'] = deep_link(l['html'], ge)
    extra = build_extra()
    counts['extra'] = len(extra)
    xflibs, xfitems = build_xf()
    counts['xf'] = len(xfitems)
    bifa = build_bifa()
    counts['bifa'] = len(bifa)
    counts['bifage'] = sum(len(x['ge']) for x in bifa)
    js = build_jinsuo()
    counts['jinsuo'] = len(js['a']) if js else 0
    counts['jinsuob'] = len(js['b']) if js else 0
    qcats, qitems = build_quiz()
    counts['quiz'] = len(qitems)
    counts['quizstar'] = sum(x['star'] for x in qitems)
    mfitems = build_mufu()
    counts['mufu'] = len(mfitems)
    tjitems = build_tongjie()
    counts['tongjie'] = len(tjitems)
    tjsearch = [{'id': x['id'], 'text': x.pop('search_text')} for x in tjitems]
    meta['counts'] = counts
    qnames = [c['name'] for c in qcats]
    nq, sq = write_bodies('q', qitems, 'n', lambda it: qnames.index(it['cat']))
    nmf, smf = write_bodies('mf', mfitems, 'n', lambda it: (it['n'] - 1) // 10)
    ntj, stj = write_bodies('tj', tjitems, 'id', lambda it: {'上': 0, '中': 100, '下': 300}[it['volume']] + (it['n'] - 1) // 10)
    nb, sb = write_bodies('bf', bifa, 'n', lambda it: (it['n'] - 1) // 10)
    s1 = write_js('data-course.js', 'DATA_COURSE', lessons)
    s2 = write_js('data-meta.js', 'DATA_META', meta)
    s3 = write_js('data-ref.js', 'DATA_REF', ref)
    s4 = write_js('data-quiz.js', 'DATA_QUIZ', {'topics': qcats, 'items': qitems})
    s5 = write_js('data-ge.js', 'DATA_GE', ge)
    s6 = write_js('data-bifa.js', 'DATA_BIFA', bifa)
    s7 = write_js('data-xf.js', 'DATA_XF', {'libs': xflibs, 'items': xfitems})
    s8 = write_js('data-extra.js', 'DATA_EXTRA', extra)
    s9 = write_js('data-jinsuo.js', 'DATA_JINSUO', js or {})
    s10 = write_js('data-mufu.js', 'DATA_MUFU', mfitems)
    s11 = write_js('data-tongjie.js', 'DATA_TONGJIE', tjitems)
    s12 = write_js('data-tongjie-search.js', 'DATA_TONGJIE_SEARCH', tjsearch)
    s13 = write_js('data-basic-course.js', 'DATA_BASIC_COURSE', basic_lessons)
    s14 = write_js('data-basic-ref.js', 'DATA_BASIC_REF', basic_ref)
    s15 = write_js('data-review.js', 'DATA_REVIEW', review)
    s16 = write_js('data-mindmap.js', 'DATA_MINDMAP', build_mindmap())
    print('  复习卡 %d 张（通解 %d／初中级 %d）' % (len(review), sum(1 for x in review if x['kind'] == 'main'), sum(1 for x in review if x['kind'] == 'basic')))
    print('  课 %d / 计划 %d　式盘 %d　出处 %d　速查表 %d'
          % (counts['lesson'], counts['planned'], counts['pan'], counts['cite'], counts['ref']))
    print('  data-course.js %7.1f KB' % (s1 / 1024))
    print('  data-meta.js   %7.1f KB' % (s2 / 1024))
    print('  data-ref.js    %7.1f KB（速查：%d 张表）' % (s3 / 1024, len(ref)))
    print('  data-quiz.js   %7.1f KB（课例 %d，其中入门精选 %d，%d 个占类）'
          % (s4 / 1024, counts['quiz'], counts['quizstar'], len(qcats)))
    print('  正文分块：课例 %d 块 %.1f KB／毕法 %d 块 %.1f KB（点开才加载）' % (nq, sq / 1024, nb, sb / 1024))
    print('  data-mufu.js  %7.1f KB（王牧夫初级案例 %d；正文 %d 块 %.1f KB）'
          % (s10 / 1024, len(mfitems), nmf, smf / 1024))
    print('  data-tongjie.js %5.1f KB（通解案例 %d；正文 %d 块 %.1f KB）'
          % (s11 / 1024, len(tjitems), ntj, stj / 1024))
    print('  data-tongjie-search.js %.1f KB（只在全站搜索时加载）' % (s12 / 1024))
    print('  data-basic-course.js %.1f KB（初中级课程 %d 课）' % (s13 / 1024, len(basic_lessons)))
    print('  data-basic-ref.js %.1f KB（初中级速查 %d 条）' % (s14 / 1024, len(basic_ref)))
    print('  data-ge.js     %7.1f KB（格局详解 %d 格）' % (s5 / 1024, counts['ge']))
    print('  data-bifa.js   %7.1f KB（毕法赋 %d 法 / %d 格）'
          % (s6 / 1024, counts['bifa'], counts['bifage']))
    print('  data-extra.js  %7.1f KB（附篇 %d 篇：%s）'
          % (s8 / 1024, counts['extra'], '、'.join(x['title'] for x in extra)))
    print('  data-jinsuo.js %7.1f KB（金锁玉匙 %d＋%d 首）' % (s9 / 1024, counts['jinsuo'], counts['jinsuob']))
    print('  data-xf.js     %7.1f KB（象法 %d 条 / %s）'
          % (s7 / 1024, counts['xf'],
             '＋'.join('%s%d' % (x['name'], x['n']) for x in xflibs)))
    print('  静态文件路径版本 b/%s/（防微信 X5 按路径缓存）' % stamp_assets())
    print('\n✓ 自检通过')


if __name__ == '__main__':
    main()
