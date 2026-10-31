#!/usr/bin/env python3
"""把叶飘然公开课与中级校对稿按知识点重组为网站初中级课程。

原则：以原稿小节为最小单位，只调整小节归属和顺序，不删写小节正文；
每节保留原课次与原节名，涉及案例的节另生成盘面截图清单。
"""
from __future__ import annotations

import argparse
import re
from dataclasses import dataclass
from pathlib import Path

from docx import Document


CN = "一二三四五六七八九十百"


@dataclass
class Section:
    source: str
    source_order: int
    index: int
    heading: str
    paragraphs: list[str]
    lesson: int = 0


LESSONS = [
    (1, "先建立正确的术数观与学习方法", "先知道六壬解决什么问题、怎样学习，后面的技法才不会变成死背。", "第一部分 · 入门总纲"),
    (2, "阴阳五行与体用宾主", "阴阳是总纲，体用与宾主负责确定观察位置，五行负责描述变化。", "第一部分 · 入门总纲"),
    (3, "认识一张六壬课盘", "把天地盘、天将、四课、三传放回同一张图，先建立全局结构。", "第二部分 · 起课基础"),
    (4, "太岁月建日辰占时", "先分清一课里的年、月、日、时各管什么，再谈旺衰与应期。", "第二部分 · 起课基础"),
    (5, "月将加时与天地盘", "月将是六壬时间系统的锚点，月将加时是整个盘面转动的起点。", "第二部分 · 起课基础"),
    (6, "贵人起法与十二天将", "先定贵人落点和顺逆，再理解十二天将如何给支神增加人事性质。", "第二部分 · 起课基础"),
    (7, "四课寄宫与阴阳神", "四课从日干日支层层展开，是事情静态结构和主客关系的主体。", "第二部分 · 起课基础"),
    (8, "六亲旬空遁干本命行年", "六亲定角色，旬空与遁干定虚实暗线，本命行年把盘对准具体的人。", "第二部分 · 起课基础"),
    (9, "贼克比用涉害", "有克先从贼克入手，克多再用比用与涉害逐层筛选发用。", "第三部分 · 九宗门取三传"),
    (10, "遥克昴星别责", "无正克时依次转入遥克、昴星和别责，理解退一步取传的逻辑。", "第三部分 · 九宗门取三传"),
    (11, "八专伏吟返吟", "在课体重复、天地盘伏吟或返吟时，用特殊规则找出事情的发动点。", "第三部分 · 九宗门取三传"),
    (12, "旺衰长生与干支关系", "先判断字有没有力气，再按合冲刑害破和长生状态读它怎样变化。", "第四部分 · 判断工具"),
    (13, "八煞", "刑冲破害墓鬼败空是事情受阻、受伤和失序的八类基本方式。", "第四部分 · 判断工具"),
    (14, "九宝", "德合奇仪禄马丁与生旺贵，是课中转凶、成事和获得助力的九类条件。", "第四部分 · 判断工具"),
    (15, "十二支神与十二天将类象", "支神提供事物底象，天将补充人物、行为和性质，二者必须组合使用。", "第四部分 · 判断工具"),
    (16, "格局兼将与取象", "格局负责定性，兼将限定课体，取象要从泛象收束到与占问对应的准象。", "第五部分 · 断课框架"),
    (17, "占断八门与完整判断流程", "把正时、日辰、三传、本命行年、类象和应期排成固定的检查顺序。", "第五部分 · 断课框架"),
    (18, "公开课实战案例", "保留公开课案例的完整讲解，并标出需要从视频补回的原盘。", "第六部分 · 案例精讲"),
    (19, "中级综合案例上", "用占断八门复盘求财、争端与疾病案例，观察多条信息怎样汇成主线。", "第六部分 · 案例精讲"),
    (20, "中级综合案例下", "集中整理胎产、官司牢狱和疾病案例，保留原课的判断边界与验证过程。", "第六部分 · 案例精讲"),
]


def clean_heading(text: str) -> str:
    return text.strip().strip("【】").strip()


def extract_sections(path: Path, source: str, source_order: int) -> list[Section]:
    doc = Document(path)
    out: list[Section] = []
    current: Section | None = None
    title_skipped = False
    for p in doc.paragraphs:
        text = p.text.strip()
        if not text:
            continue
        style = p.style.name if p.style is not None else ""
        is_bracket_heading = text.startswith("【") and text.endswith("】")
        is_heading = style.startswith("Heading") or is_bracket_heading
        if style == "Title" or (not title_skipped and (style == "Heading 1" or "大六壬" in text) and not is_bracket_heading):
            title_skipped = True
            continue
        if is_heading:
            current = Section(source, source_order, len(out) + 1, clean_heading(text), [])
            out.append(current)
        elif current is not None:
            current.paragraphs.append(text)
        else:
            # 正式小节前的讲师署名与“校对说明”是文档元数据，不混进课程正文。
            if not title_skipped:
                title_skipped = True
            continue
    return out


def assign(section: Section) -> int:
    """逐来源分配，确保同一主题跨课程汇总且每个原节只出现一次。"""
    s, n, h = section.source, section.index, section.heading
    if s == "术数本源公开课":
        if n in {6, 7, 8, 9, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29}: return 2
        if n in {14, 15, 16, 17}: return 16
        return 1
    if s == "小白公开课":
        if n <= 15: return 1
        if n in {16, 17}: return 3
        if n in {18, 20, 21, 22, 23, 24, 25, 26, 27}: return 16
        if n in {28, 29}: return 5
        return 17
    if s == "公开课第2讲":
        if n in {6, 7, 8, 16}: return 18
        if n == 15: return 2
        return 1
    if s == "公开课第3讲":
        if n in {5, 6}: return 3
        if n in {7, 8, 9, 10, 11, 19, 20}: return 18
        if n in {13, 14}: return 16
        return 1
    if s == "公开课第4讲":
        if n in {5, 7, 10}: return 17
        if n in {9, 11, 12, 14}: return 18
        if n in {2, 3, 6, 8}: return 4
        return 1
    if s == "中级第1课":
        if n in {10, 11, 13, 14}: return 2
        if n in {6, 16}: return 18
        if n in {7, 8, 9}: return 3
        return 1
    if s == "中级第2课":
        if n in {1, 2, 13, 14, 15}: return 3
        if n in {3, 9, 10, 11, 12}: return 7
        if n == 4: return 8
        if n in {5, 6}: return 5
        return 6
    if s == "中级第3课":
        return 4 if n <= 7 else 8
    if s == "中级第4课": return 9
    if s == "中级第5课": return 11 if n == 14 else 10
    if s == "中级第6课": return 11
    if s == "中级第7课": return 2 if n <= 5 else 12
    if s == "中级第8课": return 13
    if s == "中级第9课": return 19 if n == 20 else 14
    if s == "中级第10课":
        if n <= 6: return 14
        if n <= 10: return 13
        return 15
    if s == "中级第11课":
        return 19 if 8 <= n <= 20 else 17
    if s == "中级第12课":
        return 20 if n in {11, 12, 13, 14, 15, 17, 18, 19, 20, 21, 22} else 17
    raise ValueError(f"未分配：{s} 第{n}节 {h}")


def case_label(section: Section) -> str:
    """同一张盘连续讲数节时只列一次，避免让用户重复截同一张盘。"""
    key = (section.source, section.index)
    labels = {
        ("公开课第2讲", 6): "案例一 丁未日八专课断同性恋",
        ("公开课第2讲", 8): "案例二 来意判断",
        ("公开课第2讲", 16): "案例三 丢失合同的别责课",
        ("公开课第3讲", 7): "三传申酉戌金局 财旺克父母",
        ("公开课第3讲", 8): "财加日干 求财易得",
        ("公开课第3讲", 10): "求财趋势与流年先旺后衰",
        ("公开课第3讲", 19): "一课多断与各术数独立分析",
        ("公开课第3讲", 20): "丁巳日课断婚姻与子女",
        ("公开课第4讲", 9): "案例一 身陷罗网中",
        ("公开课第4讲", 11): "案例二 一课两断 工作与子孙",
        ("公开课第4讲", 14): "案例三 丁酉日占病",
        ("中级第1课", 6): "分类占与实战案例",
        ("中级第1课", 16): "定数 择吉与化解案例",
        ("中级第2课", 1): "实盘构成示例",
        ("中级第2课", 12): "起四课练习盘",
        ("中级第5课", 10): "刚日柔日取法课例",
        ("中级第5课", 14): "八专课预习案例",
        ("中级第9课", 20): "九宝综合课例",
        ("中级第11课", 8): "古例一 两重旧财",
        ("中级第11课", 12): "古例二 外出宴饮起争端",
        ("中级第11课", 16): "当代血液病案例",
        ("中级第12课", 11): "案例一 占何时怀孕",
        ("中级第12课", 14): "案例二 温秀才占生育",
        ("中级第12课", 17): "案例三 官司牢狱",
        ("中级第12课", 19): "案例四 疾病从革课",
    }
    return labels.get(key, "")


def safe_text(text: str) -> str:
    # 防止转录行首被 Markdown 误当标题或列表；不改正文用字。
    return re.sub(r"^(#{1,6}|[-+*]\s)", r"\\\1", text)


def build(source_root: Path, output: Path, checklist: Path) -> None:
    public = source_root / "大六壬公开课"
    middle = source_root / "大六壬中级"
    specs = [
        (public / "1溯术数之本源，悟六壬之精髓-叶飘然.docx", "术数本源公开课"),
        (public / "叶飘然--大六壬小白课1（校正排版版）.docx", "小白公开课"),
        (public / "大六壬公开课2-叶飘然.docx", "公开课第2讲"),
        (public / "大六壬公开课3-叶飘然.docx", "公开课第3讲"),
        (public / "大六壬公开课4-叶飘然_20260903_215402.docx", "公开课第4讲"),
    ]
    specs += [(middle / f"{n}中级大六壬-校对排版版.docx", f"中级第{n}课") for n in range(1, 13)]
    missing = [str(p) for p, _ in specs if not p.exists()]
    if missing:
        raise SystemExit("缺少源文件：\n" + "\n".join(missing))

    sections: list[Section] = []
    for order, (path, name) in enumerate(specs, 1):
        sections.extend(extract_sections(path, name, order))
    for section in sections:
        section.lesson = assign(section)
    if any(not s.paragraphs for s in sections):
        empty = [f"{s.source}第{s.index}节" for s in sections if not s.paragraphs]
        raise SystemExit("空小节：" + "、".join(empty))

    output.mkdir(parents=True, exist_ok=True)
    for old in output.glob("B??-*.md"):
        old.unlink()
    by_lesson = {n: [] for n, *_ in LESSONS}
    for section in sections:
        by_lesson[section.lesson].append(section)
    for n, title, line, part in LESSONS:
        rows = sorted(by_lesson[n], key=lambda x: (x.source_order, x.index))
        chunks = [
            f"# 大六壬初中级课程 第{n}课 · {title}", "",
            f"**本课的一句话**：**{line}**", "",
            f"> **课程分部**：{part}",
            "> **整理方式**：本课按知识点汇集公开课与中级校对稿；原稿小节全文保留，只调整小节顺序。", "",
        ]
        for i, sec in enumerate(rows, 1):
            chunks += [f"## {i}. {sec.heading}", "", f"**来源**：{sec.source} · 原节《{sec.heading}》", ""]
            case = case_label(sec)
            if case:
                chunks += [f"> **盘面待补**：请提供“{sec.source} · {case}”的视频案例截图；本案例后续相邻小节共用此盘。", ""]
            for p in sec.paragraphs:
                chunks += [safe_text(p), ""]
        filename = output / f"B{n:02d}-{title}.md"
        filename.write_text("\n".join(chunks).rstrip() + "\n", encoding="utf-8")

    cases = [s for s in sections if case_label(s)]
    lines = [
        "# 大六壬初中级课程案例盘面截图清单", "",
        "> 以下小节的文字讲解已经收入课程，但源 Word 没有盘面。请按原视频课次和节名提供截图。", "",
    ]
    for i, s in enumerate(cases, 1):
        lesson_title = next(x[1] for x in LESSONS if x[0] == s.lesson)
        lines += [f"{i}. **{s.source} · {case_label(s)}**", f"   - 起始小节：《{s.heading}》", f"   - 网站位置：初中级第{s.lesson}课《{lesson_title}》", ""]
    checklist.write_text("\n".join(lines).rstrip() + "\n", encoding="utf-8")

    in_chars = sum(len(p) for s in sections for p in s.paragraphs)
    out_chars = sum(len(p) for s in sections for p in s.paragraphs)
    print(f"源文档 17 份；原小节 {len(sections)} 节；正文 {in_chars} 字；重组后正文 {out_chars} 字")
    print(f"生成课程 {len(LESSONS)} 课；待补案例盘面 {len(cases)} 处")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--source-root", type=Path, default=Path("/Users/xiaojin/Documents/大六壬公开课文件"))
    ap.add_argument("--output", type=Path, default=Path(__file__).resolve().parents[1] / "content-basic")
    ap.add_argument("--checklist", type=Path, default=Path(__file__).resolve().parent / "初中级课程案例截图清单.md")
    args = ap.parse_args()
    build(args.source_root, args.output, args.checklist)


if __name__ == "__main__":
    main()
