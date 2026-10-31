#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""《大六壬通解》三册课例批量提取工具。

这一层只做可重复、可校验的机械工作：
1. 以独立的“例一：……”为边界切分课例；
2. 记录册别、原书例号、页码、行号、题头和原文；
3. 尽可能提取年月日时，不补造原文没有的干支；
4. 生成 JSON 中间库和待讲解 Markdown；
5. 强制核对上中下三册 75/197/570，防止 OCR 或正则改动后静默漏例。

用法：
  python3 _tools/import_tongjie_cases.py --check
  python3 _tools/import_tongjie_cases.py --volume 上 --json /tmp/tongjie-shang.json
  python3 _tools/import_tongjie_cases.py --volume 上 --markdown /tmp/tongjie-shang.md

JSON/Markdown 是待审核中间产物，不直接覆盖 content/；经白话讲解和盘面
复核后再并入网站，避免把 OCR 讹字批量发布。
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from dataclasses import asdict, dataclass
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
REF = ROOT / "_ref"
SOURCES = {
    "上": REF / "通解_上.txt",
    "中": REF / "通解_中.txt",
    "下": REF / "通解_下.txt",
}
EXPECTED = {"上": 75, "中": 197, "下": 570}

CN_NUM = "一二三四五六七八九十百零〇两"
CASE_RE = re.compile(rf"^例(?P<num>[{CN_NUM}]+|\d+)\s*[：:](?P<title>.*)$")
PAGE_RE = re.compile(r"^第\s*(\d+)\s*页$")
GAN = "甲乙丙丁戊己庚辛壬癸"
ZHI = "子丑寅卯辰巳午未申酉戌亥"
TOP_CATEGORIES = ["天时", "地理", "来意", "婚姻", "胎产", "疾病", "失盗", "出行、行人", "考试",
                  "事业前程", "官司牢狱", "出差", "信息、谋为", "战争", "躲避", "终身", "经济财物", "射覆与应侯杂占"]
SUB_CATEGORIES = ["阴宅", "阳宅", "盗贼", "人口走失", "财物丢失", "动物走失"]


@dataclass
class Case:
    id: str
    volume: str
    index: int
    source_number: str
    title: str
    category: str
    page: int | None
    line_start: int
    line_end: int
    calendar: list[dict[str, str]]
    original: str
    modern_explanation: str = ""
    review_status: str = "待讲解"


def clean_body(lines: list[str]) -> str:
    """只清理重复页眉和空行，不改写古文。"""
    out: list[str] = []
    for line in lines:
        s = line.rstrip()
        if PAGE_RE.match(s.strip()):
            continue
        if s.strip() in {"大六壬通解", "叶飘然大六壬讲义"}:
            continue
        out.append(s)
    return re.sub(r"\n{3,}", "\n\n", "\n".join(out)).strip()


def category_before(lines: list[str], start: int, index: int, volume: str) -> str:
    if index <= 2:
        if volume == "上":
            return "起课教学示例"
    before = lines[:start]
    # 第七章的 13 个编号示例是外编断法，与第六章分类占验分开。
    last_ch7 = max((i for i, x in enumerate(before) if x.strip().startswith("第七章 ")), default=-1)
    if volume == "下" and last_ch7 >= 10000:
        sec = "外编"
        for line in reversed(before[last_ch7:]):
            m = re.match(r"^第[一二三四五六七八九十]+节\s+(.+)$", line.strip())
            if m:
                sec = m.group(1).strip()
                break
        return "第七章外编 · " + sec
    top = ""
    sub = ""
    for line in before:
        s = line.strip()
        m = re.match(r"^[一二三四五六七八九十百]+\s+(.+)$", s)
        if m and m.group(1).strip() in TOP_CATEGORIES:
            top, sub = m.group(1).strip(), ""
        elif top and m and m.group(1).strip() in SUB_CATEGORIES:
            sub = m.group(1).strip()
        m = re.match(r"^[一二三四五六七八九十]+、(.+)$", s)
        if top and m and m.group(1).strip() in SUB_CATEGORIES:
            sub = m.group(1).strip()
    if top:
        return top + ((" · " + sub) if sub else "")
    for line in reversed(lines[:start]):
        s = line.strip()
        m = re.match(r"^(.{1,16}?课)案例[：:]?$", s)
        if m:
            return m.group(1)
    return "未分类"


def trim_case_end(lines: list[str], start: int, end: int, index: int) -> int:
    """最后一例后面往往紧跟下一课的课经，不能吞进本例。"""
    body = lines[start:end]
    for off, line in enumerate(body[1:], 1):
        s = line.strip()
        if index <= 2 and re.match(r"^[一二三四五六七八九十]+、", s):
            return start + off
        if s.startswith(("第六章 ", "第七章 ")):
            return start + off
        mcat = re.match(r"^[一二三四五六七八九十百]+\s+(.+)$", s)
        if mcat and mcat.group(1).strip() in TOP_CATEGORIES:
            return start + off
        msub = re.match(r"^[一二三四五六七八九十]+、(.+)$", s)
        if msub and msub.group(1).strip() in SUB_CATEGORIES:
            return start + off
        if off > 8 and re.match(r"^[一-鿿]{2,12}课$", s) and \
                re.search(r"正议|案验|附议", "\n".join(body[:off])):
            return start + off
    return end


def extract_calendar(text: str) -> list[dict[str, str]]:
    """保留原文粒度：有干支则取干支，只有月份/时支则只取现有内容。"""
    sample = text[:500]
    fields: list[dict[str, str]] = []
    four = re.search(rf"([{GAN}][{ZHI}])(?:年)?\s+([{GAN}][{ZHI}])(?:月)?\s+"
                     rf"([{GAN}][{ZHI}])(?:日)?\s+([{GAN}][{ZHI}])(?:时)?", sample)
    if four:
        return [{"k": k, "v": v} for k, v in zip("年月日时", four.groups())]
    year = re.search(rf"([{GAN}][{ZHI}])年", sample)
    month = re.search(rf"((?:闰)?(?:正|冬|腊|[{CN_NUM}{ZHI}]+)月)", sample)
    day = re.search(rf"([{GAN}][{ZHI}])日", sample)
    hour = re.search(rf"([{GAN}]?[{ZHI}])时", sample)
    for key, match in (("年", year), ("月", month), ("日", day), ("时", hour)):
        if match:
            fields.append({"k": key, "v": match.group(1)})
    return fields


def parse_volume(volume: str) -> list[Case]:
    path = SOURCES[volume]
    lines = path.read_text(encoding="utf-8").splitlines()
    starts: list[tuple[int, re.Match[str], int | None]] = []
    page: int | None = None
    for pos, line in enumerate(lines):
        pm = PAGE_RE.match(line.strip())
        if pm:
            page = int(pm.group(1))
        cm = CASE_RE.match(line.strip())
        if cm:
            starts.append((pos, cm, page))

    cases: list[Case] = []
    for i, (start, match, page) in enumerate(starts, 1):
        end = starts[i][0] if i < len(starts) else len(lines)
        end = trim_case_end(lines, start, end, i)
        # 题头也是古文资料的一部分，放回 original，便于校对。
        original = clean_body(lines[start:end])
        cases.append(Case(
            id=f"tongjie-{volume}-{i:03d}",
            volume=volume,
            index=i,
            source_number=match.group("num"),
            title=match.group("title").strip(),
            category=category_before(lines, start, i, volume),
            page=page,
            line_start=start + 1,
            line_end=end,
            calendar=extract_calendar(original),
            original=original,
        ))
    return cases


def validate(groups: dict[str, list[Case]]) -> list[str]:
    errors: list[str] = []
    ids: set[str] = set()
    for volume, cases in groups.items():
        if len(cases) != EXPECTED[volume]:
            errors.append(f"{volume}册应为 {EXPECTED[volume]} 例，实得 {len(cases)} 例")
        for case in cases:
            if case.id in ids:
                errors.append(f"重复 ID：{case.id}")
            ids.add(case.id)
            if not case.title:
                errors.append(f"{case.id} 缺题头")
            if not case.original:
                errors.append(f"{case.id} 缺原文")
    return errors


def write_json(path: Path, cases: list[Case]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps([asdict(c) for c in cases], ensure_ascii=False, indent=2) + "\n",
                    encoding="utf-8")


def write_markdown(path: Path, cases: list[Case]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    chunks = [
        "# 《大六壬通解》课例待讲解稿",
        "",
        "> 由 `_tools/import_tongjie_cases.py` 自动生成。原文保留；“现代讲解”必须复核后才能入站。",
        "",
    ]
    for case in cases:
        cal = " · ".join(f"{x['k']}：{x['v']}" for x in case.calendar) or "原文未识别出年月日时"
        chunks.extend([
            f"## 【{case.volume}册·第{case.index}例】{case.title}",
            "",
            f"> 原书例号：例{case.source_number} ｜ OCR 页：{case.page or '未知'} ｜ {cal}",
            "",
            "### 古文原文",
            "",
            case.original,
            "",
            "### 现代讲解",
            "",
            "〔待讲解〕",
            "",
        ])
    path.write_text("\n".join(chunks), encoding="utf-8")


def split_book_explanation(text: str) -> tuple[str, str]:
    """书中现代讲解以「解：／解曰：／笔者按：」起首，保留到本例结束。

    只按明载标记分段，不把正议、参议、案验等原断改写成“白话摘要”。
    """
    marker = re.search(r"(?m)^(?:解(?:曰)?|笔者按)[：:]", text)
    if not marker:
        return text.strip(), ""
    return text[:marker.start()].rstrip(), text[marker.start():].strip()


def write_site_markdown(path: Path, cases: list[Case]) -> None:
    """生成站点内容源：原案与书中现代讲解全文照录，不自作摘要。"""
    chunks = [
        "# 大六壬通解案例库",
        "",
        "> 三册原书共收入 842 个独立编号示例：上册 75 例、中册 197 例、下册 570 例。",
        "> 原案与书中现代讲解均按 OCR 校对稿全文照录；不另写总结、提示或代作者加断。",
        "",
    ]
    for case in cases:
        cal = " · ".join(f"{x['k']}{x['v']}" for x in case.calendar) or "原文未载日历"
        original, modern = split_book_explanation(case.original)
        quote = "\n".join("> " + x if x else ">" for x in original.splitlines())
        block = [
            f"### 【通解{case.volume}册{case.index:03d}】{case.title} `{case.category}`",
            "",
            f"**原案信息**：{cal}",
            "",
            "**原书案例原文**",
            "",
            quote,
            "",
        ]
        if modern:
            modern_quote = "\n".join("> " + x if x else ">" for x in modern.splitlines())
            block.extend(["**书中现代讲解（全文照录）**", "", modern_quote, ""])
        block.extend([f"〔出处〕《大六壬通解》{case.volume}册 OCR p{case.page or '未知'}；源文行 {case.line_start}—{case.line_end}。", ""])
        chunks.extend(block)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text("\n".join(chunks), encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser(description="批量提取《大六壬通解》三册课例")
    parser.add_argument("--volume", choices=["上", "中", "下", "全部"], default="全部")
    parser.add_argument("--check", action="store_true", help="只校验数量和基本完整性")
    parser.add_argument("--json", type=Path, help="输出可继续加工的 JSON 中间库")
    parser.add_argument("--markdown", type=Path, help="输出保留原文的待讲解 Markdown")
    parser.add_argument("--site-markdown", type=Path, help="输出可供 build.py 编译的案例库内容源")
    args = parser.parse_args()

    selected = list(SOURCES) if args.volume == "全部" else [args.volume]
    # 校验永远扫三册，即使此次只导出一册。
    groups = {volume: parse_volume(volume) for volume in SOURCES}
    errors = validate(groups)
    for volume in SOURCES:
        with_cal = sum(bool(c.calendar) for c in groups[volume])
        print(f"{volume}册：{len(groups[volume])} 例（识别出日历信息 {with_cal} 例）")
    print(f"合计：{sum(map(len, groups.values()))} 例")
    if errors:
        for error in errors:
            print("✗", error, file=sys.stderr)
        return 1
    print("✓ 数量、ID、题头与原文基本校验通过")

    cases = [case for volume in selected for case in groups[volume]]
    if args.json:
        write_json(args.json, cases)
        print("已写入 JSON：", args.json)
    if args.markdown:
        write_markdown(args.markdown, cases)
        print("已写入 Markdown：", args.markdown)
    if args.site_markdown:
        write_site_markdown(args.site_markdown, cases)
        print("已写入站点内容源：", args.site_markdown)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
