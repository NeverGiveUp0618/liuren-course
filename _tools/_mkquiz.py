# -*- coding: utf-8 -*-
"""把 liuren-game 的 126 个课例转成课程站的 99-课例题库.md。
盘只保留原书给的四样（日干支／月将／占时／三传），其余**全部复算**——
这样盘必然自洽，_audit_pan.py 扫过去不会报，也不用信 game 里可能手抄错的天将。"""
import json, re, sys

Z = list("子丑寅卯辰巳午未申酉戌亥")
G = list("甲乙丙丁戊己庚辛壬癸")
TJ = ["贵","蛇","朱","合","勾","青","空","虎","常","玄","阴","后"]
TJ_FULL = {"贵":"贵人","蛇":"螣蛇","朱":"朱雀","合":"六合","勾":"勾陈","青":"青龙",
           "空":"天空","虎":"白虎","常":"太常","玄":"玄武","阴":"太阴","后":"天后"}
GR_D = {"甲":"丑","戊":"丑","庚":"丑","乙":"子","己":"子","丙":"亥","丁":"亥","辛":"午","壬":"巳","癸":"巳"}
GR_N = {"甲":"未","戊":"未","庚":"未","乙":"申","己":"申","丙":"酉","丁":"酉","辛":"寅","壬":"卯","癸":"卯"}
ZHOU = set("卯辰巳午未申")           # 昼时
JI = {"甲":"寅","乙":"辰","丙":"巳","戊":"巳","丁":"未","己":"未","庚":"申","辛":"戌","壬":"亥","癸":"丑"}
WX = {"子":"水","亥":"水","寅":"木","卯":"木","巳":"火","午":"火","申":"金","酉":"金",
      "丑":"土","辰":"土","未":"土","戌":"土"}
WXG = {"甲":"木","乙":"木","丙":"火","丁":"火","戊":"土","己":"土","庚":"金","辛":"金","壬":"水","癸":"水"}
KE = {"水":"火","火":"金","金":"木","木":"土","土":"水"}
SHENG = {"水":"木","木":"火","火":"土","土":"金","金":"水"}

def tianpan(yj, zs):
    off = (Z.index(yj) - Z.index(zs)) % 12
    return {d: Z[(Z.index(d) + off) % 12] for d in Z}      # 地盘 -> 天盘

def tjiang(gan, shi, t):
    """返回 (地盘->天将, 贵人支, 顺逆)。⚠️ 昼夜以**占时**分，卯…申为昼。"""
    gr = GR_D[gan] if shi in ZHOU else GR_N[gan]
    dp = [d for d in Z if t[d] == gr][0]                    # 贵人所临地盘位
    shun = dp in "亥子丑寅卯辰"
    out = {}
    for i, nm in enumerate(TJ):
        z = Z[(Z.index(gr) + (i if shun else -i)) % 12]     # 天盘支
        out[[k for k in Z if t[k] == z][0]] = nm
    return out, gr, shun

def xun(rgz):
    """日干支所在旬 -> (旬首干支, 空亡两支, 支->遁干)"""
    gi, zi = G.index(rgz[0]), Z.index(rgz[1])
    n = [k for k in range(60) if G[k % 10] == rgz[0] and Z[k % 12] == rgz[1]][0]
    head = n - (n % 10)                                      # 旬首在六十甲子里的序号
    kong = [Z[(head + 10) % 12], Z[(head + 11) % 12]]
    dun = {Z[(head + i) % 12]: G[i] for i in range(10)}      # 旬内十支各配天干
    return G[head % 10] + Z[head % 12], kong, dun

def liuqin(gan, zhi):
    a, b = WXG[gan], WX[zhi]
    if a == b: return "兄弟"
    if SHENG[b] == a: return "父母"
    if SHENG[a] == b: return "子孙"
    if KE[a] == b: return "妻财"
    return "官鬼"

def build(c):
    rgz, yj, zs, sc = c["r"], c["yj"], c["zs"], c["sc"]
    gan, zhi = rgz[0], rgz[1]
    t = tianpan(yj, zs)
    tjm, gr, shun = tjiang(gan, zs, t)
    xh, kong, dun = xun(rgz)
    # 四课：一课 干上、二课 一课上神之上、三课 支上、四课 三课上神之上
    k1 = t[JI[gan]]; k2 = t[k1]; k3 = t[zhi]; k4 = t[k3]
    sk = [(gan + "〔日干，寄" + JI[gan] + "〕", k1), (k1, k2),
          (zhi + "〔日支〕", k3), (k3, k4)]
    # 天将挂在**天盘支**上，四课上神与三传都按上神取将
    z2j = {t[d]: tjm[d] for d in Z}
    return dict(t=t, tjm=tjm, z2j=z2j, gr=gr, shun=shun, xh=xh, kong=kong,
                dun=dun, sk=sk, gan=gan, zhi=zhi, sc=sc, yj=yj, zs=zs, rgz=rgz,
                zhou=(zs in ZHOU))

def md_pan(b):
    o = []
    o.append("| 地盘 | " + " | ".join(Z) + " |")
    o.append("|---|" + "---|" * 12)
    o.append("| **天盘** | " + " | ".join(b["t"][d] for d in Z) + " |")
    o.append("| **天将** | " + " | ".join(b["tjm"][d] for d in Z) + " |")
    return "\n".join(o)

def md_sike(b):
    sk = b["sk"]; z2j = b["z2j"]
    o = ["| | 第四课 | 第三课 | 第二课 | 第一课 |", "|---|---|---|---|---|"]
    o.append("| **天将** | " + " | ".join(z2j[s] for _, s in reversed(sk)) + " |")
    o.append("| **上神** | " + " | ".join(s for _, s in reversed(sk)) + " |")
    o.append("| **下神** | " + " | ".join(x for x, _ in reversed(sk)) + " |")
    return "\n".join(o)

def md_sanchuan(b):
    o = ["| | 传 | 遁干 | 六亲 | 天将 | 备注 |", "|---|---|---|---|---|---|"]
    for nm, z in zip(("初传", "中传", "末传"), b["sc"]):
        dg = b["dun"].get(z, "—")
        note = "**空亡**" if z in b["kong"] else ""
        o.append("| **%s** | %s | %s | %s | %s | %s |" %
                 (nm, z, dg, liuqin(b["gan"], z), TJ_FULL[b["z2j"][z]], note))
    return "\n".join(o)

# ── 转换 ──────────────────────────────────────────────────────────
import html as _html
def plain(s):
    """去掉 game 里的 <b>/<b class="c-r"> 标签，换成 markdown 的粗体。"""
    if not s: return ''
    s = re.sub(r'<b[^>]*>(.*?)</b>', r'**\1**', s, flags=re.S)
    s = re.sub(r'<[^>]+>', '', s)
    return _html.unescape(s).strip()

# 考点标签 → 课号。关键词从 steps 的知识点(p)里扫，命中即打标。
TAGMAP = [
    ('旬空',   ['旬空','空亡','落空','空陷'],                 7),
    ('遁干',   ['遁干','旬遁'],                               7),
    ('六亲',   ['妻财','官鬼','父母','子孙','兄弟','六亲'],   7),
    ('年命',   ['年命','行年','本命'],                        7),
    ('取象',   ['类象','取象'],                               8),
    ('天将',   ['天将','贵人','白虎','玄武','青龙','六合','朱雀','太常','天后','太阴','螣蛇','勾陈','天空'], 9),
    ('旺衰',   ['旺相','休囚','旺衰','长生','墓绝','死气'],   10),
    ('刑冲破害', ['相刑','相冲','相破','相害','六害','三刑'], 11),
    ('墓神',   ['入墓','墓神','日墓'],                        11),
    ('德合禄马', ['天德','月德','六合','日禄','驿马','贵登天门'], 11),
    ('类神',   ['类神','用神'],                               12),
    # ⚠️ 「七处」「三传读法」曾经也在这张表里，命中率 90% / 100%——
    #    每例都打上的标签等于没打，筛选时一点用都没有，已删。
    ('主客',   ['主客','宾主','彼此','内外','体用'],          14),
    ('递生递克', ['递生','递克','始中终'],                    15),
    ('应期',   ['应期','何时','时间','日期'],                 16),
    ('课体',   ['元首','重审','知一','涉害','遥克','昴星','别责','八专','伏吟','返吟','课体'], 18),
    ('毕法',   ['毕法'],                                      24),
]
def tags_of(c, b):
    txt = ' '.join(plain(st.get('p','')) + plain(st.get('a','')) for st in c['steps'])
    txt += ' ' + plain(c.get('bnote','')) + ' ' + c['board'].get('mt','')
    out = []
    for name, kws, lesson in TAGMAP:
        if any(k in txt for k in kws): out.append((name, lesson))
    return out
