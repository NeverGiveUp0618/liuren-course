# -*- coding: utf-8 -*-
"""扫《通解》下册「历代六壬课例」570 例，抽出做题库要的四样：日干支／月将／占时／原书三传。

    python3 _tools/_xia_scan.py            # 全书概况
    python3 _tools/_xia_scan.py 六 疾病     # 只看某一章，逐例列参数

⭐ 为什么要有它：下册每例平均只有 507 字，参数散在标题行里，且 OCR 有固定讹字
   （**戊→戌、已→巳**，将/时顺序也常颠倒）。抽完必须拿**起课引擎复算的三传**与
   原书自述的三传交叉验证，验过的才能进题库——盘错了，整例的断法就全废。
   验证方式见 _tools/_xia_check.js（本脚本 --check 会调它）。

⚠️ 抽不到月将时，可用「正亥二戌三酉四申五未六午七巳八辰九卯十寅冬丑腊子」按农历月补，
   **但必须用三传或正文内证印证**（例30 原书记三月本该酉将，正文「日上河魁」却坐实
   是戌将戌时的伏吟）。印证不了的，宁可不复算盘，照录原文即可。
"""
import io, re, json, sys

REF = "/Users/xiaojin/Documents/文稿同步文件夹/03_学习 (Learning)/Seafile/学习资料/自创项目/liuren-course/_ref/通解_下.txt"
G = "甲乙丙丁戊己庚辛壬癸"; Z = "子丑寅卯辰巳午未申酉戌亥"
JIANG = {'登明':'亥','河魁':'戌','从魁':'酉','传送':'申','小吉':'未','胜光':'午',
         '太乙':'巳','天罡':'辰','太冲':'卯','功曹':'寅','大吉':'丑','神后':'子'}
CHAPS = ['五 胎产','六 疾病','七 失盗','八 出行、行人','九 考试','十 事业前程','十一 官司牢狱',
         '十二 出差','十三 信息、谋为','十四 战争','十五 躲避','十六 终身','十七 经济财物','十八 射覆与应侯杂占']

s = io.open(REF, encoding='utf-8').read()
# 页码位置表
pages = [(m.start(), int(m.group(1))) for m in re.finditer(r'(?m)^第 (\d+) 页$', s)]
def page_of(pos):
    p = 0
    for st, n in pages:
        if st <= pos: p = n
        else: break
    return p
# 章位置
chpos = [(m.start(), m.group(1)) for m in re.finditer(r'(?m)^(' + '|'.join(map(re.escape, CHAPS)) + r')\s*$', s)]
def chap_of(pos):
    c = '?'
    for st, n in chpos:
        if st <= pos: c = n
        else: break
    return c

starts = [m.start() for m in re.finditer(r'(?m)^例[一二三四五六七八九十百零〇\d]+[：:]', s)]
items = []
for i, st in enumerate(starts):
    end = starts[i+1] if i+1 < len(starts) else len(s)
    body = s[st:end]
    head = body.split('\n')[0]
    # OCR 讹字：戊将→戌将；已将→巳将（"将"字前一字）
    h = re.sub(r'戊(?=将)', '戌', head)
    h = re.sub(r'已(?=将)', '巳', h)
    h = re.sub(r'(?<=时)戊(?=将)', '戌', h)
    h = re.sub(r'已时', '巳时', h)
    # 日干支
    days = re.findall(r'([' + G + r'])([' + Z + r'])日', h) or re.findall(r'([' + G + r'])([' + Z + r'])(?=[卯辰巳午未申酉戌亥子丑寅]将)', h)
    rgz = ''.join(days[-1]) if days else None
    # 月将 / 占时
    yj = zs = None
    m = re.search(r'([' + Z + r'])将([' + Z + r'])时', h)
    if m: yj, zs = m.group(1), m.group(2)
    if not yj:
        m = re.search(r'([' + Z + r'])时([' + Z + r'])将', h)          # 顺序颠倒
        if m: zs, yj = m.group(1), m.group(2)
    if not yj:
        m = re.search(r'(?:月将)?(' + '|'.join(JIANG) + r')加([' + Z + r'])', h)
        if m: yj, zs = JIANG[m.group(1)], m.group(2)
    if not yj:
        m = re.search(r'月将([' + Z + r'])加([' + Z + r'])', h)
        if m: yj, zs = m.group(1), m.group(2)
    if not yj:
        m = re.search(r'([' + Z + r'])将', h)
        if m: yj = m.group(1)
    if not zs:
        m = re.search(r'([' + Z + r'])时', h)
        if m: zs = m.group(1)
    if not yj:
        m = re.search(r'月将(' + '|'.join(JIANG) + r')', h)
        if m: yj = JIANG[m.group(1)]
    # 原书三传（六亲 遁干+支 天将）
    tri = re.findall(r'([兄子父财官鬼孙弟母])\s*([' + G + r'])\s*([' + Z + r'])\s*([贵蛇朱合勾青空虎常玄阴后])', body)
    sc = [t[2] for t in tri[:3]]
    items.append(dict(n=i+1, chap=chap_of(st), page=page_of(st), head=head.strip(),
                      rgz=rgz, yj=yj, zs=zs, sc=sc, dun=[t[1] for t in tri[:3]],
                      body_len=len(body)))
json.dump(items, io.open('params.json','w',encoding='utf-8'), ensure_ascii=False, indent=1)
print('解析', len(items), '例')
from collections import Counter
c = Counter()
for it in items:
    c['有日干支' if it['rgz'] else '缺日干支'] += 1
    c['有将时' if (it['yj'] and it['zs']) else ('只有将' if it['yj'] else ('只有时' if it['zs'] else '将时全无'))] += 1
    c['有三传' if len(it['sc'])==3 else '无三传'] += 1
for k,v in c.most_common(): print(f'  {k:10} {v}')
