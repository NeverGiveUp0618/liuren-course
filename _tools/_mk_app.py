# -*- coding: utf-8 -*-
"""
一次性迁移工具（2026-10-22）：「六壬神课」App 退役，把还没进课程的内容全部收成附篇 80–91。

为什么这次连「与课文重复」的屏也搬：2026-08-30 那轮只搬独有内容，是因为 App 还在线；
这次 App 退役，**不搬就没了**。所以统一按「App 原文存档」收进来，每篇开头写明
与哪几课重复、以课文为准。课文本身不动。

用法：python3 _tools/_mk_app.py [--dry]      跑一次就够，md 从此是内容源。
"""
import html as _html
import json, os, re, subprocess, sys
from html.parser import HTMLParser

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
GAME = os.path.join(os.path.dirname(ROOT), 'liuren-game', 'index.html')
OUTD = os.path.join(ROOT, 'content')
G = open(GAME, encoding='utf-8').read()


# ── 屏的起止 ──────────────────────────────────────────────
_st = sorted((m.start(), m.group(1))
             for m in re.finditer(r'<div id="(p[a-zA-Z0-9_-]*)" class="screen', G))
RNG = {}
for i, (p, sid) in enumerate(_st):
    end = _st[i + 1][0] if i + 1 < len(_st) else G.find('<script>', p)
    RNG[sid] = (p, end)


def screen(sid):
    a, b = RNG[sid]
    return G[a:b]


# ── HTML → markdown ───────────────────────────────────────
class H2M(HTMLParser):
    """App 屏的结构很规整：m5-tog＝一级折叠标题、m5-sub-tog＝二级、m5-tbl＝表、m5-text＝段落。
    其余 div 一律当段落。<b> → **，<br> → 换行。"""
    BLOCK = {'div', 'p', 'li', 'h1', 'h2', 'h3', 'h4', 'button', 'tr', 'table', 'ul', 'ol'}

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.out, self.buf = [], []
        self.stack = []          # 每层：(tag, kind)
        self.row, self.rows, self.in_tbl = None, None, 0
        self.cell = None
        self.skip = 0

    def flush(self, prefix=''):
        t = ''.join(self.buf).strip()
        self.buf = []
        t = re.sub(r'[ \t]+', ' ', t)
        t = re.sub(r'\*\*\s*\*\*', '', t)
        if t and t not in ('›', '✕', '▾', '▸'):
            self.out.append(prefix + t)

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        cls = a.get('class') or ''
        # 页签／操作按钮不是正文（「月将表 贵人表…」那排 tab 曾被当成段落）
        btn_noise = tag == 'button' and 'm5-tog' not in cls and 'm5-sub-tog' not in cls
        if tag in ('script', 'style') or 'tbar' in cls or 'm5-tog-arrow' in cls or 'tbk' in cls or btn_noise:
            self.skip += 1
            self.stack.append((tag, 'skip'))
            return
        if self.skip:
            self.stack.append((tag, ''))
            return
        kind = ''
        if tag == 'table':
            self.flush(); self.in_tbl += 1; self.rows = []; kind = 'table'
        elif tag == 'tr' and self.in_tbl:
            self.row = []; kind = 'tr'
        elif tag in ('td', 'th') and self.in_tbl:
            self.cell = []; kind = 'cell'
        elif tag == 'br':
            (self.cell if self.cell is not None else self.buf).append('<br>' if self.cell is not None else '\n')
            return
        elif tag == 'b' or tag == 'strong':
            (self.cell if self.cell is not None else self.buf).append('**'); kind = 'b'
        elif tag in self.BLOCK:
            self.flush()
            if 'm5-sub-tog' in cls:
                kind = 'h3'
            elif 'm5-tog' in cls or tag in ('h1', 'h2'):
                kind = 'h2'
            elif tag in ('h3', 'h4'):
                kind = 'h3'
            elif 'red' in cls.split():
                kind = 'red'
            elif tag == 'li':
                kind = 'li'
            else:
                kind = 'p'
        self.stack.append((tag, kind))

    def handle_endtag(self, tag):
        # 容错：弹到同名标签为止
        while self.stack:
            t, kind = self.stack.pop()
            if kind == 'skip':
                self.skip -= 1
            elif self.skip:
                pass
            elif kind == 'b':
                (self.cell if self.cell is not None else self.buf).append('**')
            elif kind == 'cell':
                txt = re.sub(r'\s+', ' ', ''.join(self.cell)).strip().replace('|', '｜')
                self.row.append(txt); self.cell = None
            elif kind == 'tr':
                if self.row:
                    self.rows.append(self.row)
                self.row = None
            elif kind == 'table':
                self.in_tbl -= 1
                if self.rows:
                    n = max(len(r) for r in self.rows)
                    rows = [r + [''] * (n - len(r)) for r in self.rows]
                    self.out.append('')
                    self.out.append('| ' + ' | '.join(rows[0]) + ' |')
                    self.out.append('|' + '---|' * n)
                    for r in rows[1:]:
                        self.out.append('| ' + ' | '.join(r) + ' |')
                    self.out.append('')
                self.rows = None
            elif kind == 'h2':
                self.out.append(''); self.flush('## '); self.out.append('')
            elif kind == 'h3':
                self.out.append(''); self.flush('### '); self.out.append('')
            elif kind == 'red':
                self.flush('⭐ ')
            elif kind == 'li':
                self.flush('- ')
            elif kind == 'p':
                self.flush()
            if t == tag:
                break

    def handle_data(self, d):
        if self.skip:
            return
        d = d.replace('\n', ' ')
        (self.cell if self.cell is not None else self.buf).append(d)


def h2m(h):
    p = H2M()
    p.feed(h)
    p.close()
    p.flush()
    lines, out = p.out, []
    for ln in lines:
        if ln == '' and out and out[-1] == '':
            continue
        out.append(ln)
    md = '\n\n'.join(x for x in '\n'.join(out).split('\n\n'))
    md = re.sub(r'\n{3,}', '\n\n', md)
    # 段落之间留空行（表格行之间不能留）
    res = []
    for ln in md.split('\n'):
        if res and ln and res[-1] and not (ln.startswith('|') and res[-1].startswith('|')):
            res.append('')
        res.append(ln)
    return re.sub(r'\n{3,}', '\n\n', '\n'.join(res)).strip() + '\n'


# ── JS 数据：node eval 整个字面量（有辅助函数的数据正则抓不全，见 _merge_findings.md）──
def js_data(name):
    m = re.search(r'\n(?:const|let|var)\s+' + name + r'\s*=', G)
    if not m:
        sys.exit('✗ 找不到 ' + name)
    start = m.start() + 1
    # 取到下一个顶层声明为止
    nx = re.search(r'\n(?:const|let|var|function|class)\s', G[m.end():])
    src = G[start:m.end() + (nx.start() if nx else 0)]
    js = src + '\nprocess.stdout.write(JSON.stringify(' + name + '));'
    r = subprocess.run(['node', '-e', js], capture_output=True, text=True)
    if r.returncode:
        sys.exit('✗ eval ' + name + ' 失败：' + r.stderr[:400])
    return json.loads(r.stdout)


def inl(s):
    s = str(s or '')
    s = re.sub(r'<b>(.*?)</b>', r'**\1**', s, flags=re.S)
    s = re.sub(r'<br\s*/?>', '\n', s)
    s = re.sub(r'<[^>]+>', '', s)
    return _html.unescape(s).strip()


HEAD = '''# {title}

> **这是什么**：{what}
> ⚠️ **迁自「六壬神课」App（2026-10-22 App 退役时整体收入）**，原文照录、未逐条标页码。{dup}

---

'''


def doc(title, what, dup, body):
    return HEAD.format(title=title, what=what, dup=dup) + body.strip() + '\n'


def blocks_md(blocks):
    """BJ_SHA / BJ_BAO 这类 {h}/{p}/{ge}/{tbl} 小块数组。"""
    out = []
    for b in blocks:
        if 'h' in b:
            out.append('#### ' + inl(b['h']))
        elif 'p' in b:
            out.append(inl(b['p']))
        elif 'ge' in b:
            out.append(('**%s**\n\n' % inl(b['gt']) if b.get('gt') else '') + '\n'.join('> ' + inl(x) for x in b['ge']))
        elif 'li' in b or 'ul' in b:
            out.append('\n'.join('- ' + inl(x) for x in (b.get('li') or b.get('ul'))))
        elif 'note' in b:
            out.append('> ⚠️ ' + inl(b['note']))
        elif 'tbl' in b or 'rows' in b:
            rows = b.get('tbl') or b.get('rows')
            if isinstance(rows, dict):
                rows = [rows.get('head', [])] + rows.get('rows', [])
            n = max(len(r) for r in rows)
            t = ['| ' + ' | '.join(inl(c) for c in rows[0]) + ' |', '|' + '---|' * n]
            t += ['| ' + ' | '.join(inl(c).replace('\n', ' ') for c in r) + ' |' for r in rows[1:]]
            out.append('\n'.join(t))
        else:
            out.append(inl(' '.join(str(v) for v in b.values())))
    return '\n\n'.join(out)


def main():
    dry = '--dry' in sys.argv
    files = {}

    files['80-白话入门·六壬运作原理.md'] = doc(
        '六壬运作原理 · 白话入门', '零基础入门：用「四层结构」大白话讲月将、天地盘、四课三传与判断流程。',
        '与第 1 课大面重复，**以课文为准**。', h2m(screen('pbdl')))
    files['81-壬学心法·排盘推演全解.md'] = doc(
        '壬学心法 · 排盘推演与底层逻辑', '庚午日戌时实例的七步起盘全过程，加「数据建模」角度的四课三传解读。',
        '起盘七步与第 1–7 课重复，**以课文为准**。⚠️ 实例盘是 App 起课器排的。', h2m(screen('p-xf')))
    files['82-算法逻辑梳理·进阶.md'] = doc(
        '六壬算法逻辑梳理 · 进阶', '以程序算法视角拆解大六壬推演：五个基础阶段＋五个高阶模块。来源《大六壬逻辑梳理》。',
        '与第 5、6、17 课多处重复，**以课文为准**；⚠️ 其中涉害若写「孟＞仲＞季」，是《图解六壬大全》口径，本站按《通解》数克害。', h2m(screen('pllj')))
    files['83-九宗门体系与发用流程.md'] = doc(
        '九宗门体系与发用流程', 'App「三传发用·九宗门」与「九宗门发用流程」两屏合编。',
        '与第 5、6、18 课重复，课名由来已补进第 5、6 课。⚠️ **App 三传取下神，本站取上神**（第 5 课第六节），同一张盘可能差一位，以课文为准。',
        h2m(screen('p9z')) + '\n\n---\n\n# 附 · 九宗门发用流程（App 原「流程图」屏）\n\n' + h2m(screen('pzfl')))
    files['84-起课查表与干支关系.md'] = doc(
        '起课查表与干支关系', 'App「起课速查」（月将／贵人／旬空／寄宫）与「干支关系速查」两屏合编。',
        '表格与第 2–7、10、11 课及「速查」屏重复，**以课文为准**。⚠️ 六壬用传统六破（子酉/丑辰/寅亥/卯午/巳申/未戌）。',
        h2m(screen('pqk')) + '\n\n---\n\n' + h2m(screen('pgz')))
    p5 = screen('p5')
    files['85-知识速查十章.md'] = doc(
        '知识速查十章', 'App 首页「知识速查」整屏：从概论到断法的十章摘要。',
        '历史源流段已单独成「六壬源流」附篇；其余与第 1–16 课重复，**以课文为准**。', h2m(p5))
    files['86-取用神·六亲类神.md'] = doc(
        '取用神 · 六亲类神', '读案例的第一把钥匙：先分清占的是谁、什么事，再定用神。',
        '与第 7、12 课重复，**以课文为准**。', h2m(screen('pyus')))
    files['87-天时晴雨速查.md'] = doc(
        '天时 · 晴雨速查', '占天气：气象类神表（主雨／晴／风／雷雪）＋雨量应期断诀。',
        '课程 25 课没有天时一课，「象法速查」分类类神里有零散几条；本篇是完整版。', h2m(screen('ptw')))

    # 口诀
    kj = js_data('KJ_DATA')
    body = []
    for cat, arr in kj.items():
        body.append('## ' + cat)
        for it in arr:
            body.append('### ' + inl(it.get('title')) + '\n\n' + inl(it.get('body')).replace('\n', '  \n'))
    files['88-口诀合集.md'] = doc('口诀合集', 'App「口诀闪卡」的全部卡片，按类别排。',
                                '闪卡是背诵用的，这里改成可查可读的合集。', '\n\n'.join(body))

    # 八煞九宝
    body = []
    for nm, var in (('八煞', 'BJ_SHA'), ('九宝', 'BJ_BAO')):
        body.append('## ' + nm)
        for it in js_data(var):
            body.append('### %s　%s\n\n**%s**\n\n%s' % (it['n'], inl(it.get('sub')), inl(it.get('one')),
                                                     blocks_md(it.get('blocks', []))))
    files['89-八煞九宝详解.md'] = doc('八煞九宝详解', '刑冲破害墓等八煞、德禄马奇仪等九宝，每项含义、歌诀、用法。',
                                  '第 11 课讲的是怎么用，本篇是 App 的逐项详解，可互参。', '\n\n'.join(body))

    # 毕法赋主题版
    fa, det, xi = js_data('BF_FA'), js_data('BF_DETAIL'), js_data('BF_XIANG')
    body = ['## 一、一百法主题速查（法诀＋白话＋详解）']
    for i, f in enumerate(fa):
        name = inl(f.get('f') or '')
        s_ = '### 第 %d 法　%s　〔%s〕\n\n%s' % (i + 1, name, inl(f.get('c')), inl(f.get('m') or ''))
        if det.get(f.get('f')):
            s_ += '\n\n' + h2m(det[f['f']]).strip()
        body.append(s_)
    body.append('## 二、毕法象义（%d 条）' % len(xi))
    for x in xi:
        body.append('### %s　〔%s〕\n\n%s\n\n**用法**　%s\n\n〔出处〕%s' % (
            inl(x['name']), inl(x.get('group')), inl(x.get('key')), inl(x.get('use')), inl(x.get('src'))))
    files['90-毕法赋主题速查与象义.md'] = doc(
        '毕法赋 · 主题速查与毕法象义', 'App 的旧版「一百法主题速查」（按官贵、财运等十大主题）与「毕法象义」。',
        '四库足本逐格详解另见「毕法赋详解」附篇，**法号以那篇为准**（两版法目顺序自第 5 法起不同）。', '\n\n'.join(body))

    # 新书补义
    body = []
    for nm, var in (('十二天将', 'TJ_BOOK'), ('十二支神', 'ZS_BOOK')):
        body.append('## ' + nm + ' · 新书补义')
        data = js_data(var)
        for k, v in (data.items() if isinstance(data, dict) else enumerate(data)):
            body.append('### %s\n\n%s' % (k, inl(v if isinstance(v, str) else
                                               '\n\n'.join('%s：%s' % (a, b) for a, b in v.items()) if isinstance(v, dict)
                                               else '\n\n'.join(inl(x) for x in v))))
    files['91-天将支神新书补义.md'] = doc(
        '天将支神 · 新书补义', '《图解六壬大全》第 1、2 部对十二天将、十二支神的补充义项。',
        '第 8、9 课与「象法速查」讲骨架与白话类象，本篇是原书补义，可互参。', '\n\n'.join(body))

    for fn, md in files.items():
        print('%-28s %6.1f KB  %s' % (fn, len(md.encode()) / 1024, '（dry）' if dry else ''))
        if not dry:
            open(os.path.join(OUTD, fn), 'w', encoding='utf-8').write(md)


if __name__ == '__main__':
    main()
