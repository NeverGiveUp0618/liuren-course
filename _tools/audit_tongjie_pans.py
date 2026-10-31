#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""《大六壬通解》842例盘面自动复核。

复核原则：
- 月将、占时、日干支原文明载时，作“明载复盘”；
- 原文只记月份时，可按正亥二戌……腊子推定月将，但独立标成“月份推定”；
- 原书有多盘、校正盘时，只要复盘结果命中其中一组三传就记录命中，不擅自删除其他盘；
- 机器读不出原书三传，只记“可复排、待人工核原盘”，不记为错误。

用法：
  python3 _tools/audit_tongjie_pans.py
  python3 _tools/audit_tongjie_pans.py --json _audit/tongjie-pan-audit.json \
      --report _audit/tongjie-pan-audit.md
"""

from __future__ import annotations

import argparse
import json
import re
import subprocess
from collections import Counter, defaultdict
from pathlib import Path

from import_tongjie_cases import parse_volume


ROOT = Path(__file__).resolve().parents[1]
GAN = "甲乙丙丁戊己庚辛壬癸"
ZHI = "子丑寅卯辰巳午未申酉戌亥"
JIANG_NAMES = {
    "登明": "亥", "河魁": "戌", "从魁": "酉", "传送": "申", "小吉": "未", "胜光": "午",
    "太乙": "巳", "天罡": "辰", "太冲": "卯", "功曹": "寅", "大吉": "丑", "神后": "子",
}
MONTH_JIANG = {
    "正": "亥", "一": "亥", "寅": "亥",
    "二": "戌", "卯": "戌", "三": "酉", "辰": "酉", "四": "申", "巳": "申",
    "五": "未", "午": "未", "六": "午", "未": "午", "七": "巳", "申": "巳",
    "八": "辰", "酉": "辰", "九": "卯", "戌": "卯", "十": "寅", "亥": "寅",
    "十一": "丑", "冬": "丑", "子": "丑", "十二": "子", "腊": "子", "丑": "子",
}
KIN = "兄弟子孙父母财官鬼"
JIANG_SHORT = "贵蛇朱合勾青龙空虎常玄阴后"

# 逐页查看原始扫描或 OCR 校对版盘面后确认。pan_yj 是从天地盘反读出的实际月将；
# 标题只写月份时，不能把整个月机械地固定成一个月将，因为月将在节气交接。
MANUAL_PAN_REVIEW = {
    "tongjie-上-003": ("卯申丑", "戌", "上册校对版书内 p276，盘面月将戌"),
    "tongjie-上-006": ("巳寅亥", "酉", "上册校对版书内 p279，盘面月将酉"),
    "tongjie-上-007": ("亥午丑", "戌", "上册校对版书内 p282，盘面月将戌"),
    "tongjie-上-008": ("子申辰", "未", "上册校对版书内 p282，盘面月将未"),
    "tongjie-上-011": ("子亥戌", "未", "上册校对版书内 p286，盘面月将未"),
    "tongjie-上-016": ("巳辰卯", "午", "上册校对版书内 p297，盘面月将午"),
    "tongjie-上-019": ("申巳寅", "子", "上册校对版书内 p299，盘面月将子"),
    "tongjie-上-022": ("巳卯丑", "酉", "上册校对版书内 p301，盘面月将酉"),
    "tongjie-上-028": ("子辰戌", "卯", "上册校对版书内 p307，盘面月将卯"),
    "tongjie-上-034": ("巳申寅", "申", "上册校对版书内 p319，盘面月将申"),
    "tongjie-上-035": ("亥寅巳", "戌", "上册校对版书内 p320，盘面月将戌"),
    "tongjie-上-041": ("卯酉卯", "亥", "上册校对版书内 p326，盘面月将亥"),
    "tongjie-上-045": ("子寅辰", "寅", "上册校对版书内 p332，盘面月将寅"),
    "tongjie-上-046": ("辰午申", "丑", "上册校对版书内 p333，按天地盘反读月将丑"),
    "tongjie-上-047": ("丑子亥", "巳", "上册校对版书内 p336，盘面月将巳"),
    "tongjie-上-050": ("戌午寅", "卯", "上册校对版书内 p339，盘面月将卯"),
    "tongjie-上-051": ("辰巳午", "戌", "上册校对版书内 p341，盘面月将戌"),
    "tongjie-上-052": ("巳丑酉", None, "上册校对版书内 p343；标题甲寅日，四课日干位却作癸，参数冲突"),
    "tongjie-上-054": ("巳戌卯", "酉", "上册校对版书内 p352，盘面月将酉"),
    "tongjie-上-055": ("巳戌卯", "戌", "上册校对版书内 p353，盘面月将戌"),
    "tongjie-上-057": ("巳戌卯", "酉", "上册校对版书内 p354，盘面月将酉"),
    "tongjie-上-068": ("未卯亥", "子", "上册校对版书内 p370，盘面月将子"),
    "tongjie-上-069": ("子申辰", "丑", "上册校对版书内 p370，盘面月将丑"),
    "tongjie-上-071": ("辰午申", "戌", "上册校对版书内 p372，盘面月将戌"),
    "tongjie-上-074": ("辰午申", "申", "上册校对版书内 p377，盘面月将申"),
    "tongjie-中-006": ("午丑申", "亥", "中册校对版书内 p17，盘面月将亥"),
    "tongjie-中-008": ("子酉午", "午", "中册校对版书内 p19，三传自上而下为子、酉、午"),
    "tongjie-中-014": ("未寅酉", "申", "中册校对版书内 p36，盘面月将申"),
    "tongjie-中-018": ("午卯子", "辰", "中册校对版书内 p50，三传自上而下为午、卯、子"),
    "tongjie-中-019": ("巳寅亥", "寅", "中册校对版书内 p59，盘面月将寅"),
    "tongjie-中-024": ("午辰寅", "亥", "中册校对版书内 p71，盘面月将亥"),
    "tongjie-中-027": ("丑卯巳", "午", "中册校对版书内 p76，盘面月将午"),
    "tongjie-中-028": ("辰酉寅", "丑", "中册校对版书内 p80，按天地盘反读月将丑"),
    "tongjie-中-033": ("辰申子", "子", "中册校对版书内 p93，盘面月将子"),
    "tongjie-中-036": ("寅午戌", "申", "中册校对版书内 p94，盘面月将申"),
    "tongjie-中-037": ("卯亥未", "巳", "中册校对版书内 p95，三传自上而下为卯、亥、未"),
    "tongjie-中-047": ("子寅辰", "亥", "中册校对版书内 p104，盘面月将亥"),
    "tongjie-中-050": ("辰午申", "巳", "中册校对版书内 p106，盘面月将巳"),
    "tongjie-中-063": ("丑巳巳", "丑", "中册校对版书内 p278；原文又明确说丑为月将，复排仍不同"),
    "tongjie-中-071": ("巳亥巳", "巳", "中册校对版书内 p283；题头明载巳将，复排初末顺序仍不同"),
    "tongjie-中-100": ("戌午寅", "辰", "中册校对版书内 p308，三传自上而下为戌、午、寅"),
    "tongjie-中-114": ("辰卯寅", "戌", "中册校对版书内 p318；原文明确主张不备课不可重复取用，复排口径不同"),
    "tongjie-中-121": ("酉丑巳", "丑", "中册校对版书内 p322，题头丑时丑将"),
    "tongjie-中-123": ("子巳戌", "子", "中册校对版书内 p324；题头写寅将，但天地盘反读为子将，按盘复排一致"),
    "tongjie-中-131": ("巳寅亥", "辰", "中册校对版书内 p330，三传自上而下为巳、寅、亥"),
    "tongjie-中-141": ("卯酉卯", "申", "中册校对版书内 p336，盘面月将申"),
    "tongjie-中-146": ("申巳寅", "辰", "中册校对版书内 p340，三传自上而下为申、巳、寅"),
    "tongjie-中-191": ("寅巳子", "寅", "中册校对版书内 p368；题头明载寅将，复排仍不同"),
    "tongjie-中-066": ("丑亥酉", None, "中册 PDF p280，三传自上而下为丑、亥、酉"),
    "tongjie-下-022": ("丑亥酉", None, "下册 PDF p18，三传自上而下为丑、亥、酉"),
    "tongjie-下-262": ("子申辰", None, "下册 PDF p155，三传自上而下为子、申、辰"),
    "tongjie-下-554": ("申酉戌", None, "下册 PDF p332，三传自上而下为申、酉、戌"),
    "tongjie-下-021": ("巳寅亥", "子", "下册 OCR p12；题头明载子将丑时，三传巳、寅、亥"),
    "tongjie-下-034": ("未卯亥", "未", "下册 OCR p19；原文断语明载初未、中卯、终亥"),
    "tongjie-下-055": ("子辰戌", "丑", "下册 OCR p31；三传子、辰、戌"),
    "tongjie-下-057": ("寅亥申", "子", "下册 OCR p32；三传寅、亥、申"),
    "tongjie-下-074": ("寅未子", "戌", "下册 OCR p42；题头明载戌将，三传寅、未、子"),
    "tongjie-下-075": ("戌午申", "子", "下册 OCR p43；题头明载子将，三传戌、午、申"),
    "tongjie-下-079": ("卯午酉", "未", "下册 OCR p45；按天地盘反读未将，三传卯、午、酉"),
    "tongjie-下-088": ("丑亥酉", "寅", "下册 OCR p51；题头明载寅将，三传丑、亥、酉"),
    "tongjie-下-123": ("戌午寅", "戌", "下册 OCR p77；题头明载戌将，断语又说末传寅克初传戌"),
    "tongjie-下-134": ("未酉亥", "卯", "下册 OCR p82；一案附多组盘，题头主盘为卯将子时，首组三传未、酉、亥"),
    "tongjie-下-163": ("申亥寅", "亥", "下册 OCR p97；题头明载亥将，三传申、亥、寅"),
    "tongjie-下-175": ("寅申寅", "亥", "下册 OCR p104；题头明载亥将，三传寅、申、寅"),
    "tongjie-下-194": ("未卯亥", "亥", "下册 OCR p112；三传未、卯、亥"),
    "tongjie-下-195": ("巳丑酉", "寅", "下册 OCR p113；题头明载寅将，三传巳、丑、酉"),
    "tongjie-下-198": ("戌辰戌", "亥", "下册 OCR p114；按天地盘反读亥将，三传戌、辰、戌"),
    "tongjie-下-201": ("未亥卯", "午", "下册 OCR p115；按天地盘反读午将，三传未、亥、卯"),
    "tongjie-下-203": ("酉巳丑", "辰", "下册 OCR p116；三传酉、巳、丑"),
    "tongjie-下-205": ("巳亥巳", "亥", "下册 OCR p117；按天地盘反读亥将，三传巳、亥、巳"),
    "tongjie-下-208": ("酉戌亥", "亥", "下册 OCR p119；按天地盘反读亥将，三传酉、戌、亥"),
    "tongjie-下-210": ("亥辰辰", "辰", "下册 OCR p120；三传亥、辰、辰"),
    "tongjie-下-231": ("巳寅亥", "辰", "下册 OCR p135；三传巳、寅、亥"),
    "tongjie-下-234": ("未卯亥", "卯", "下册 OCR p137；三传未、卯、亥"),
    "tongjie-下-248": ("丑亥亥", "未", "下册 OCR p147；三传丑、亥、亥"),
    "tongjie-下-252": ("未卯亥", "未", "下册 OCR p149；三传未、卯、亥"),
    "tongjie-下-275": ("申酉戌", "酉", "下册 OCR p164；原文明说三传申酉戌"),
    "tongjie-下-278": ("巳寅亥", "未", "下册 OCR p166；原文明载戌时未将、三传巳寅亥"),
    "tongjie-下-300": ("亥卯未", "亥", "下册 OCR p175；按天地盘反读亥将，三传亥、卯、未"),
    "tongjie-下-301": ("亥申巳", "子", "下册 OCR p176；按天地盘反读子将，三传亥、申、巳"),
    "tongjie-下-303": ("丑亥酉", "戌", "下册 OCR p177；按天地盘反读戌将，三传丑、亥、酉"),
    "tongjie-下-304": ("巳戌卯", "酉", "下册 OCR p178；按天地盘反读酉将，三传巳、戌、卯"),
    "tongjie-下-331": ("卯申卯", "子", "下册 OCR p190；题头明载子将，三传卯、申、卯"),
    "tongjie-下-353": ("午亥辰", "酉", "下册 OCR p202；按天地盘反读酉将，三传午、亥、辰"),
    "tongjie-下-356": ("亥辰辰", "辰", "下册 OCR p203；按天地盘反读辰将，三传亥、辰、辰"),
    "tongjie-下-370": ("子未子", "亥", "下册 OCR p210；题头明载亥将，三传子、未、子"),
    "tongjie-下-371": ("子申辰", "寅", "下册 OCR p211；三传子、申、辰"),
    "tongjie-下-374": ("未子丑", "酉", "下册 OCR p212；题头明载酉将，三传未、子、丑"),
    "tongjie-下-412": ("酉丑巳", "子", "下册 OCR p239；按天地盘反读子将，三传酉、丑、巳"),
    "tongjie-下-413": ("巳戌卯", "酉", "下册 OCR p240；按天地盘反读酉将，三传巳、戌、卯"),
    "tongjie-下-414": ("未亥卯", "亥", "下册 OCR p241；按天地盘反读亥将，三传未、亥、卯"),
    "tongjie-下-430": ("卯亥未", "丑", "下册 OCR p251；三传卯、亥、未"),
    "tongjie-下-432": ("辰未戌", "酉", "下册 OCR p252；按天地盘反读酉将，三传辰、未、戌"),
    "tongjie-下-466": ("辰未戌", "巳", "下册 OCR p268；壬戌日寅时巳将，三传辰、未、戌"),
    "tongjie-下-469": ("子巳未", "亥", "下册 OCR p270；题头明载亥将，原文以初子、中巳、末未论断"),
    "tongjie-下-476": ("寅午午", "卯", "下册 OCR p275；题头明载卯将，三传寅、午、午"),
    "tongjie-下-507": ("寅未子", "戌", "下册 OCR p301；按天地盘反读戌将，三传寅、未、子"),
    "tongjie-下-522": ("丑亥亥", "巳", "下册 OCR p312；按天地盘反读巳将，三传丑、亥、亥"),
    "tongjie-下-543": ("辰午申", "辰", "下册 OCR p325；原文明说三传辰午申"),
    "tongjie-下-549": ("午丑申", "午", "下册 OCR p328；三传午、丑、申"),
    "tongjie-下-556": ("寅亥申", "卯", "下册 OCR p335；三传寅、亥、申"),
    "tongjie-下-561": ("子巳戌", "申", "下册 OCR p354；壬寅日、五月申将、卯时，三传子、巳、戌"),
}

MANUAL_INPUT_OVERRIDE = {
    "tongjie-下-466": {"rgz": "壬戌", "yj": "巳", "zs": "寅"},
    "tongjie-下-561": {"rgz": "壬寅", "yj": "申", "zs": "卯"},
}

EXCLUDED_NON_LIUREN = {"tongjie-下-447"}


def four_pillars(text: str):
    m = re.search(rf"([{GAN}][{ZHI}])(?:年)?\s+([{GAN}][{ZHI}])(?:月)?\s+"
                  rf"([{GAN}][{ZHI}])(?:日)?\s+([{GAN}][{ZHI}])(?:时)?", text[:900])
    return m.groups() if m else None


def extract_inputs(text: str) -> dict:
    sample = text[:1600].replace("已将", "巳将").replace("戊将", "戌将")
    pillars = four_pillars(sample)

    days = re.findall(rf"([{GAN}][{ZHI}])日", sample)
    rgz = days[0] if days else (pillars[2] if pillars else None)

    # 占时优先取“月将+占时”组合中的时，再取标题明载的时。
    yj = zs = None
    yj_basis = None
    m = re.search(rf"([{ZHI}])将(?:加)?([{GAN}]?[{ZHI}])时", sample)
    if m:
        yj, zs, yj_basis = m.group(1), m.group(2)[-1], "explicit"
    if not yj:
        m = re.search(rf"月将(?:为)?({'|'.join(JIANG_NAMES)})(?:加)?([{ZHI}])", sample)
        if m:
            yj, zs, yj_basis = JIANG_NAMES[m.group(1)], m.group(2), "explicit"
    if not yj:
        m = re.search(rf"({'|'.join(JIANG_NAMES)})(?:月将)?加([{ZHI}])", sample)
        if m:
            yj, zs, yj_basis = JIANG_NAMES[m.group(1)], m.group(2), "explicit"
    if not zs:
        times = re.findall(rf"([{GAN}]?[{ZHI}])时", sample)
        zs = times[0][-1] if times else (pillars[3][1] if pillars else None)

    month_raw = None
    # 先取“五月未将”这类明文月将。
    if not yj:
        m = re.search(rf"((?:闰)?(?:正|冬|腊|十一|十二|[一二三四五六七八九十{ZHI}]))月([{ZHI}])将", sample)
        if m:
            month_raw, yj, yj_basis = m.group(1).replace("闰", ""), m.group(2), "explicit"
    if not yj:
        m = re.search(rf"(?:闰)?(正|冬|腊|十一|十二|[一二三四五六七八九十{ZHI}])月", sample)
        if m:
            month_raw = m.group(1)
            yj = MONTH_JIANG.get(month_raw)
            if yj:
                yj_basis = "month_inferred"
    return {"rgz": rgz, "yj": yj, "zs": zs, "yj_basis": yj_basis, "month": month_raw}


def pan_prefix(text: str) -> str:
    """只在原断/现代讲解之前的盘面区找三传，减少正文误命中。"""
    marks = ["正议", "参议", "案验", "断：", "断曰", "奏曰", "议曰", "论曰", "解：", "邵彦和曰", "陈公献曰"]
    pos = [text.find(x) for x in marks if text.find(x) > 0]
    return text[:min(pos)] if pos else text[:2200]


def extract_source_chuans(text: str) -> tuple[list[str], str]:
    prefix = pan_prefix(text)
    # 六亲＋可选遁干＋传支＋天将。OCR 常把表格压成一行，因此不依赖换行。
    pat = re.compile(rf"([{KIN}])\s*(?:([{GAN}])\s*)?([{ZHI}])\s*([{JIANG_SHORT}])")
    groups = []
    high_groups = []
    # 正文明说“三传 A B C”的优先级最高。
    for m in re.finditer(rf"三传[^。；\n]{{0,18}}?([{ZHI}])(?:\s*[→、・/ ]\s*|\s+)([{ZHI}])(?:\s*[→、・/ ]\s*|\s+)([{ZHI}])", text):
        high_groups.append("".join(m.groups()))
    runs: list[list[str]] = []
    clear_run: list[str] = []
    run: list[str] = []
    for line in prefix.splitlines():
        zhis = [m.group(3) for m in pat.finditer(line)]
        cm = re.match(rf"^\s*([{KIN}])\s*(?:([{GAN}])\s*)?([{ZHI}])\s*([{JIANG_SHORT}])(?:\s|$)", line)
        if cm:
            clear_run.append(cm.group(3))
            if len(clear_run) >= 3:
                high_groups.append("".join(clear_run[-3:]))
        else:
            clear_run = []
        if zhis:
            # 三传被 OCR 压在同一行时，直接取连续三项。
            for i in range(len(zhis) - 2):
                groups.append("".join(zhis[i:i + 3]))
            run.extend(zhis)
        elif run:
            runs.append(run)
            run = []
    if run:
        runs.append(run)
    # 式盘通常是连续三行；对每个连续区做滑动三项，兼容行首的盘面字被误识。
    for hits in runs:
        for i in range(len(hits) - 2):
            groups.append("".join(hits[i:i + 3]))
    # 去重但保留原顺序。
    high_groups = list(dict.fromkeys(high_groups))
    groups = list(dict.fromkeys(high_groups + groups))
    return groups, ("high" if high_groups else ("low" if groups else "none"))


def prose_chuan_evidence(text: str, chuan: str) -> str | None:
    """只接受断语中明确写出三传或初中末传的证据，不从普通支字排列猜测。"""
    a, b, c = chuan
    patterns = [
        rf"三传[^。；\n]{{0,18}}{a}[、，\s]*(?:[{GAN}]?){b}[、，\s]*(?:[{GAN}]?){c}",
        rf"初传[^。；\n]{{0,16}}{a}[^。；\n]{{0,28}}中传[^。；\n]{{0,16}}{b}"
        rf"[^。；\n]{{0,28}}末传[^。；\n]{{0,16}}{c}",
    ]
    for pattern in patterns:
        match = re.search(pattern, text)
        if match:
            return match.group(0)
    return None


def audit() -> list[dict]:
    rows = []
    payload = []
    originals = {}
    for volume in ("上", "中", "下"):
        for case in parse_volume(volume):
            params = extract_inputs(case.original)
            source_chuans, source_confidence = extract_source_chuans(case.original)
            row = {
                "id": case.id, "volume": volume, "index": case.index,
                "category": case.category, "title": case.title, "page": case.page,
                **params, "source_chuans": source_chuans, "source_chuan_confidence": source_confidence,
            }
            if case.id in MANUAL_PAN_REVIEW:
                scan_chuan, pan_yj, scan_note = MANUAL_PAN_REVIEW[case.id]
                row.update(manual_scan_chuan=scan_chuan, manual_scan_note=scan_note)
                if pan_yj:
                    row.update(original_yj=row.get("yj"), yj=pan_yj, yj_basis="pan_read", manual_pan_yj=pan_yj)
            if case.id in MANUAL_INPUT_OVERRIDE:
                row.update(MANUAL_INPUT_OVERRIDE[case.id])
                row["yj_basis"] = "manual_input_correction"
            rows.append(row)
            originals[case.id] = case.original
            if case.id not in EXCLUDED_NON_LIUREN and row["rgz"] and row["yj"] and row["zs"]:
                payload.append({"id": case.id, "rgz": row["rgz"], "yj": row["yj"], "zs": row["zs"]})

    proc = subprocess.run(
        ["node", str(ROOT / "_tools" / "audit_tongjie_engine.js")],
        input=json.dumps(payload, ensure_ascii=False), text=True,
        capture_output=True, check=True,
    )
    computed = {x["id"]: x for x in json.loads(proc.stdout)}
    for row in rows:
        if row["id"] in EXCLUDED_NON_LIUREN:
            row.update(status="excluded_non_liuren", computed_chuan=None, computed_ke=None, computed_ge=None)
            continue
        got = computed.get(row["id"])
        if not got:
            row.update(status="missing_input", computed_chuan=None, computed_ke=None, computed_ge=None)
            continue
        if got.get("error"):
            row.update(status="engine_error", computed_chuan=None, computed_ke=None, computed_ge=None,
                       engine_error=got["error"])
            continue
        row.update(computed_chuan=got["chuan"], computed_ke=got["ke"], computed_ge=got["ge"])
        if row["id"] in MANUAL_PAN_REVIEW:
            scan_chuan = row["manual_scan_chuan"]
            if row.get("manual_pan_yj") is None and got["chuan"] != scan_chuan:
                row["status"] = "manual_source_unresolved"
            else:
                row["status"] = "verified_manual_scan" if got["chuan"] == scan_chuan else "mismatch_manual_scan"
            continue
        if row["source_chuans"] and got["chuan"] in row["source_chuans"]:
            if len(row["source_chuans"]) > 1:
                row["status"] = "verified_multi_pan"
            else:
                row["status"] = "verified_explicit" if row["yj_basis"] == "explicit" else "verified_inferred"
        elif (prose_evidence := prose_chuan_evidence(originals[row["id"]], got["chuan"])):
            row.update(status="verified_prose", prose_chuan_evidence=prose_evidence)
        elif not row["source_chuans"]:
            row["status"] = "reconstructed_no_source_chuan"
        elif row["source_chuan_confidence"] != "high":
            row["status"] = "source_chuan_ambiguous"
        elif row["yj_basis"] != "explicit":
            row["status"] = "inferred_unresolved"
        else:
            row["status"] = "mismatch_explicit"
    return rows


STATUS_CN = {
    "verified_explicit": "明载月将，三传一致",
    "verified_inferred": "月份推定月将，三传一致",
    "verified_multi_pan": "一案多盘，复盘命中其中一盘",
    "verified_manual_scan": "原书版面人工确认一致",
    "verified_prose": "原文断语明确三传且复盘一致",
    "reconstructed_no_source_chuan": "可复排，原书三传未能机读",
    "missing_input": "缺日干支/月将/占时",
    "mismatch_explicit": "明载参数复盘与机读原传不同",
    "mismatch_manual_scan": "原书版面人工确认仍不一致",
    "manual_source_unresolved": "原盘三传已确认，但题头与四课参数冲突",
    "inferred_unresolved": "月将仅为月份推定，尚不足以定盘",
    "source_chuan_ambiguous": "OCR 盘面三传读取有歧义",
    "excluded_non_liuren": "非六壬课盘，不纳入一致性复核",
    "engine_error": "起课引擎拒绝参数",
}


def report_md(rows: list[dict]) -> str:
    counts = Counter(r["status"] for r in rows)
    by_volume = defaultdict(Counter)
    for r in rows:
        by_volume[r["volume"]][r["status"]] += 1
    lines = [
        "# 《大六壬通解》842例盘面自动复核",
        "",
        "> 这是机器初审，不是对原书宣判对错。“不一致”优先检查 OCR、一案多盘、月将推定和发用口径。",
        "",
        "## 总表",
        "",
        "| 结果 | 上册 | 中册 | 下册 | 合计 |",
        "|---|---:|---:|---:|---:|",
    ]
    for status in STATUS_CN:
        n = counts.get(status, 0)
        if n:
            lines.append(f"| {STATUS_CN[status]} | {by_volume['上'][status]} | {by_volume['中'][status]} | {by_volume['下'][status]} | {n} |")
    manual = [r for r in rows if r["status"] in {"verified_manual_scan", "mismatch_manual_scan", "manual_source_unresolved"}]
    if manual:
        lines.extend(["", "## 原书版面人工核验", ""])
        for r in manual:
            lines.append(
                f"- **{r['volume']}册第{r['index']}例**：{r['manual_scan_note']}；"
                f"复盘 `{r['computed_chuan']}`；结论：{STATUS_CN[r['status']]}。"
            )
    prose_verified = [r for r in rows if r["status"] == "verified_prose"]
    if prose_verified:
        lines.extend(["", "## 原文断语交叉确认", ""])
        for r in prose_verified:
            lines.append(
                f"- **{r['volume']}册第{r['index']}例**：`{r['prose_chuan_evidence']}`；"
                f"复盘 `{r['computed_chuan']}`，一致。"
            )
    lines.extend(["", "## 需要人工复核", ""])
    risky = {"mismatch_explicit", "mismatch_manual_scan", "manual_source_unresolved", "inferred_unresolved", "source_chuan_ambiguous", "missing_input", "engine_error"}
    for r in rows:
        if r["status"] not in risky:
            continue
        src = " / ".join(r["source_chuans"]) or "未读出"
        got = r.get("computed_chuan") or "无法复排"
        params = "%s %s将%s时" % (r.get("rgz") or "?日", r.get("yj") or "?", r.get("zs") or "?")
        lines.append(f"- **{r['volume']}册第{r['index']}例**（OCR p{r['page']}）{STATUS_CN[r['status']]}；{params}；原传 `{src}`，复盘 `{got}`。")
    excluded = [r for r in rows if r["status"] == "excluded_non_liuren"]
    if excluded:
        lines.extend(["", "## 不纳入六壬盘复核", ""])
        for r in excluded:
            lines.append(f"- **{r['volume']}册第{r['index']}例**：{STATUS_CN[r['status']]}。")
    lines.extend(["", "## 状态口径", ""])
    for key, name in STATUS_CN.items():
        lines.append(f"- `{key}`：{name}。")
    return "\n".join(lines) + "\n"


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--json", type=Path, default=ROOT / "_audit" / "tongjie-pan-audit.json")
    parser.add_argument("--report", type=Path, default=ROOT / "_audit" / "tongjie-pan-audit.md")
    args = parser.parse_args()
    rows = audit()
    if len(rows) != 842:
        raise RuntimeError(f"案例总数异常：应为 842，实际为 {len(rows)}")
    ids = [r["id"] for r in rows]
    if len(set(ids)) != len(ids):
        raise RuntimeError("案例 ID 出现重复")
    unknown = sorted({r["status"] for r in rows} - set(STATUS_CN))
    if unknown:
        raise RuntimeError(f"出现未定义的复核状态：{unknown}")
    args.json.parent.mkdir(parents=True, exist_ok=True)
    args.report.parent.mkdir(parents=True, exist_ok=True)
    args.json.write_text(json.dumps(rows, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    args.report.write_text(report_md(rows), encoding="utf-8")

    counts = Counter(r["status"] for r in rows)
    print("《大六壬通解》盘面自动复核：%d 例" % len(rows))
    for status, n in counts.most_common():
        print("  %-36s %3d  %s" % (status, n, STATUS_CN[status]))
    print("详情：", args.report)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
