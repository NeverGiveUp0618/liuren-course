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
OUT = os.path.join(HERE, 'data')

BASE_LESSONS = 13      # 已成课数下限
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


def build_lessons():
    out = []
    for fn in sorted(os.listdir(SRC)):
        if not fn.endswith('.md') or fn.startswith('00-'):
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


def main():
    if not os.path.isdir(SRC):
        sys.exit('找不到内容源目录：%s' % SRC)
    lessons = build_lessons()
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

    counts = {'lesson': len(lessons), 'planned': TOTAL_PLANNED,
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

    meta = {'name': '六壬课程', 'built': time.strftime('%Y-%m-%d %H:%M'),
            'counts': counts, 'outline': outline, 'plan': plan,
            'list': [{'id': l['id'], 'num': l['num'], 'short': l['short'],
                      'line': l['line']} for l in lessons]}

    s1 = write_js('data-course.js', 'DATA_COURSE', lessons)
    s2 = write_js('data-meta.js', 'DATA_META', meta)
    print('  课 %d / 计划 %d　式盘 %d　出处 %d'
          % (counts['lesson'], counts['planned'], counts['pan'], counts['cite']))
    print('  data-course.js %7.1f KB' % (s1 / 1024))
    print('  data-meta.js   %7.1f KB' % (s2 / 1024))
    print('\n✓ 自检通过')


if __name__ == '__main__':
    main()
