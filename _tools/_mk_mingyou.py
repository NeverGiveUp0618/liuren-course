# -*- coding: utf-8 -*-
"""
一次性迁移：liuren-game 的 p9z 屏「为什么叫 XX」十条释名 → 补进第 5、6 课。

课程第 5、6 课把九宗门的**取法**讲透了，但**没讲名字是怎么来的**
（为什么叫涉害、为什么叫别责、八专的"八"指什么）。这十条是 game 独有的。

⚠️ 只取 `z9-name-title` 到 `z9-name-key` 这一段（释名＋盘面对应），
   **不取后面的「判断／取法／象意」**——那些与 05、06 课全面重复，
   而且涉害那条写的是「孟＞仲＞季」深浅法，与本教材已拍板的《通解》口径相反，
   搬进来就是在课文里埋一条自相矛盾。
⚠️ 非幂等：检测到已插入就拒绝重跑。

用法：python3 _tools/_mk_mingyou.py [--dry]
"""
import html as H
import importlib.util, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
MARK = '## 附：课名由来'
L5 = os.path.join(ROOT, 'content', '05-三传（上）·贼克·比用·涉害.md')
L6 = os.path.join(ROOT, 'content', '06-三传（下）·遥克·昴星·别责·八专·伏吟·返吟.md')
IN5 = ['元首课', '重审课', '知一课', '涉害课']
IN6 = ['遥克课', '昴星课', '别责课', '八专课', '伏吟课', '返吟课']


def txt(s):
    s = re.sub(r'<b>(.*?)</b>', r'**\1**', s, flags=re.S)
    s = re.sub(r'<[^>]+>', '', s)
    s = H.unescape(s)
    return re.sub(r'\s+', '', s).replace('“', '「').replace('”', '」')


def grab():
    spec = importlib.util.spec_from_file_location('mk97', os.path.join(HERE, '_mk97.py'))
    mk97 = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mk97)
    g = open(mk97.GAME, encoding='utf-8').read()
    st = sorted((m.start(), m.group(1))
                for m in re.finditer(r'<div id="(p[a-zA-Z0-9_-]*)" class="screen', g))
    rng = {}
    for i, (p, sid) in enumerate(st):
        rng[sid] = (p, st[i + 1][0] if i + 1 < len(st) else g.find('<script>', p))
    h = g[rng['p9z'][0]:rng['p9z'][1]]
    names = re.findall(r'z9-hname">([^<]+)<', h)
    parts = re.split(r'z9-hname">[^<]+<', h)[1:]
    out = {}
    for nm, blk in zip(names, parts):
        m = re.search(r'<div class="z9-name-title">(.*?)</div>(.*?)'
                      r'<div class="z9-name-key">(.*?)</div>', blk, re.S)
        if m:
            out[nm] = (txt(m.group(1)), txt(m.group(2)), txt(m.group(3)))
    return out


def section(names, data):
    L = [MARK, '',
         '> 取法在前面已经讲完了。这一节只回答一个问题：**这些名字是怎么来的**。'
         '知道名字的意思，取法就不用死记——名字本身就是口诀。',
         '']
    for nm in names:
        if nm not in data:
            sys.exit('✗ 抓不到 ' + nm)
        title, body, key = data[nm]
        # 原文里 key 本身就以「盘面对应：」开头，不去掉会和标签重复
        key = re.sub(r'^盘面对应[：:]\s*', '', key)
        L += ['### %s' % nm, '', body, '', '> **盘面对应**　%s' % key, '']
    L += ['〔出处〕讲义 · 九宗门课名由来（2026-08-30 自「六壬神课」App 迁入）', '', '---', '']
    return '\n'.join(L)


def insert(fp, names, data, dry):
    md = open(fp, encoding='utf-8').read()
    if MARK in md:
        sys.exit('✗ %s 里已有「课名由来」——本脚本非幂等' % os.path.basename(fp))
    m = re.search(r'^## .*自测.*$', md, re.M)
    if not m:
        sys.exit('✗ %s 里找不到「## 自测」，不知该插在哪' % os.path.basename(fp))
    new = md[:m.start()] + section(names, data) + '\n' + md[m.start():]
    print('  %s：插入 %d 条，%d → %d 行'
          % (os.path.basename(fp), len(names), md.count('\n') + 1, new.count('\n') + 1))
    if not dry:
        open(fp, 'w', encoding='utf-8').write(new)


def main():
    dry = '--dry' in sys.argv
    data = grab()
    print('抓到释名 %d 条：%s' % (len(data), '、'.join(data)))
    insert(L5, IN5, data, dry)
    insert(L6, IN6, data, dry)
    print('(--dry，未写)' if dry else '已写入 05、06 两课')


if __name__ == '__main__':
    main()
