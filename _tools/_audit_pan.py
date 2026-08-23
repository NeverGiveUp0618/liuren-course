# -*- coding: utf-8 -*-
"""复算教材里出现的每一张盘，与 md 表格逐字比对。"""
import re,os
Z=list("子丑寅卯辰巳午未申酉戌亥")
TJ=["贵","蛇","朱","合","勾","青","空","虎","常","玄","阴","后"]
GR_D={"甲":"丑","戊":"丑","庚":"丑","乙":"子","己":"子","丙":"亥","丁":"亥","辛":"午","壬":"巳","癸":"巳"}
GR_N={"甲":"未","戊":"未","庚":"未","乙":"申","己":"申","丙":"酉","丁":"酉","辛":"寅","壬":"卯","癸":"巳"}
GR_N["癸"]="卯"
ZHOU=set("卯辰巳午未申")
JI={"甲":"寅","乙":"辰","丙":"巳","戊":"巳","丁":"未","己":"未","庚":"申","辛":"戌","壬":"亥","癸":"丑"}
def tp(yj,zs):
    off=(Z.index(yj)-Z.index(zs))%12
    return {d:Z[(Z.index(d)+off)%12] for d in Z}   # 地盘支 -> 天盘支
def tj(gan,shi,t):
    gr=GR_D[gan] if shi in ZHOU else GR_N[gan]
    dp=[d for d in Z if t[d]==gr][0]              # 贵人所临地盘位
    shun = dp in "亥子丑寅卯辰"
    out={}
    for i,name in enumerate(TJ):
        z=Z[(Z.index(gr)+(i if shun else -i))%12] # 天盘支
        d=[k for k in Z if t[k]==z][0]
        out[d]=name
    return out,gr,dp,shun
def sike(gan,zhi,t):
    k1=t[JI[gan]]; k2=t[k1]; k3=t[zhi]; k4=t[k3]
    return [(gan,k1),(k1,k2),(zhi,k3),(k3,k4)]
def zeike(t,sk):
    xia=[(x,s) for x,s in sk if x in Z and KE(s,x)]   # 下贼上：下神克上神
    shang=[(x,s) for x,s in sk if x in Z and KE(x,s)]
    return xia,shang
WX={"子":"水","亥":"水","寅":"木","卯":"木","巳":"火","午":"火","申":"金","酉":"金","丑":"土","辰":"土","未":"土","戌":"土"}
K={"水":"火","火":"金","金":"木","木":"土","土":"水"}
def KE(a,b): return K[WX[a]]==WX[b]
def chuan(t,c0):
    c1=t[c0]; c2=t[c1]; return [c0,c1,c2]

OB="/Users/xiaojin/Documents/文稿同步文件夹/03_学习 (Learning)/Seafile/学习资料/自创项目/liuren-course/content"
md={f:open(os.path.join(OB,f)).read() for f in os.listdir(OB) if f.endswith(".md")}
def row(label,vals): return "| "+label+" | "+" | ".join(vals)+" |"
def nz(x): return x.replace("*","").replace(" ","")
MDN={f:nz(t) for f,t in md.items()}
def find(s):
    return [f for f,t in MDN.items() if nz(s) in t]

CASES=[
 ("例一 丙申日癸巳时 未将",  "丙","申","未","巳"),
 ("例二 戊戌日甲寅时 未将",  "戊","戌","未","寅"),
 ("第2课自测 巳将加申时",    None,None,"巳","申"),
]
bad=0
for name,gan,zhi,yj,zs in CASES:
    t=tp(yj,zs)
    print("="*60); print(name)
    r_tp=row("**天盘**",[t[d] for d in Z]) ; r_tp2=row("天盘",[t[d] for d in Z])
    print("  天盘行:",r_tp)
    ok = find(r_tp)
    print("   md 中命中:",ok if ok else "❌ 未找到")
    if not ok: bad+=1
    if gan:
        g,gr,dp,shun=tj(gan,zs,t)
        print("  贵人=%s（临地盘%s）→ %s"%(gr,dp,"顺行" if shun else "逆行"))
        r_tj=row("**天将**",[g[d] for d in Z])
        ok2=find(r_tj); print("  天将行:",r_tj); print("   md 中命中:",ok2 if ok2 else "❌ 未找到")
        if not ok2: bad+=1
        sk=sike(gan,zhi,t)
        print("  四课(一→四):"," ".join("%s/%s"%(s,x) for x,s in sk))
        xia,shang=zeike(t,sk)
        print("  下贼上:",xia," 上克下:",shang)
        if len(xia)==1: c0=xia[0][1]; ct="重审"
        elif len(xia)==0 and len(shang)==1: c0=shang[0][1]; ct="元首"
        else: c0=None; ct="需比用/涉害等"
        if c0: print("  三传:",chuan(t,c0),"　课体:",ct)
print("="*60)
print("内置 case 复算：不一致 %d 处"%bad)

# ── 通用校验：扫描 content 里的每一张天地盘，验证它自洽 ──────────────
# ⭐ 内置 case 只覆盖已知的几张盘；新写的课随时会加新盘，所以再加一层通用检查：
#    ① 天盘必须是地盘的整体平移（否则就不是"月将加时"排出来的）
#    ② 天将若给了，必须是从某一格起顺行或逆行连续排满十二位
import glob, re as _re
def scan_all():
    C = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "content")
    bad = 0; n = 0
    for f in sorted(glob.glob(os.path.join(C, "*.md"))):
        lines = open(f).read().split("\n")
        for i, ln in enumerate(lines):
            if not ln.startswith("|") or "地盘" not in ln:
                continue
            cells = [c.replace("*", "").strip() for c in ln.strip().strip("|").split("|")]
            if cells[0] != "地盘" or len(cells) != 13:
                continue
            order = cells[1:]
            rows = {}
            for j in range(i + 1, min(i + 5, len(lines))):
                if not lines[j].startswith("|"):
                    break
                r = [c.replace("*", "").strip() for c in lines[j].strip().strip("|").split("|")]
                if len(r) == 13 and r[0] in ("天盘", "天将"):
                    rows[r[0]] = r[1:]
            if "天盘" not in rows:
                continue
            n += 1
            tag = "%s 行%d" % (os.path.basename(f)[:10], i + 1)
            tpv = dict(zip(order, rows["天盘"]))
            offs = {(Z.index(tpv[d]) - Z.index(d)) % 12 for d in order}
            if len(offs) != 1:
                print("  x %s 天盘不是整体平移（不可能由月将加时排出）" % tag); bad += 1; continue
            off = offs.pop()
            if "天将" in rows:
                tjv = dict(zip(order, rows["天将"]))
                gpos = [d for d in order if tjv[d] == "贵"]
                if len(gpos) != 1:
                    print("  x %s 天将里贵人不唯一" % tag); bad += 1; continue
                gz_ = tpv[gpos[0]]
                for shun in (True, False):
                    exp = {}
                    for k, name in enumerate(TJ):
                        z = Z[((Z.index(gz_) + (k if shun else -k)) % 12 + 12) % 12]
                        exp[[d for d in order if tpv[d] == z][0]] = name
                    if exp == tjv:
                        print("  ✓ %s 天盘平移%2d位，天将自贵人%s%s连续" % (tag, off, gz_, "顺行" if shun else "逆行"))
                        break
                else:
                    print("  x %s 天将不是从贵人起连续顺行或逆行" % tag); bad += 1
            else:
                print("  ✓ %s 天盘平移%2d位（未给天将）" % (tag, off))
    print("扫描课文里的盘 %d 张：不自洽 %d 张" % (n, bad))
    return bad

print("=" * 60)
print("通用校验：课文里的每一张盘")
bad += scan_all()
print("=" * 60)
print("总计：不一致 %d 处" % bad)

