# -*- coding: utf-8 -*-
"""逐条回查大六壬教材引文：「」里的原文是否真的出现在所标 PDF 页上。

⭐ 三册的书内页码与 PDF 页码换算各不相同（已用章节标题核对过）：
     上册 书内 = PDF − 15      中册 书内 = PDF + 364      下册 书内 = PDF + 732
   引文标注写 〔通解上 p21｜PDF p36〕，册名决定查哪一本、用哪套换算。
⚠️ 引文常被页脚劈成两页，所以这里把每册拼成一条连续全文再定位，
   否则跨页的句子会全被误报成"全书未找到"。
用法：python3 _tools/_verify_cite.py    —— 需复核为 0 才算引文可回查。
"""
import glob
import os
import re

HERE = os.path.dirname(os.path.abspath(__file__))
OB = os.path.join(os.path.dirname(HERE), 'content')
SRC_DIR = '/private/tmp/claude-501/-Users-xiaojin/404e36e5-811f-4d03-801d-25a063f69971/scratchpad/txt'
BOOKS = {'上': ('通解_上.txt', -15), '中': ('通解_中.txt', 364), '下': ('通解_下.txt', 732)}
CJK = re.compile(r'[一-鿿]')
# ⚠️ 原书有整段是繁体（如「傳送」一节），教材统一用简体。比对前做一次繁→简归一，
#    否则那些段落会被全判成"全书未找到"。只收本书实际出现过的繁体字。
FAN = str.maketrans({
    '傳': '传', '陽': '阳', '陰': '阴', '極': '极', '將': '将', '萬': '万', '歲': '岁',
    '經': '经', '義': '义', '來': '来', '歷': '历', '類': '类', '為': '为', '無': '无',
    '學': '学', '書': '书', '見': '见', '發': '发', '動': '动', '職': '职', '貴': '贵',
    '賊': '贼', '課': '课', '傷': '伤', '氣': '气', '興': '兴', '興': '兴', '長': '长',
    '門': '门', '間': '间', '關': '关', '園': '园', '國': '国', '圓': '圆', '員': '员',
    '參': '参', '雙': '双', '藥': '药', '產': '产', '產': '产', '產': '产', '產': '产',
    '眾': '众', '會': '会', '處': '处', '實': '实', '寶': '宝', '寫': '写', '審': '审',
    '對': '对', '導': '导', '尋': '寻', '屍': '尸', '層': '层', '屬': '属', '崗': '岗',
    '嶽': '岳', '幣': '币', '幫': '帮', '歸': '归', '殺': '杀', '氣': '气', '沒': '没',
    '準': '准', '滿': '满', '漢': '汉', '潛': '潜', '燈': '灯', '爺': '爷', '爾': '尔',
    '狀': '状', '獨': '独', '獲': '获', '獻': '献', '現': '现', '產': '产', '畢': '毕',
    '當': '当', '疊': '叠', '發': '发', '監': '监', '盤': '盘', '眾': '众', '睜': '睁',
    '確': '确', '禮': '礼', '種': '种', '積': '积', '稱': '称', '窮': '穷', '節': '节',
    '簡': '简', '級': '级', '紀': '纪', '純': '纯', '細': '细', '終': '终', '結': '结',
    '絕': '绝', '統': '统', '絲': '丝', '總': '总', '線': '线', '練': '练', '縣': '县',
    '織': '织', '繼': '继', '續': '续', '罷': '罢', '義': '义', '習': '习', '聲': '声',
    '聯': '联', '聰': '聪', '職': '职', '聽': '听', '肅': '肃', '脹': '胀', '腦': '脑',
    '臉': '脸', '興': '兴', '舉': '举', '舊': '旧', '藝': '艺', '蓋': '盖', '處': '处',
    '號': '号', '虧': '亏', '術': '术', '衛': '卫', '衝': '冲', '複': '复', '見': '见',
    '規': '规', '視': '视', '親': '亲', '覺': '觉', '觀': '观', '訊': '讯', '記': '记',
    '討': '讨', '訓': '训', '議': '议', '訪': '访', '設': '设', '許': '许', '訴': '诉',
    '診': '诊', '註': '注', '証': '证', '詞': '词', '試': '试', '詩': '诗', '話': '话',
    '該': '该', '詳': '详', '認': '认', '語': '语', '誠': '诚', '說': '说', '課': '课',
    '調': '调', '談': '谈', '請': '请', '論': '论', '諸': '诸', '謂': '谓', '講': '讲',
    '謝': '谢', '識': '识', '譯': '译', '護': '护', '讀': '读', '變': '变', '讓': '让',
    '財': '财', '責': '责', '貨': '货', '貧': '贫', '買': '买', '賣': '卖', '質': '质',
    '賴': '赖', '贈': '赠', '贊': '赞', '趕': '赶', '車': '车', '軍': '军', '轉': '转',
    '農': '农', '運': '运', '過': '过', '達': '达', '違': '违', '遠': '远', '適': '适',
    '選': '选', '遺': '遗', '還': '还', '邊': '边', '郵': '邮', '鄉': '乡', '醫': '医',
    '釋': '释', '針': '针', '鋼': '钢', '錄': '录', '錢': '钱', '鍾': '钟', '鐵': '铁',
    '開': '开', '閉': '闭', '陣': '阵', '陰': '阴', '陳': '陈', '險': '险', '隱': '隐',
    '雜': '杂', '雞': '鸡', '難': '难', '電': '电', '靈': '灵', '韓': '韩', '順': '顺',
    '須': '须', '頭': '头', '題': '题', '風': '风', '飛': '飞', '養': '养', '馬': '马',
    '駕': '驾', '驗': '验', '體': '体', '髮': '发', '鬥': '斗', '魯': '鲁', '鳥': '鸟',
    '麗': '丽', '點': '点', '齊': '齐', '龍': '龙', '龜': '龟',
})


def norm(s):
    return ''.join(c for c in s.translate(FAN) if CJK.match(c))


def load(fn):
    """→ (全文, {页: (起, 止)})"""
    pages, cur = {}, None
    for ln in open(os.path.join(SRC_DIR, fn), encoding='utf-8').read().split('\n'):
        m = re.match(r'^第 (\d+) 页$', ln.strip())
        if m:
            cur = int(m.group(1))
            pages.setdefault(cur, [])
            continue
        if cur is not None:
            # ⚠️ 页眉会被夹进跨页引文里，把连续的原文劈断（"…一般贵人" + "大六壬通解" + "六月以前见…"）。
            #    这类整行页眉不是正文，扫描时丢掉。
            if ln.strip() in ('大六壬通解', '叶飘然大六壬讲义'):
                continue
            pages.setdefault(cur, []).append(ln)
    full, span = '', {}
    for p in sorted(pages):
        t = norm(''.join(pages[p]))
        span[p] = (len(full), len(full) + len(t))
        full += t
    return full, span


BOOK = {}
for k, (fn, off) in BOOKS.items():
    if os.path.exists(os.path.join(SRC_DIR, fn)):
        BOOK[k] = load(fn) + (off,)
    else:
        print('  ⚠️ 缺少原文：%s（该册的引文将跳过）' % fn)

CITE = re.compile(r'〔通解([上中下]) p([\d\-]+)｜PDF p([\d\-]+)〕')


def find_pages(book, ns):
    full, span, _ = BOOK[book]
    out, i = [], full.find(ns)
    while i >= 0 and len(out) < 6:
        out.append(tuple(p for p in span if span[p][0] < i + len(ns) and i < span[p][1]))
        i = full.find(ns, i + 1)
    return out


bad, ok, total, untraced, skipped = [], 0, 0, [], 0
for f in sorted(glob.glob(os.path.join(OB, '*.md'))):
    lines = open(f, encoding='utf-8').read().split('\n')
    # 引文承载单元有两种：① > 引用块；② 表格块（出处常在整张表下方的一行里）
    # ⚠️ 只查 > 块会漏掉表格里的引文——第 8、9 课的骨架表整表都是引文，曾经完全没被核过。
    buf, start, blks = [], 0, []
    for i, ln in enumerate(lines):
        if ln.startswith('>'):
            if not buf:
                start = i + 1
            buf.append(ln)
        else:
            if buf:
                blks.append((start, ''.join(buf)))
                buf = []
    if buf:
        blks.append((start, ''.join(buf)))
    tb, tstart = [], 0
    for i, ln in enumerate(lines + ['']):
        if ln.startswith('|'):
            if not tb:
                tstart = i + 1
            tb.append(ln)
        elif tb:
            tail = ' '.join(lines[i:i + 3])          # 表下三行内找出处
            blk = ''.join(tb) + tail
            if '「' in blk and CITE.search(blk):
                blks.append((tstart, blk))
            tb = []
    for start, text in blks:
        if '出处标注' in text:      # 教材说明行，不是引文
            continue
        segs, last = [], 0
        for m in CITE.finditer(text):
            segs.append((text[last:m.end()], m.group(1), m.group(2), m.group(3)))
            last = m.end()
        for seg, book, inner, pdfpg in segs:
            total += 1
            if book not in BOOK:
                skipped += 1
                continue
            # 顺手核对两个页码的换算关系对不对
            off = BOOK[book][2]
            a = [int(x) for x in inner.split('-')]
            b = [int(x) for x in pdfpg.split('-')]
            if a[0] != b[0] + off:
                bad.append((os.path.basename(f), start,
                            [('页码换算不符：书内 p%s 应为 PDF p%s' % (a[0], a[0] - off), [])], pdfpg))
                continue
            rng = list(range(b[0], b[-1] + 1))
            frags = re.findall(r'「([^」]{6,})」', seg)
            if not frags:
                untraced.append((os.path.basename(f), start, book, pdfpg))
                continue
            problems = []
            for q in frags:
                for s_ in re.split(r'…+', q):
                    ns = norm(s_)
                    if len(ns) < 8:
                        continue
                    hits = find_pages(book, ns)
                    if any(set(h) & set(rng) for h in hits):
                        continue
                    problems.append((s_[:26], [list(h) for h in hits]))
            if problems:
                bad.append((os.path.basename(f), start, problems, pdfpg))
            else:
                ok += 1

print('引文条目 %d：命中 %d，需复核 %d，转述未加引号 %d%s'
      % (total, ok, len(bad), len(untraced),
         ('，缺原文跳过 %d' % skipped) if skipped else ''))
for b in bad:
    print('-' * 58)
    print('%s 行%s  标注 PDF p%s' % (b[0], b[1], b[3]))
    for s_, where in b[2]:
        print('    x %s…  实际在 PDF页 %s' % (s_, where if where else '全书未找到'))
for u in untraced:
    print('  · 转述(无「」)，页码需人工确认：%s 行%s 通解%s PDF p%s' % u)
