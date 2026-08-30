# -*- coding: utf-8 -*-
"""
一次性迁移工具：liuren-game 的 K64 / K64_GE / K64X（六十四课经）→ 并进 content/98-格局详解.md

为什么并进 98 而不是新开一篇：
  98 是《通解》**中册** 25 格，K64 是**讲义**六十四课经，两边 **23 个格重名**。
  分成两个文件，同一个格要翻两处；并进来则一格一处，两书说法并列。
  （合并口径依 reference：**通解与讲义不一致处两边都列，不替他选**。）

做法：
  · 98 现有 1–25 号**一律不动号**——`data-ge.js` 的条目 id 就是这个 n。
  · 23 个重名格：在原节末尾追加一个「讲义（六十四课经）」块。
  · 41 个 98 没有的格：接在后面，编号 26–66。
  · 文末那张无序号的总表是附录（build_ge 不收），新节必须插在它**之前**。

⚠️ 跑完一次就够。**98 从此仍是内容源**，别再从 game 重抽。
⚠️ 非幂等：脚本检测到 MARK 已存在就拒绝重跑，免得追加两遍。

用法：python3 _tools/_mk98add.py [--dry]
"""
import importlib.util, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
GE   = os.path.join(ROOT, 'content', '98-格局详解.md')
MARK = '**讲义（六十四课经）**'


def load_game_blocks():
    """借 _mk97 的 grab/eval 管道，把 K64 / K64_GE / K64X 三块取成 python 对象。"""
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

    import json, subprocess, tempfile
    js = ('const K64=%s; const K64_GE=%s; const K64X=%s;'
          'process.stdout.write(JSON.stringify({k:K64,g:K64_GE,x:K64X}));'
          % (block('K64'), block('K64_GE'), block('K64X')))
    fd, p = tempfile.mkstemp(suffix='.js', dir=HERE)
    os.write(fd, js.encode('utf-8')); os.close(fd)
    try:
        out = subprocess.run(['node', p], capture_output=True, text=True)
        if out.returncode:
            sys.exit('node 失败：\n' + out.stderr[:1500])
        return json.loads(out.stdout)
    finally:
        os.remove(p)


def jiangyi_block(item, ge_song, x, newsec=False):
    """一个格的「讲义」块。有详解的给全，没有的只给歌诀＋成格条件。

    newsec=True 时这是 98 里全新的一格——**必须给「一句话」行**，
    build_ge 就靠它填格局列表的那一行摘要，缺了列表上是空白。
    重名格不给：原节已有一句话，两行会打架（build_ge 取第一条）。
    """
    L = [] if newsec else [MARK, '']
    if ge_song:
        L += ['> 「%s」' % ge_song, '> 〔讲义·课目总歌〕', '']
    if item.get('key'):
        L += ['| | |', '|---|---|']
        if newsec and ge_song:
            L.append('| **一句话** | %s |' % ge_song.replace('|', '｜'))
        L += ['| **怎么成格%s** | %s |'
              % ('' if newsec else '（讲义）', item['key'].replace('|', '｜')),
              '| **归类** | %s |' % item.get('group', ''), '']
    if not x:
        L.append('〔出处〕%s' % item.get('src', '讲义'))
        L.append('')
        return L
    if x.get('xiang'):
        L += ['**象曰**', '', '> 「%s」' % x['xiang'],
              '> 〔讲义 p%s〕' % x.get('p', '—'), '']
    if x.get('shu'):
        L += ['**术语**　%s' % x['shu'], '']
    if x.get('duan'):
        L += ['**断诀**', '']
        L += ['- %s' % d for d in x['duan']]
        L.append('')
    if x.get('bian'):
        L += ['**变格**', '']
        L += ['- %s' % b for b in x['bian']]
        L.append('')
    if x.get('warn'):
        L += ['> ⚠️ %s' % x['warn'], '']
    L += ['〔出处〕讲义 p%s' % x.get('p', '—'), '']
    return L


def main():
    dry = '--dry' in sys.argv
    md = open(GE, encoding='utf-8').read()
    if MARK in md:
        sys.exit('✗ 98 里已有「讲义」块——本脚本非幂等，不能重跑。'
                 '要重来请先 git checkout content/98-格局详解.md')

    data = load_game_blocks()
    K64, K64_GE, K64X = data['k'], data['g'], data['x']

    # 切出：头部 / 有序号的各节 / 附录尾巴
    heads = list(re.finditer(r'^## (\d+)\. (.+?)$', md, re.M))
    if not heads:
        sys.exit('✗ 98 里找不到 "## N. 名" 形式的节')
    last = heads[-1]
    nxt = re.search(r'^## (?!\d+\.)', md[last.end():], re.M)
    tail_at = last.end() + nxt.start() if nxt else len(md)
    head_txt = md[:heads[0].start()]
    tail_txt = md[tail_at:]

    secs = []
    for i, h in enumerate(heads):
        end = heads[i + 1].start() if i + 1 < len(heads) else tail_at
        names = [x.strip() for x in h.group(2).split('/')]
        secs.append({'n': int(h.group(1)), 'title': h.group(2).strip(),
                     'names': names, 'body': md[h.start():end]})

    by_name = {}
    for s in secs:
        for nm in s['names']:
            by_name[nm] = s

    merged, added = [], []
    for it in K64:
        nm = it['name']
        s = by_name.get(nm)
        blk = jiangyi_block(it, K64_GE.get(nm), K64X.get(nm), newsec=not s)
        if s:
            s.setdefault('add', []).extend(blk)
            merged.append(nm)
        else:
            added.append((it, blk))

    maxn = max(s['n'] for s in secs)
    out = [head_txt.rstrip(), '']
    for s in secs:
        body = s['body'].rstrip()
        if s.get('add'):
            add = '\n'.join(s['add']).rstrip()
            # ⚠️ 原节都以 --- 收尾，那是**节与节的分隔线**。
            #    直接往后追加会把分隔线顶到节中间，讲义块和下一节就粘在一起了。
            #    所以先摘掉尾巴上的 ---，插完再补回去。
            if body.endswith('---'):
                body = body[:-3].rstrip() + '\n\n' + add + '\n\n---'
            else:
                body += '\n\n' + add
        out += [body, '']
    for i, (it, blk) in enumerate(added, 1):
        out.append('## %d. %s' % (maxn + i, it['name']))
        out.append('')
        out += [l for l in '\n'.join(blk).rstrip().split('\n')]
        out += ['', '---', '']
    out.append(tail_txt.strip())
    new = '\n'.join(out).rstrip() + '\n'

    print('98 原有 %d 节，K64 共 %d 格' % (len(secs), len(K64)))
    print('  重名并入原节 %d 格：%s' % (len(merged), '、'.join(merged)))
    print('  新增 %d 格，编号 %d–%d' % (len(added), maxn + 1, maxn + len(added)))
    print('  其中带讲义详解（象曰/断诀/变格）的 %d 格'
          % sum(1 for it in K64 if K64X.get(it['name'])))
    print('  md %d → %d 行 / %.1f → %.1f KB'
          % (md.count('\n') + 1, new.count('\n') + 1,
             len(md.encode()) / 1024, len(new.encode()) / 1024))
    if dry:
        print('(--dry，未写)')
        return
    open(GE, 'w', encoding='utf-8').write(new)
    print('已写 ' + GE)


if __name__ == '__main__':
    main()
