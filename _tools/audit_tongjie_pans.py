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

# 逐页查看原始 PDF 扫描后确认。OCR 将竖排三传拆散或改了行序，不能按纯文本顺序判断。
MANUAL_SCAN_CHUAN = {
    "tongjie-中-066": ("丑亥酉", "中册 PDF p280，三传自上而下为丑、亥、酉"),
    "tongjie-下-022": ("丑亥酉", "下册 PDF p18，三传自上而下为丑、亥、酉"),
    "tongjie-下-262": ("子申辰", "下册 PDF p155，三传自上而下为子、申、辰"),
    "tongjie-下-554": ("申酉戌", "下册 PDF p332，三传自上而下为申、酉、戌"),
}


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


def audit() -> list[dict]:
    rows = []
    payload = []
    for volume in ("上", "中", "下"):
        for case in parse_volume(volume):
            params = extract_inputs(case.original)
            source_chuans, source_confidence = extract_source_chuans(case.original)
            row = {
                "id": case.id, "volume": volume, "index": case.index,
                "category": case.category, "title": case.title, "page": case.page,
                **params, "source_chuans": source_chuans, "source_chuan_confidence": source_confidence,
            }
            rows.append(row)
            if params["rgz"] and params["yj"] and params["zs"]:
                payload.append({"id": case.id, "rgz": params["rgz"], "yj": params["yj"], "zs": params["zs"]})

    proc = subprocess.run(
        ["node", str(ROOT / "_tools" / "audit_tongjie_engine.js")],
        input=json.dumps(payload, ensure_ascii=False), text=True,
        capture_output=True, check=True,
    )
    computed = {x["id"]: x for x in json.loads(proc.stdout)}
    for row in rows:
        got = computed.get(row["id"])
        if not got:
            row.update(status="missing_input", computed_chuan=None, computed_ke=None, computed_ge=None)
            continue
        if got.get("error"):
            row.update(status="engine_error", computed_chuan=None, computed_ke=None, computed_ge=None,
                       engine_error=got["error"])
            continue
        row.update(computed_chuan=got["chuan"], computed_ke=got["ke"], computed_ge=got["ge"])
        if row["id"] in MANUAL_SCAN_CHUAN:
            scan_chuan, scan_note = MANUAL_SCAN_CHUAN[row["id"]]
            row.update(manual_scan_chuan=scan_chuan, manual_scan_note=scan_note)
            row["status"] = "verified_manual_scan" if got["chuan"] == scan_chuan else "mismatch_manual_scan"
            continue
        if not row["source_chuans"]:
            row["status"] = "reconstructed_no_source_chuan"
        elif got["chuan"] in row["source_chuans"]:
            if len(row["source_chuans"]) > 1:
                row["status"] = "verified_multi_pan"
            else:
                row["status"] = "verified_explicit" if row["yj_basis"] == "explicit" else "verified_inferred"
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
    "verified_manual_scan": "原始扫描页人工确认一致",
    "reconstructed_no_source_chuan": "可复排，原书三传未能机读",
    "missing_input": "缺日干支/月将/占时",
    "mismatch_explicit": "明载参数复盘与机读原传不同",
    "mismatch_manual_scan": "原始扫描页人工确认仍不一致",
    "inferred_unresolved": "月将仅为月份推定，尚不足以定盘",
    "source_chuan_ambiguous": "OCR 盘面三传读取有歧义",
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
    manual = [r for r in rows if r["status"] in {"verified_manual_scan", "mismatch_manual_scan"}]
    if manual:
        lines.extend(["", "## 原始扫描页人工核验", ""])
        for r in manual:
            lines.append(
                f"- **{r['volume']}册第{r['index']}例**：{r['manual_scan_note']}；"
                f"复盘 `{r['computed_chuan']}`；结论：{STATUS_CN[r['status']]}。"
            )
    lines.extend(["", "## 需要人工复核", ""])
    risky = {"mismatch_explicit", "mismatch_manual_scan", "inferred_unresolved", "source_chuan_ambiguous", "missing_input", "engine_error"}
    for r in rows:
        if r["status"] not in risky:
            continue
        src = " / ".join(r["source_chuans"]) or "未读出"
        got = r.get("computed_chuan") or "无法复排"
        params = "%s %s将%s时" % (r.get("rgz") or "?日", r.get("yj") or "?", r.get("zs") or "?")
        lines.append(f"- **{r['volume']}册第{r['index']}例**（OCR p{r['page']}）{STATUS_CN[r['status']]}；{params}；原传 `{src}`，复盘 `{got}`。")
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
