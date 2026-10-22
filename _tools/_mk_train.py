# -*- coding: utf-8 -*-
"""
一次性迁移工具（2026-10-22）：从「六壬神课」App 抽出练习要用的**纯逻辑与数据**，生成 train-core.js。

做法：把 App 的 <script> 切成顶层语句，按名字取需要的声明，再按标识符引用**自动补齐依赖**
（数据表引用数据表、判定函数引用工具函数）。碰 DOM 的函数一律不取——界面在课程里重写。

⚠️ 三传与课体**不用 App 的** _compute3chuan/_detectMethod（App 取下神），
   train-core.js 末尾用 engine.js（《通解》取上神）覆盖这两个名字。2026-10-22 用户拍板统一口径。

用法：python3 _tools/_mk_train.py     输出 train-core.js（生成物，别手改）
"""
import os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
GAME = os.path.join(os.path.dirname(ROOT), 'liuren-game', 'index.html')
OUT = os.path.join(ROOT, 'train-core.js')

html = open(GAME, encoding='utf-8').read()
scripts = re.findall(r'<script>(.*?)</script>', html, re.S)
SRC = max(scripts, key=len)

# ── 顶层语句切分（够用的 JS 词法：字符串/模板/注释/正则字面量）──
def split_top(src):
    out, i, n, depth, start = [], 0, len(src), 0, 0
    prev_sig = ''
    while i < n:
        c = src[i]
        if c in '"\'':
            q = c; i += 1
            while i < n and src[i] != q:
                i += 2 if src[i] == '\\' else 1
            i += 1; prev_sig = 'x'; continue
        if c == '`':
            i += 1; d = 0
            while i < n:
                if src[i] == '\\': i += 2; continue
                if src[i] == '`' and d == 0: break
                if src.startswith('${', i): d += 1; i += 2; continue
                if src[i] == '}' and d: d -= 1
                i += 1
            i += 1; prev_sig = 'x'; continue
        if src.startswith('//', i):
            j = src.find('\n', i); i = n if j < 0 else j; continue
        if src.startswith('/*', i):
            j = src.find('*/', i + 2); i = n if j < 0 else j + 2; continue
        if c == '/' and prev_sig in ('', '(', ',', '=', ':', '[', '!', '&', '|', '?', '{', '}', ';', 'kw'):
            i += 1; cls = False
            while i < n:
                if src[i] == '\\': i += 2; continue
                if src[i] == '[': cls = True
                elif src[i] == ']': cls = False
                elif src[i] == '/' and not cls: break
                elif src[i] == '\n': break
                i += 1
            i += 1
            while i < n and src[i].isalpha(): i += 1
            prev_sig = 'x'; continue
        if c in '([{': depth += 1
        elif c in ')]}': depth -= 1
        if not c.isspace():
            if c.isalnum() or c in '_$':
                m = re.match(r'[\w$]+', src[i:])
                w = m.group(0)
                prev_sig = 'kw' if w in ('return', 'typeof', 'case', 'in', 'of', 'else') else 'x'
                i += len(w)
                continue
            prev_sig = c
        if depth == 0 and (c == ';' or c == '}' ) :
            # 语句结束：分号，或函数体闭合（后面是换行）
            j = i + 1
            if c == '}':
                k = j
                while k < n and src[k] in ' \t': k += 1
                if k < n and src[k] not in '\n;,)':
                    i += 1; continue
            out.append(src[start:j]); start = j
        i += 1
    out.append(src[start:])
    return out

STMTS = split_top(SRC)
DECL = {}
def _nocomment(t):
    # 语句前面常挂着注释（「// ══ 天将联想测验 ══」），认声明前先剥掉，但保留在输出里
    while True:
        t = t.lstrip()
        if t.startswith('//'):
            t = t[t.find('\n') + 1:] if '\n' in t else ''
        elif t.startswith('/*'):
            t = t[t.find('*/') + 2:]
        else:
            return t
for s in STMTS:
    t = s.strip()
    tt = _nocomment(t)
    m = re.match(r'(?:(?:const|let|var)\s+([\w$]+)|function\s+([\w$]+))', tt)
    if m:
        DECL.setdefault(m.group(1) or m.group(2), []).append(t)
    m = re.match(r'Object\.assign\(\s*([\w$]+)', tt)
    if m:
        DECL.setdefault('@assign:' + m.group(1), []).append(t)

DOM_WORDS = ('document.', 'getElementById', 'innerHTML', 'localStorage', 'querySelector', 'window.')
# 要的入口
WANT = ['QZ_YJ', 'QZ_GR', 'TJ_QUIZ', 'TRAIN_ZS', 'BJ_TBL', 'BJ_MONTH', 'K64', 'K64X', 'K64_RULES',
        'TJ_XIANG', 'WSD_STATES', 'TW_QUIZ', 'BF_FA', 'KJ_DATA', 'GZ_REL_ID', 'GZ_REL_NAMES', 'buildGZ',
        'GZ_HE', 'GZ_CHONG', 'GZ_SANHE', 'ZM_METHODS', 'YJ_TBL', 'GR_Z', 'GR_Y', 'ZHU_SHI', 'KONG_TBL',
        'TJ_NAMES', 'GAN_JI', 'GAN_ALL', 'ZHI_ALL', 'k64Detect', '_bfDetect', '_bjDetect', '_tjMapOf', '_luqin', '_relToRi',
        '_shangshen', 'k64PartialSet', 'K64_NINE_SET', 'shuffleArr',
        'trainBJPool', 'trainQuestion', 'trainPick', 'trainShuffle']
SKIP = {'_compute3chuan', '_detectMethod', '_genKC', 'kcState', '_genKC3', 'k64GenOnce'}

got, order, queue = set(), [], list(WANT)
while queue:
    nm = queue.pop(0)
    if nm in got or nm in SKIP:
        continue
    if nm not in DECL:
        continue
    got.add(nm)
    for t in DECL[nm] + DECL.get('@assign:' + nm, []):
        if _nocomment(t).startswith('function') and any(w in t for w in DOM_WORDS):
            print('  ⚠️ 含 DOM，跳过：', nm)
            got.discard(nm); break
        order.append((nm, t))
        for ref in set(re.findall(r'(?<![\w$.])([A-Za-z_$][\w$]*)', t)):
            if ref in DECL and ref not in got and ref not in SKIP:
                queue.append(ref)

# 保持 App 里的原顺序（数据先于用它的代码）
pos = {id(s): k for k, s in enumerate(STMTS)}
idx = {t: SRC.find(t) for _, t in order}
order.sort(key=lambda x: idx[x[1]])
seen, body = set(), []
for nm, t in order:
    if t in seen:
        continue
    seen.add(t); body.append(t)

head = '''/* 由 _tools/_mk_train.py 从「六壬神课」App 抽出（2026-10-22 App 退役）——**生成物，别手改**。
   内容：练习题库数据＋六十四课经判定规则＋毕法/八煞九宝初判。三传与课体改用 engine.js（见文件末尾）。 */
(function (root) {
'''
tail = '''

/* ── 三传与课体：一律用课程 engine.js（《通解》发用取上神），不用 App 的下神算法 ── */
var _KE_MAP = { 元首: '元首', 重审: '重审', 比用: '比用', 知一: '知一', 涉害: '涉害', 遥克: '遥克',
                昴星: '昴星', 别责: '别责', 八专: '八专', 伏吟: '伏吟', 返吟: '返吟' };
function _detectMethod(st) { return st._ke; }
function makeState(rgz, yjZhi, zs) {
  var r = root.LiurenEngine.qike(rgz, yjZhi, zs);
  if (!r) return null;
  var rg = rgz.charAt(0), rz = rgz.charAt(1);
  var ri = -1; for (var i = 0; i < 60; i++) if (GAN_ALL[i % 10] === rg && ZHI_ALL[i % 12] === rz) { ri = i; break; }
  var zsi = ZHI_ALL.indexOf(zs), day = ZHU_SHI.indexOf(zs) >= 0;
  var tp = ZHI_ALL.map(function (d) { return r.t[d]; });
  var yj = YJ_TBL.filter(function (y) { return y.yj === yjZhi; })[0] || { yj: yjZhi };
  var st = { rg: rg, rz: rz, ri: ri, yj: yj, yi2: ZHI_ALL.indexOf(yjZhi), zsi: zsi, zs: zs, day: day, tp: tp,
    sk: r.sk.map(function (c, k) { return { s: c.shang, x: c.xia, n: ['第一课', '第二课', '第三课', '第四课'][k] }; }),
    jg: GAN_JI[rg], cc: r.chuan[0], zc: r.chuan[1], mc: r.chuan[2],
    gr: day ? GR_Z[rg] : GR_Y[rg], xi: KONG_TBL[Math.floor(ri / 10)], _ke: r.ke, _ge: r.ge || '' };
  st.mt = r.ke + '课' + (r.ge ? '·' + r.ge : '');
  return st;
}
function randState(filter) {
  for (var k = 0; k < 500; k++) {
    var ri = Math.floor(Math.random() * 60);
    var st = makeState(GAN_ALL[ri % 10] + ZHI_ALL[ri % 12], ZHI_ALL[Math.floor(Math.random() * 12)],
                       ZHI_ALL[Math.floor(Math.random() * 12)]);
    if (st && (!filter || filter(st))) return st;
  }
  return null;
}
root.TrainCore = {
  makeState: makeState, randState: randState, _detectMethod: _detectMethod,
  k64Detect: typeof k64Detect !== 'undefined' ? k64Detect : null,
  bfDetect: typeof _bfDetect !== 'undefined' ? _bfDetect : null,
  bjDetect: typeof _bjDetect !== 'undefined' ? _bjDetect : null,
  tjMapOf: _tjMapOf, shuffle: shuffleArr,
  bjPool: function () { return trainBJPool('bj'); },
  D: { QZ_YJ: QZ_YJ, QZ_GR: QZ_GR, TJ_QUIZ: TJ_QUIZ, TRAIN_ZS: typeof TRAIN_ZS !== 'undefined' ? TRAIN_ZS : null,
       BJ_TBL: BJ_TBL, BJ_MONTH: typeof BJ_MONTH !== 'undefined' ? BJ_MONTH : null, K64: K64, K64X: K64X,
       K64_RULES: K64_RULES, TJ_XIANG: TJ_XIANG, WSD_STATES: WSD_STATES, TW_QUIZ: TW_QUIZ, BF_FA: BF_FA,
       KJ_DATA: KJ_DATA, buildGZ: buildGZ, ZM_METHODS: ZM_METHODS, GAN_ALL: GAN_ALL, ZHI_ALL: ZHI_ALL,
       YJ_TBL: YJ_TBL, K64_NINE_SET: typeof K64_NINE_SET !== 'undefined' ? K64_NINE_SET : null }
};
})(typeof window !== 'undefined' ? window : globalThis);
'''
open(OUT, 'w', encoding='utf-8').write(head + '\n\n'.join(body) + tail)
print('✓ train-core.js', round(os.path.getsize(OUT) / 1024, 1), 'KB，', len(body), '条声明：',
      ', '.join(sorted(got))[:900])
