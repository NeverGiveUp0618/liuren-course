# -*- coding: utf-8 -*-
"""全量内容质检：结构 / 领域断言 / 交叉引用 三层机检。

⚠️⚠️ **一切验算必须用六壬本体系的口径**，不能拿别的术数或通用常识当基准
     ——那样会造出几十条假警报，反而淹没真问题。本文件顶部的基准表就是这套口径，
     全部来自《大六壬通解》正文（每张表都标了出处），改这里等于改判据，务必谨慎。

⭐ 报出来的**不一定是错**（正文常有"某说""存疑""反例"），逐条人工判读，
   绝不照单全改。最灵的信号是**同一件事在两处说法不一致**。

用法：
    python3 _tools/_audit_content.py            全量体检
    python3 _tools/_audit_content.py --selftest 自检：喂坏数据，必须报得出来
"""
import glob
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
CONTENT = os.path.join(os.path.dirname(HERE), 'content')

# ── 基准表（六壬本体系口径，出处见注） ─────────────────────────
Z = list('子丑寅卯辰巳午未申酉戌亥')
G = list('甲乙丙丁戊己庚辛壬癸')
JI = {'甲': '寅', '乙': '辰', '丙': '巳', '丁': '未', '戊': '巳',
      '己': '未', '庚': '申', '辛': '戌', '壬': '亥', '癸': '丑'}      # 寄宫〔通解上 p24〕
GR_D = {'甲': '丑', '戊': '丑', '庚': '丑', '乙': '子', '己': '子',
        '丙': '亥', '丁': '亥', '辛': '午', '壬': '巳', '癸': '巳'}     # 昼贵〔通解上 p22〕
GR_N = {'甲': '未', '戊': '未', '庚': '未', '乙': '申', '己': '申',
        '丙': '酉', '丁': '酉', '辛': '寅', '壬': '卯', '癸': '卯'}     # 夜贵
YUEJIANG = {'正': '亥', '二': '戌', '三': '酉', '四': '申', '五': '未', '六': '午',
            '七': '巳', '八': '辰', '九': '卯', '十': '寅', '十一': '丑', '十二': '子'}
SHEN = {'子': '神后', '丑': '大吉', '寅': '功曹', '卯': '太冲', '辰': '天罡', '巳': '太乙',
        '午': '胜光', '未': '小吉', '申': '传送', '酉': '从魁', '戌': '河魁', '亥': '登明'}
WX = {'子': '水', '亥': '水', '寅': '木', '卯': '木', '巳': '火', '午': '火',
      '申': '金', '酉': '金', '丑': '土', '辰': '土', '未': '土', '戌': '土',
      '甲': '木', '乙': '木', '丙': '火', '丁': '火', '戊': '土', '己': '土',
      '庚': '金', '辛': '金', '壬': '水', '癸': '水'}
KE = {'水': '火', '火': '金', '金': '木', '木': '土', '土': '水'}
SHENG = {'金': '水', '水': '木', '木': '火', '火': '土', '土': '金'}
LIUHE = {'子': '丑', '丑': '子', '寅': '亥', '亥': '寅', '卯': '戌', '戌': '卯',
         '辰': '酉', '酉': '辰', '巳': '申', '申': '巳', '午': '未', '未': '午'}
CHONG = {z: Z[(i + 6) % 12] for i, z in enumerate(Z)}
HAI = {'子': '未', '未': '子', '丑': '午', '午': '丑', '寅': '巳', '巳': '寅',
       '卯': '辰', '辰': '卯', '申': '亥', '亥': '申', '酉': '戌', '戌': '酉'}
PO = {'子': '酉', '酉': '子', '丑': '辰', '辰': '丑', '寅': '亥', '亥': '寅',
      '卯': '午', '午': '卯', '巳': '申', '申': '巳', '未': '戌', '戌': '未'}
XING = {'寅': '巳', '巳': '申', '申': '寅', '丑': '戌', '戌': '未', '未': '丑',
        '子': '卯', '卯': '子', '辰': '辰', '午': '午', '酉': '酉', '亥': '亥'}
MA = {'申': '寅', '子': '寅', '辰': '寅', '巳': '亥', '酉': '亥', '丑': '亥',
      '亥': '巳', '卯': '巳', '未': '巳', '寅': '申', '午': '申', '戌': '申'}
MU5 = {'木': '未', '火': '戌', '金': '丑', '水': '辰', '土': '辰'}          # 五行墓〔通解上 p66〕
XUN_KONG = {'甲子': ('戌', '亥'), '甲戌': ('申', '酉'), '甲申': ('午', '未'),
            '甲午': ('辰', '巳'), '甲辰': ('寅', '卯'), '甲寅': ('子', '丑')}
TJ_GZ = {'贵人': '己丑', '螣蛇': '丁巳', '朱雀': '丙午', '六合': '乙卯', '勾陈': '戊辰',
         '青龙': '甲寅', '天空': '戊戌', '白虎': '庚申', '太常': '己未', '玄武': '壬子',
         '太阴': '辛酉', '天后': '癸亥'}
TJ_ORDER = ['贵', '蛇', '朱', '合', '勾', '青', '空', '虎', '常', '玄', '阴', '后']
LU = {'甲': '寅', '乙': '卯', '丙': '巳', '丁': '午', '戊': '巳',
      '己': '午', '庚': '申', '辛': '酉', '壬': '亥', '癸': '子'}          # 日禄〔通解上 p76〕

hits = []


def flag(kind, f, ln, msg, sev='?'):
    hits.append((sev, kind, os.path.basename(f), ln, msg))


def jiazi_xun(gz):
    """干支 → 所属旬首"""
    gi, zi = G.index(gz[0]), Z.index(gz[1])
    for head in XUN_KONG:
        hg, hz = G.index(head[0]), Z.index(head[1])
        if (zi - hz) % 12 == (gi - hg) % 10 and (zi - hz) % 12 < 10:
            return head
    return None


# ── 各项检查 ───────────────────────────────────────────
def check_line(f, i, s):
    # ① 寄宫
    for m in re.finditer(r'([甲乙丙丁戊己庚辛壬癸])寄(?:宫在|于|)([子丑寅卯辰巳午未申酉戌亥])', s):
        if JI[m.group(1)] != m.group(2):
            flag('寄宫', f, i, '%s寄%s（本体系应为 %s）' % (m.group(1), m.group(2), JI[m.group(1)]), '!')
    # ② 昼夜贵
    for m in re.finditer(r'([甲乙丙丁戊己庚辛壬癸])日(?:的|)(昼|夜|阳|阴)贵(?:人|)(?:为|是|)\s*\*{0,2}([子丑寅卯辰巳午未申酉戌亥])', s):
        gan, kind, zhi = m.group(1), m.group(2), m.group(3)
        exp = GR_D[gan] if kind in '昼阳' else GR_N[gan]
        if exp != zhi:
            flag('贵人', f, i, '%s日%s贵作%s（应为 %s）' % (gan, kind, zhi, exp), '!')
    # ③ 支神名
    for m in re.finditer(r'([子丑寅卯辰巳午未申酉戌亥])(登明|河魁|从魁|传送|小吉|胜光|太乙|天罡|太冲|功曹|大吉|神后)', s):
        if SHEN[m.group(1)] != m.group(2):
            flag('支神名', f, i, '%s＝%s（应为 %s）' % (m.group(1), m.group(2), SHEN[m.group(1)]), '!')
    # ⚠️ 必须要求有「＝／为／即」，否则「甄轮太冲申上行」这类歌诀会被当成"太冲＝申"
    for m in re.finditer(r'(登明|河魁|从魁|传送|小吉|胜光|太乙|天罡|太冲|功曹|大吉|神后)(?:＝|为|即)([子丑寅卯辰巳午未申酉戌亥])', s):
        inv = {v: k for k, v in SHEN.items()}
        if inv[m.group(1)] != m.group(2):
            flag('支神名', f, i, '%s＝%s（应为 %s）' % (m.group(1), m.group(2), inv[m.group(1)]), '!')
    # ④ 生克断言："X木克Y土" / "X水生Y木"
    for m in re.finditer(r'([子丑寅卯辰巳午未申酉戌亥甲乙丙丁戊己庚辛壬癸])(木|火|土|金|水)(克|生)'
                         r'([子丑寅卯辰巳午未申酉戌亥甲乙丙丁戊己庚辛壬癸])(木|火|土|金|水)', s):
        a, wa, act, b, wb = m.groups()
        if WX[a] != wa:
            flag('五行', f, i, '%s标为%s（应为%s）' % (a, wa, WX[a]), '!')
        elif WX[b] != wb:
            flag('五行', f, i, '%s标为%s（应为%s）' % (b, wb, WX[b]), '!')
        elif act == '克' and KE[wa] != wb:
            flag('生克', f, i, '%s%s克%s%s（%s克的是%s）' % (a, wa, b, wb, wa, KE[wa]), '!')
        elif act == '生' and SHENG[wa] != wb:
            flag('生克', f, i, '%s%s生%s%s（%s生的是%s）' % (a, wa, b, wb, wa, SHENG[wa]), '!')
    # ⑤ 六合／六冲／六害／六破／刑
    SANHE = [set('亥卯未'), set('寅午戌'), set('巳酉丑'), set('申子辰')]
    for pat, tbl, name in ((r'([子丑寅卯辰巳午未申酉戌亥])([子丑寅卯辰巳午未申酉戌亥])(?:相|)合', LIUHE, '六合'),
                           (r'([子丑寅卯辰巳午未申酉戌亥])([子丑寅卯辰巳午未申酉戌亥])(?:相|)冲', CHONG, '六冲'),
                           (r'([子丑寅卯辰巳午未申酉戌亥])([子丑寅卯辰巳午未申酉戌亥])(?:相|)破', PO, '六破'),
                           (r'([子丑寅卯辰巳午未申酉戌亥])刑([子丑寅卯辰巳午未申酉戌亥])', XING, '三刑')):
        for m in re.finditer(pat, s):
            a, b = m.group(1), m.group(2)
            # ⚠️ 「巳酉丑三合之金」里的"酉丑…合"不是六合，跳过三合局内的两支
            if name == '六合' and any({a, b} <= h for h in SANHE):
                continue
            if tbl.get(a) != b:
                flag(name, f, i, '%s%s（%s的%s是%s）' % (a, b, a, name, tbl.get(a)), '?')
    # ⑥ 驿马
    for m in re.finditer(r'([子丑寅卯辰巳午未申酉戌亥])(?:日|)(?:马|驿马)(?:在|居)([子丑寅卯辰巳午未申酉戌亥])', s):
        if MA[m.group(1)] != m.group(2):
            flag('驿马', f, i, '%s马在%s（应为 %s）' % (m.group(1), m.group(2), MA[m.group(1)]), '!')
    # ⑦ 旬空
    for m in re.finditer(r'(甲[子戌申午辰寅])旬(?:中|)(?:空|空亡)?([子丑寅卯辰巳午未申酉戌亥])[、，]?([子丑寅卯辰巳午未申酉戌亥])?空', s):
        exp = XUN_KONG[m.group(1)]
        got = tuple(x for x in (m.group(2), m.group(3)) if x)
        if len(got) == 2 and set(got) != set(exp):
            flag('旬空', f, i, '%s旬空%s（应为 %s）' % (m.group(1), ''.join(got), ''.join(exp)), '!')
    # ⑧ 某日属某旬
    for m in re.finditer(r'([甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥])日(?:，|)?属(甲[子戌申午辰寅])旬', s):
        exp = jiazi_xun(m.group(1))
        if exp != m.group(2):
            flag('旬', f, i, '%s日属%s旬（应属 %s旬）' % (m.group(1), m.group(2), exp), '!')
    # ⑨ 天将配干支
    for m in re.finditer(r'(贵人|螣蛇|朱雀|六合|勾陈|青龙|天空|白虎|太常|玄武|太阴|天后)'
                         r'[^。，、｜|]{0,4}?([甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥])', s):
        after = s[m.end(2):m.end(2) + 1]
        if m.group(2) != TJ_GZ[m.group(1)] and (m.start(2) - m.end(1)) <= 2 and after != '日':
            flag('天将配干支', f, i, '%s配%s（应为 %s）' % (m.group(1), m.group(2), TJ_GZ[m.group(1)]), '?')
    # ⑩ 日禄
    for m in re.finditer(r'([甲乙丙丁戊己庚辛壬癸])禄(?:在|)([子丑寅卯辰巳午未申酉戌亥])', s):
        if LU[m.group(1)] != m.group(2):
            flag('日禄', f, i, '%s禄%s（应为 %s）' % (m.group(1), m.group(2), LU[m.group(1)]), '!')
    # ⑪ 五行墓
    for m in re.finditer(r'([子丑寅卯辰巳午未申酉戌亥])(?:为|＝)(木|火|金|水|水土|土)墓', s):
        w = m.group(2).replace('水土', '水')
        if MU5[w] != m.group(1):
            flag('五行墓', f, i, '%s为%s墓（%s墓在 %s）' % (m.group(1), m.group(2), w, MU5[w]), '!')


def check_structure(f, text):
    lines = text.split('\n')
    # 标题层级不跳级
    lv = 0
    for i, ln in enumerate(lines, 1):
        m = re.match(r'^(#{1,6}) ', ln)
        if m:
            n = len(m.group(1))
            if lv and n > lv + 1:
                flag('标题跳级', f, i, 'h%d 直接跳到 h%d' % (lv, n), '?')
            lv = n
    # 表格列数配平
    tbl, start = [], 0
    for i, ln in enumerate(lines + [''], 1):
        if ln.startswith('|'):
            if not tbl:
                start = i
            tbl.append((i, ln.count('|')))
        elif tbl:
            widths = {w for _, w in tbl if not re.match(r'^\|[\s:|-]+\|$', lines[_ - 1])}
            if len(widths) > 1:
                flag('表格列数', f, start, '同一张表列数不一致：%s' % sorted(widths), '!')
            tbl = []
    # 引文块必须带出处。⚠️ 按整个 > 块判断——多行引文的出处在块末，逐行看会大量假报。
    buf, start = [], 0
    for i, ln in enumerate(lines + [''], 1):
        if ln.startswith('>'):
            if not buf:
                start = i
            buf.append(ln)
        elif buf:
            blk = ''.join(buf)
            # 块内写明「第N课」＝跨课回顾的二次引用，来源已交代；〔存疑〕/略去 是校勘说明
            # ⚠️ 出处不止《通解》：2026-08-30 迁进来的毕法赋（〔大全三·第N法〕）
            #    与六十四课经（〔讲义 pN〕/〔讲义·课目总歌〕）都是合法出处，
            #    只认「〔通解」会把这两批全判成缺出处（曾一次误报 40+ 条）。
            traced = any(k in blk for k in ('〔通解', '〔讲义', '〔大全', '出处标注',
                                            '〔存疑〕', '略去')) \
                or re.search(r'第 ?\d+ ?课', blk)
            # ⭐/💡 开头是**我写的提示块**，〔订正〕是校勘说明，题库开头的 **这是什么** 是导言——
            #    这三类里的「」是术语或复述，本来就不该有出处。以前它们占了误报的 12/14。
            # ⚠️ 「盘面对应」「一句话」也是**我写的**提示块（2026-08-30 迁入时加的），
            #    里面的「」是强调用法不是引文，不该要求出处。
            hint = re.match(r'>?\s*(⭐|💡|〔订正〕|〔已核原书〕|〔存疑〕|\*\*这是什么\*\*'
                            r'|\*\*和 |\*\*盘面对应\*\*|\*\*一句话\*\*|⚠️)', blk.lstrip('> '))
            if hint: traced = True
            if '「' in blk and '」' in blk and not traced:
                flag('引文无出处', f, start, blk.strip()[:44], '?')
            buf = []


def check_pan_vs_text(f, text):
    """正文里说的「X加Y」「X乘某将」，与本课那张盘对不对得上。
    ⚠️ 只验"整课只有一张盘"的课；自测与答案区里常另起别的盘，跳过。"""
    lines = text.split('\n')
    cut = len(lines)
    for i, ln in enumerate(lines):
        if re.match(r'^## .*自测', ln):
            cut = i
            break
    pans = []
    for i, ln in enumerate(lines):
        c = [x.replace('*', '').strip() for x in ln.strip().strip('|').split('|')]
        if ln.startswith('|') and c and c[0] == '地盘' and len(c) == 13:
            order, rows = c[1:], {}
            for j in range(i + 1, min(i + 4, len(lines))):
                r = [x.replace('*', '').strip() for x in lines[j].strip().strip('|').split('|')]
                if len(r) == 13 and r[0] in ('天盘', '天将'):
                    rows[r[0]] = r[1:]
            if '天盘' in rows:
                pans.append((dict(zip(order, rows['天盘'])),
                             dict(zip(order, rows.get('天将', [''] * 12)))))
    if len(pans) != 1:
        return
    tp, tj = pans[0]
    inv = {v: k for k, v in tp.items()}
    tjz = {z: tj.get(d, '') for d, z in tp.items()}
    full = {'贵': '贵人', '蛇': '螣蛇', '朱': '朱雀', '合': '六合', '勾': '勾陈', '青': '青龙',
            '空': '天空', '虎': '白虎', '常': '太常', '玄': '玄武', '阴': '太阴', '后': '天后'}
    for i, ln in enumerate(lines[:cut], 1):
        if ln.startswith('|'):
            continue
        for m in re.finditer(r'([子丑寅卯辰巳午未申酉戌亥])加([子丑寅卯辰巳午未申酉戌亥])', ln):
            if inv.get(m.group(1)) != m.group(2):
                flag('正文对不上盘', f, i, '「%s加%s」——盘上 %s 临 %s'
                     % (m.group(1), m.group(2), m.group(1), inv.get(m.group(1))), '!')
        for m in re.finditer(r'([子丑寅卯辰巳午未申酉戌亥])乘(贵人|螣蛇|朱雀|六合|勾陈|青龙|天空|白虎|太常|玄武|太阴|天后)', ln):
            got = full.get(tjz.get(m.group(1), ''), '')
            if got and got != m.group(2):
                flag('正文对不上盘', f, i, '「%s乘%s」——盘上乘 %s' % (m.group(1), m.group(2), got), '!')


def check_cross(files):
    names = {os.path.basename(p)[:-3] for p in files}
    for p in files:
        text = open(p, encoding='utf-8').read()
        base = os.path.basename(p)
        for i, ln in enumerate(text.split('\n'), 1):
            for m in re.finditer(r'\[\[([^\]]+)\]\]', ln):
                t = m.group(1).split('|')[0]
                if t not in names:
                    flag('死链', p, i, '[[%s]] 没有对应文件' % t, '!')
        # 「下一课」必须指向 N+1
        m = re.match(r'^(\d\d)-', base)
        if m and '下一课' in text:
            nxt = '%02d-' % (int(m.group(1)) + 1)
            seg = text[text.rindex('下一课'):]
            link = re.search(r'\[\[(\d\d)-', seg)
            if link and not seg.startswith('下一课**：[[' + nxt) and link.group(1) != '%02d' % (int(m.group(1)) + 1):
                flag('下一课', p, 0, '下一课指向 %s（应为 %s）' % (link.group(1), nxt[:2]), '!')


def run(paths=None):
    files = sorted(paths or glob.glob(os.path.join(CONTENT, '*.md')))
    for p in files:
        text = open(p, encoding='utf-8').read()
        check_structure(p, text)
        check_pan_vs_text(p, text)
        for i, ln in enumerate(text.split('\n'), 1):
            check_line(p, i, ln)
    check_cross(files)
    return files


if __name__ == '__main__':
    if '--selftest' in sys.argv:
        import tempfile
        bad = """# 第9课 · 测试
> 前置
甲寄辰，丙日昼贵为丑，子木克午火，寅刑亥，申马在午。
丙申日属甲子旬，甲禄在卯，未为火墓，亥登明与戌从魁。
| a | b |
|---|---|
| 1 | 2 | 3 |
> 「无出处的引文」
见 [[99-不存在的课]]
"""
        d = tempfile.mkdtemp()
        p = os.path.join(d, '09-selftest.md')
        open(p, 'w', encoding='utf-8').write(bad)
        hits.clear()
        run([p])
        kinds = {h[1] for h in hits}
        need = {'寄宫', '贵人', '五行', '三刑', '驿马', '旬', '日禄', '五行墓', '支神名', '表格列数', '引文无出处', '死链'}
        miss = need - kinds
        print('自检：喂 %d 类坏数据，报出 %d 条' % (len(need), len(hits)))
        for h in sorted(hits):
            print('   ', h[1], '|', h[4])
        print(('✗ 这几类没报出来：%s' % sorted(miss)) if miss else '✓ 全部报出，脚本有效')
        sys.exit(1 if miss else 0)

    files = run()
    print('全量体检：扫了 %d 个文件' % len(files))
    if not hits:
        print('\n✓ 没有发现问题')
        sys.exit(0)
    print('\n共 %d 条待人工判读（! ＝很可能是错，? ＝需要看上下文）：\n' % len(hits))
    for sev, kind, fn, ln, msg in sorted(hits, key=lambda x: (x[0], x[1])):
        print('  %s [%s] %s:%s  %s' % (sev, kind, fn[:20], ln, msg))
