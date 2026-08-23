# -*- coding: utf-8 -*-
"""零依赖 markdown → HTML（大六壬课程专用）。

⭐ 三种表会被认出来渲染成真正的盘，不走普通表格：
   ① 天地盘  |地盘|子|丑|…|亥|  +  |天盘|…|  [+ |天将|…|]   → 方形式盘
   ② 四课    | |第四课|第三课|第二课|第一课|  + 天将/上神/下神 → 四课盘（从右到左）
   ③ 三传    | |传|遁干|六亲|天将|… + 初传/中传/末传          → 三传竖列
认不出的（缺行、支不合法、原书没给全的占位表）退回普通表格，不硬套。
"""
import html as _html
import re

ZHI = '子丑寅卯辰巳午未申酉戌亥'
GAN = '甲乙丙丁戊己庚辛壬癸'
# 方盘十二宫的 grid 坐标（顺时针，左上角为巳）
_CELLS = [('巳', 1, 1), ('午', 1, 2), ('未', 1, 3), ('申', 1, 4),
          ('酉', 2, 4), ('戌', 3, 4), ('亥', 4, 4), ('子', 4, 3),
          ('丑', 4, 2), ('寅', 4, 1), ('卯', 3, 1), ('辰', 2, 1)]
_WUXING = {}
for _ch, _w in (('甲乙寅卯', 'mu'), ('丙丁巳午', 'huo'), ('戊己辰戌丑未', 'tu'),
                ('庚辛申酉', 'jin'), ('壬癸亥子', 'shui')):
    for _c in _ch:
        _WUXING[_c] = _w


def wx(c):
    return _WUXING.get(c, '')


def gz(c, cls=''):
    """给一个干支字上五行色。四课、三传里用——那里要一眼看出生克。"""
    w = wx(c)
    k = ' '.join(x for x in (cls, ('w-' + w) if w else '') if x)
    return '<span class="%s">%s</span>' % (k, _html.escape(c)) if k else _html.escape(c)


# ── 行内 ──────────────────────────────────────────────
_CODE = re.compile(r'`([^`\n]+)`')
_BOLD = re.compile(r'\*\*(.+?)\*\*', re.S)
_WIKI = re.compile(r'\[\[([^\]]+)\]\]')
_LINK = re.compile(r'\[([^\]]+)\]\(([^)]+)\)')
_SRC = re.compile(r'〔([^〕\n]{1,60})〕')      # 出处：〔通解上 p21｜PDF p36〕
_QUOTE = re.compile(r'「([^」]+?)」')          # 原书引文


def _inline(s):
    s = _html.escape(s)
    holes = []

    def keep(h):
        holes.append(h)
        return '\x00%d\x00' % (len(holes) - 1)

    s = _CODE.sub(lambda m: keep('<code>%s</code>' % m.group(1)), s)
    s = _SRC.sub(lambda m: keep('<span class="src">〔%s〕</span>' % m.group(1)), s)
    # ⚠️ 引文要先把里面的 **强调** 转掉再收进占位符——引文常自带重点标记，
    #    放着不管会在正文里露出一串星号（曾漏掉一处，靠 smoke 才抓出来）。
    s = _QUOTE.sub(lambda m: keep('<q class="yw">%s</q>'
                                  % _BOLD.sub(r'<strong>\1</strong>', m.group(1))), s)
    s = _WIKI.sub(lambda m: keep('<a class="wiki" data-wiki="%s">%s</a>' % (
        m.group(1).split('|')[0], m.group(1).split('|')[-1])), s)
    s = _LINK.sub(lambda m: keep('<a href="%s" target="_blank" rel="noopener">%s</a>'
                                 % (m.group(2), m.group(1))), s)
    s = _BOLD.sub(r'<strong>\1</strong>', s)
    for k, h in enumerate(holes):
        s = s.replace('\x00%d\x00' % k, h)
    return s


# ── 三种盘 ────────────────────────────────────────────
def _clean(c):
    return c.replace('**', '').strip()


def _rows(body):
    """表体 → {首列标签: [其余单元格]}，保持顺序。"""
    out = []
    for r in body:
        if not r:
            continue
        out.append((_clean(r[0]), [_clean(c) for c in r[1:]]))
    return out


def render_pan(order, tp, tj, mid=''):
    """方形式盘：外圈十二格的位置＝地盘，格内大字＝天盘，小字＝天将。"""
    cells = []
    for z, r, c in _CELLS:
        t = tp.get(z, '')
        g = tj.get(z, '')
        cells.append(
            '<div class="gong" style="grid-row:%d;grid-column:%d">'
            '<span class="tj">%s</span><span class="tp">%s</span>'
            '<span class="dp">%s</span></div>'
            % (r, c, _html.escape(g), _html.escape(t), z))
    return ('<div class="panwrap"><div class="pan">%s'
            '<div class="panmid">%s</div></div></div>'
            % (''.join(cells), mid))


def _tiandi(head, body):
    if len(head) != 13 or _clean(head[0]) != '地盘':
        return None
    order = [_clean(c) for c in head[1:]]
    if any(c not in ZHI for c in order) or len(set(order)) != 12:
        return None
    rows = dict(_rows(body))
    if '天盘' not in rows or len(rows['天盘']) < 12:
        return None
    tpv = rows['天盘'][:12]
    if any(c not in ZHI for c in tpv):
        return None
    tjv = rows.get('天将', [''] * 12)[:12]
    tjv += [''] * (12 - len(tjv))
    return render_pan(order, dict(zip(order, tpv)), dict(zip(order, tjv)))


_KE_HEAD = ['第四课', '第三课', '第二课', '第一课']


def _sike(head, body):
    if len(head) != 5 or _clean(head[0]):
        return None
    if [_clean(c) for c in head[1:]] != _KE_HEAD:
        return None
    rows = dict(_rows(body))
    if '上神' not in rows or '下神' not in rows:
        return None
    up, dn = rows['上神'][:4], rows['下神'][:4]
    tj = rows.get('天将', [''] * 4)[:4] + [''] * 4
    if len(up) < 4 or len(dn) < 4:
        return None
    cols = []
    for k in range(4):
        d, note = dn[k], ''
        m = re.match(r'^(.)〔(.+)〕$', d)
        if m:
            d, note = m.group(1), m.group(2)
        parts = []
        if tj[k]:
            parts.append('<span class="tj">%s</span>' % _html.escape(tj[k]))
        parts.append('<span class="lb">%s</span>' % _KE_HEAD[k])
        parts.append(gz(up[k], 'up'))
        parts.append(gz(d, 'dn'))
        if note:
            parts.append('<span class="nt">%s</span>' % _html.escape(note))
        cols.append('<div class="ke">%s</div>' % ''.join(parts))
    return '<div class="sike">%s</div>' % ''.join(cols)


_CHUAN = ['初传', '中传', '末传']


def _sanchuan(head, body):
    if len(head) < 2 or _clean(head[0]):
        return None
    cols = [_clean(c) for c in head[1:]]
    if '传' not in cols:
        return None
    rows = _rows(body)
    if [r[0] for r in rows][:3] != _CHUAN:
        return None
    ci = cols.index('传')
    out = []
    for lab, vals in rows[:3]:
        v = vals + [''] * len(cols)
        extra = [(cols[k], v[k]) for k in range(len(cols))
                 if k != ci and v[k] and v[k] != '—']
        out.append('<div class="cr"><span class="lb">%s</span>%s<span class="ex">%s</span></div>'
                   % (lab, gz(v[ci], 'z'),
                      _html.escape('　'.join('%s' % x[1] for x in extra))))
    return '<div class="sanchuan">%s</div>' % ''.join(out)


def _as_pan(head, body):
    for f in (_tiandi, _sike, _sanchuan):
        r = f(head, body)
        if r:
            return r
    return None


# ── 块级 ──────────────────────────────────────────────
_H = re.compile(r'^(#{1,6})\s+(.*)$')
_HR = re.compile(r'^\s*---+\s*$')
_UL = re.compile(r'^(\s*)[-*]\s+(.*)$')
_OL = re.compile(r'^(\s*)(\d+)\.\s+(.*)$')
_TSEP = re.compile(r'^\s*\|[\s:|-]+\|\s*$')


def _cells(line):
    line = line.strip()
    if line.startswith('|'):
        line = line[1:]
    if line.endswith('|'):
        line = line[:-1]
    line = line.replace('\\|', '\x00P\x00')
    return [c.strip().replace('\x00P\x00', '|') for c in line.split('|')]


def _anchor(t):
    t = re.sub(r'<[^>]+>', '', t)
    t = re.sub(r'[^\w一-鿿]+', '-', t).strip('-')
    return t or 'h'


def md2html(text, heading_offset=0, collect_headings=None):
    lines = text.replace('\r\n', '\n').split('\n')
    out = []
    i, n = 0, len(lines)
    while i < n:
        line = lines[i]
        s = line.strip()
        if not s:
            i += 1
            continue
        # 代码块（课题四柱那种预排文本）
        if s.startswith('```'):
            i += 1
            buf = []
            while i < n and not lines[i].strip().startswith('```'):
                buf.append(lines[i])
                i += 1
            i += 1
            out.append('<pre class="board">%s</pre>'
                       % _html.escape('\n'.join(buf)))
            continue
        m = _H.match(s)
        if m:
            lv = min(6, len(m.group(1)) + heading_offset)
            txt = _inline(m.group(2))
            a = _anchor(m.group(2))
            if collect_headings is not None:
                collect_headings.append((len(m.group(1)), re.sub(r'<[^>]+>', '', txt), a))
            out.append('<h%d id="%s">%s</h%d>' % (lv, a, txt, lv))
            i += 1
            continue
        if _HR.match(s):
            out.append('<hr>')
            i += 1
            continue
        if s.startswith('|'):
            head = _cells(lines[i])
            i += 1
            if i < n and _TSEP.match(lines[i]):
                i += 1
            body = []
            while i < n and lines[i].strip().startswith('|'):
                body.append(_cells(lines[i]))
                i += 1
            pan = _as_pan(head, body)
            if pan:
                out.append(pan)
                continue
            t = ['<div class="tw"><table><thead><tr>']
            t += ['<th>%s</th>' % _inline(c) for c in head]
            t.append('</tr></thead><tbody>')
            for r in body:
                tds = []
                for c in r:
                    plain = re.sub(r'<[^>]+>', '', _inline(c)).strip()
                    tds.append('<td%s>%s</td>' % (
                        ' class="nw"' if len(plain) <= 6 else '', _inline(c)))
                t.append('<tr>%s</tr>' % ''.join(tds))
            t.append('</tbody></table></div>')
            out.append(''.join(t))
            continue
        if s.startswith('>'):
            buf = []
            while i < n and lines[i].lstrip().startswith('>'):
                buf.append(re.sub(r'^\s*>\s?', '', lines[i]))
                i += 1
            inner = md2html('\n'.join(buf), heading_offset)
            j = ''.join(buf)
            cls = ('warn' if '⚠' in j else 'star' if '⭐' in j
                   else 'tip' if '💡' in j else 'cite' if '〔' in j else '')
            out.append('<blockquote%s>%s</blockquote>'
                       % ((' class="%s"' % cls) if cls else '', inner))
            continue
        if _UL.match(line) or _OL.match(line):
            ordered = bool(_OL.match(line))
            items = []
            while i < n:
                mu, mo = _UL.match(lines[i]), _OL.match(lines[i])
                if mu and not ordered:
                    items.append(mu.group(2))
                elif mo and ordered:
                    items.append(mo.group(3))
                elif lines[i].startswith(('  ', '\t')) and items and lines[i].strip():
                    items[-1] += ' ' + lines[i].strip()
                else:
                    break
                i += 1
            out.append('<%s>%s</%s>' % (
                'ol' if ordered else 'ul',
                ''.join('<li>%s</li>' % _inline(t) for t in items),
                'ol' if ordered else 'ul'))
            continue
        buf = []
        while i < n and lines[i].strip() and not re.match(
                r'^\s*(#|>|\||```|---+|[-*]\s|\d+\.\s)', lines[i]):
            buf.append(lines[i].strip())
            i += 1
        if buf:
            out.append('<p>%s</p>' % _inline(' '.join(buf)))
    return '\n'.join(out)


def strip_md(s):
    """取纯文本，供搜索与摘要用。"""
    s = re.sub(r'```.*?```', ' ', s, flags=re.S)
    s = re.sub(r'[#>*`|\-]+', ' ', s)
    s = re.sub(r'\[\[([^\]]+)\]\]', lambda m: m.group(1).split('|')[-1], s)
    return re.sub(r'\s+', ' ', s).strip()
