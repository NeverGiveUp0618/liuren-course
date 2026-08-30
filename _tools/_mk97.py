# -*- coding: utf-8 -*-
"""
一次性迁移工具：liuren-game 的 BF_KU（毕法赋四库足本一百法）→ content/97-毕法赋详解.md

⚠️ 跑完一次就够了。**content/97-…md 从此是内容源**，别再从 game 重抽——
   那边已冻结，而这边会继续改（订正、补注、接 wiki 链接）。
   本脚本留在 _tools/ 只为留个出处，不进构建流程。

⚠️ 盘面口径：**统一《通解》取上神**（2026-08-30 拍板）。
   game 的起课器在涉害用「孟>仲>季」判深浅，与《通解》「数克害重数」不同，
   两法在 306 张盘里有 10 张分歧。本脚本一律按 engine.js 复算，
   与 game 原存三传不一致的，在盘下加〔订正〕注明原值与依据。

用法：python3 _tools/_mk97.py            # 写 content/97-毕法赋详解.md
      python3 _tools/_mk97.py --dry      # 只报告，不写
"""
import json, re, subprocess, sys, os

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
GAME = os.path.join(os.path.dirname(ROOT), 'liuren-game', 'index.html')
OUT  = os.path.join(ROOT, 'content', '97-毕法赋详解.md')

CN = {'一':1,'二':2,'三':3,'四':4,'五':5,'六':6,'七':7,'八':8,'九':9,'十':10,'十一':11,'十二':12}
Z  = list('子丑寅卯辰巳午未申酉戌亥')


def grab_bfku(src):
    """从 index.html 里切出 BF_KU 的数组字面量（纯数据，无函数调用）。"""
    i = src.find('const BF_KU=')
    if i < 0:
        sys.exit('找不到 BF_KU')
    j = i + len('const BF_KU=')
    depth, instr = 0, None
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
        if c == '[':
            depth += 1
        elif c == ']':
            depth -= 1
            if depth == 0:
                return src[j:k + 1]
    sys.exit('BF_KU 括号不配对')


def via_node(literal):
    """用 node 把 JS 字面量转成 JSON，并顺便用 engine.js 复算每张盘。"""
    script = r'''
require(process.argv[2]);
const E = globalThis.LiurenEngine, Z = E.Z;
// BF_KU 里 79 处调用它。⭐ 它的 off = 13 − 局数 是对的，与全库 270/282 张盘相符；
// 出错的是更早手写的 board:{} 字面量。原样搬过来，别自己另写一份。
const ZHI_ALL = Z;
function bfp(r, ju, sc, mt, night = false, src = '书图') {
  const zs = night ? '酉' : '午';
  const off = ju === 1 ? 0 : 13 - ju;
  const yj = ZHI_ALL[(ZHI_ALL.indexOf(zs) + off + 12) % 12];
  return { r, yj, zs, sc,
    mt: `${mt} · ${r}日第${ju}局${night ? '夜占' : '昼占'}（据${src}三传${sc.join('')}注入）` };
}
const data = eval('(' + require('fs').readFileSync(process.argv[3], 'utf8') + ')');
const CN = {'一':1,'二':2,'三':3,'四':4,'五':5,'六':6,'七':7,'八':8,'九':9,'十':10,'十一':11,'十二':12};
for (const fa of data) for (const ge of (fa.ge || [])) {
  const b = ge.board; if (!b) continue;
  const m = (b.mt || '').match(/第([一二三四五六七八九十]+)局/);
  const ju = m ? CN[m[1]] : null;
  const off0 = (Z.indexOf(b.yj) - Z.indexOf(b.zs) + 12) % 12;
  // ⭐ 修的是**月将**不是占时：占时「午」是 bfp 的昼占房规，错的是月将。
  let yj = b.yj, zs = b.zs, fixedJiang = null;
  if (ju) {                                  // off = 13 − 局数（全库 270/282 验证）
    const want = (13 - ju + 12) % 12;
    if (want !== off0) { yj = Z[(Z.indexOf(zs) + want) % 12]; fixedJiang = yj; }
  }
  const r = E.qike(b.r, yj, zs);
  b._ju = ju; b._yjFixed = fixedJiang; b._yjUse = yj;
  if (!r) { b._err = 'qike 返回 null'; continue; }
  b._off = r.off; b._men = r.ke || (r.off === 0 ? '伏吟' : '');
  b._ge  = r.ge || '';
  b._tp  = Z.map(d => r.t[d]);
  b._sk  = r.sk.map(c => [c.shang, c.xia]);
  b._ji  = r.ji;
  b._chuan = r.chuan ? r.chuan.slice(0, 3) : null;
}
process.stdout.write(JSON.stringify(data));
'''
    tmp_js = os.path.join(HERE, '_mk97_tmp.js')
    tmp_dat = os.path.join(HERE, '_mk97_tmp.txt')
    open(tmp_js, 'w', encoding='utf-8').write(script)
    open(tmp_dat, 'w', encoding='utf-8').write(literal)
    try:
        out = subprocess.run(['node', tmp_js, os.path.join(ROOT, 'engine.js'), tmp_dat],
                             capture_output=True, text=True)
        if out.returncode:
            sys.exit('node 失败：\n' + out.stderr[:2000])
        return json.loads(out.stdout)
    finally:
        for p in (tmp_js, tmp_dat):
            if os.path.exists(p):
                os.remove(p)


def classify(b, ch):
    """给「原存三传 ≠ 通解复算」归类，让每条订正都带得上原因。

    取下神 —— App 发用正是通解发用**所临的地盘位**，即 engine.js 开头写明的
              那处两说（2026-08-30 拍板统一《通解》取上神）。
    涉害深浅 —— 涉害课特有：game 按「孟＞仲＞季」判深浅，《通解》按数克害重数。
    三传不成链 —— App 三传不是天盘上的连续三位，多半是录入坏了
                   （伏吟／八专／别责的中末本就另取，不算）。
    待查 —— 以上都不是，需回原书逐张核。
    """
    Zl = Z
    off = b['_off']
    t = {d: Zl[(Zl.index(d) + off) % 12] for d in Zl}
    rev = {v: k for k, v in t.items()}
    sc = b['sc']
    if rev.get(ch[0]) == sc[0]:
        return '取下神'
    if b.get('_men') == '涉害':
        return '涉害深浅'
    chain = t.get(sc[0]) == sc[1] and t.get(sc[1]) == sc[2]
    if not chain and b.get('_men') not in ('伏吟', '八专', '别责'):
        return '三传不成链·疑录入错'
    return '待查'


def row(label, vals):
    return '| ' + label + ' | ' + ' | '.join(vals) + ' |'


def pan_md(b):
    """天地盘 + 四课 + 三传。天将不排——BF_KU 多数条目没记昼夜，宁缺勿造。"""
    L = []
    L.append(row('地盘', Z))
    L.append('|' + '---|' * 13)
    L.append(row('**天盘**', b['_tp']))
    L.append('')
    L.append('**四课**')
    L.append('')
    L.append('| | 第四课 | 第三课 | 第二课 | 第一课 |')
    L.append('|---|---|---|---|---|')
    sk = b['_sk']
    L.append(row('**上神**', [sk[3][0], sk[2][0], sk[1][0], sk[0][0]]))
    xia = [sk[3][1], sk[2][1],
           sk[1][1], '%s〔日干，寄%s〕' % (sk[0][1], b['_ji'])]
    xia[1] = '%s〔日支〕' % sk[2][1]
    L.append(row('**下神**', xia))
    return L


def main():
    dry = '--dry' in sys.argv
    src = open(GAME, encoding='utf-8').read()
    data = via_node(grab_bfku(src))

    fixes_jiang, fixes_chuan, errs = [], [], []
    out = ['# 大六壬 · 毕法赋详解（四库足本一百法）', '']
    out += [
        '> **这是什么**：凌福之《毕法赋》一百法的**四库足本逐格详解**，'
        '依《图解六壬大全·第三部》两级结构「法 → 格」录入，'
        '每格给出**原文**、**白话**，有书图的附**课盘**。',
        '> **和第 24 课的关系**：第 24 课讲毕法赋**怎么用**（哪些法常用、'
        '怎么与课体配合），刻意不做逐格全解；**本篇是那一课的配套详解**——'
        '断课时想查某一法某一格到底怎么说，翻这里。',
        '> **怎么用**：不必从头读。**按法号或格名查**。',
        '',
        '> ⚠️ **盘是复算的，不是照抄**。原书只给日干支与「第几局」，'
        '天盘、四课、三传全部按第 2–6 课的方法重排，所以盘必然自洽。'
        '与原数据不符处已在盘下注明。',
        '> ⚠️ **口径**：涉害深浅按《通解》**数克害重数**取深者'
        '（2026-08-30 拍板）。《图解六壬大全》部分书图按'
        '「孟＞仲＞季」判深浅，两法结论不同处一律注出。',
        '',
        '---',
        '',
    ]

    for fa in data:
        out.append('## 第 %d 法　%s：%s' % (fa['n'], fa['ju'], fa['pian']))
        out.append('')
        if fa.get('zhu'):
            out.append('> **注**　%s' % fa['zhu'])
            out.append('')
        for ge in fa.get('ge') or []:
            out.append('### %s：%s' % (ge['name'], ge.get('duan', '')))
            out.append('')
            if ge.get('yw'):
                out.append('> 「%s」' % ge['yw'])
                out.append('> 〔大全三·第 %d 法〕' % fa['n'])
                out.append('')
            if ge.get('bh'):
                out.append('**白话**　%s' % ge['bh'])
                out.append('')
            b = ge.get('board')
            if not b:
                out.append('*（原书此格无盘图。）*')
                out.append('')
                continue
            if b.get('_err'):
                errs.append('%s：%s' % (ge['name'], b['_err']))
                out.append('*（此格盘面数据有问题，待核：%s）*' % b['_err'])
                out.append('')
                continue

            head = '**盘**　%s日' % b['r']
            if b.get('_ju'):
                head += '第 %d 局' % b['_ju']
            head += '　月将 %s 加占时 %s' % (b['_yjUse'], b['zs'])
            if b.get('_men'):
                head += '　（%s%s）' % (b['_men'], ('·' + b['_ge']) if b.get('_ge') else '')
            out.append(head)
            out.append('')
            out += pan_md(b)
            out.append('')
            ch = b.get('_chuan')
            if ch and not b.get('sc'):
                out.append('**三传**　**%s → %s → %s**（原书未列三传，此处为复算值）'
                           % tuple(ch))
                out.append('')
            elif ch:
                out.append('**三传**　**%s → %s → %s**' % tuple(ch))
                out.append('')

            notes = []
            if b.get('_yjFixed'):
                notes.append('〔订正〕原记月将 **%s**，与「第 %d 局」不合'
                             '（`off = 13 − 局数`，全库 270/282 张盘符合此式，'
                             '`bfp()` 生成的 79 张亦用此式）；'
                             '已改为 **%s**，占时与三传不变。'
                             % (b['yj'], b['_ju'], b['_yjFixed']))
                fixes_jiang.append((b['r'], b['_ju'], b['yj'], b['_yjFixed'], ge['name']))
            # ⚠️ 3 张盘原本没存 sc（靠 App 现算），这里补上复算值即可，不算订正
            if ch and b.get('sc') and ch != b['sc']:
                kind = classify(b, ch)
                notes.append('〔订正〕原存三传 **%s**，按《通解》复算应为 **%s**'
                             '（%s；分歧类型：**%s**）。'
                             % ('→'.join(b['sc']), '→'.join(ch),
                                b.get('_men') or '—', kind))
                fixes_chuan.append((b['r'], kind, '→'.join(b['sc']),
                                    '→'.join(ch), b.get('_men'), ge['name']))
            if b.get('mt'):
                notes.append('原书注：%s' % b['mt'])
            for n in notes:
                out.append('> %s' % n)
            if notes:
                out.append('')
        out.append('---')
        out.append('')

    md = '\n'.join(out)
    print('法 %d　格 %d　盘 %d' % (
        len(data), sum(len(f.get('ge') or []) for f in data),
        sum(1 for f in data for g in (f.get('ge') or []) if g.get('board'))))
    print('月将订正 %d 张：' % len(fixes_jiang))
    for x in fixes_jiang:
        print('   %s 第%s局 %s→%s  %s' % x)
    print('三传订正 %d 张：' % len(fixes_chuan))
    for x in fixes_chuan:
        print('   %-3s %-14s %-12s ⇒ %-12s [%s] %s' % x)
    if errs:
        print('异常 %d：' % len(errs))
        for e in errs:
            print('   ' + e)
    print('md %d 行 / %.1f KB' % (md.count('\n') + 1, len(md.encode()) / 1024))
    if dry:
        print('(--dry，未写文件)')
        return
    open(OUT, 'w', encoding='utf-8').write(md)
    print('已写 ' + OUT)


if __name__ == '__main__':
    main()
