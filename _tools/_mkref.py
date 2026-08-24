# -*- coding: utf-8 -*-
"""从 OCR 校对版 docx 重建 _ref/ 下的原书全文（零依赖，docx 就是个 zip）。

⚠️ 这些 txt **不进 git**（.gitignore 挡着）——是版权书籍全文，只在本机供
   _verify_cite.py 回查引文、以及查证课例时用。换机器就跑一遍这个脚本。

用法：python3 _tools/_mkref.py
"""
import zipfile, re, os, sys

SRC_DIR = ("/Users/xiaojin/Documents/文稿同步文件夹/02_项目 (Projects)/"
           "马老师项目/大六壬笔记提炼")
OUT_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '_ref')

MAP = {
    "大六壬通解 叶飘然大六壬讲义 上册_OCR校对版.docx": "通解_上.txt",
    "大六壬通解 叶飘然大六壬讲义 中册_OCR校对版.docx": "通解_中.txt",
    "大六壬通解 叶飘然大六壬讲义 下册_OCR校对版.docx": "通解_下.txt",
    "图解 六壬大全（第1部 占法及神煞）_OCR校对版.docx": "大全1_占法神煞.txt",
    "图解 六壬大全（第2部 吉凶占断）_OCR校对版.docx": "大全2_吉凶占断.txt",
    "图解 六壬大全（第3部 毕法赋）_OCR校对版.docx": "大全3_毕法赋.txt",
}


def docx_text(path):
    """<w:p> 一段一行，<w:br/> 也算换行。段落顺序就是正文顺序。"""
    xml = zipfile.ZipFile(path).read('word/document.xml').decode('utf-8')
    xml = re.sub(r'<w:br[^>]*/>', '\n', xml)
    lines = []
    for p in re.findall(r'<w:p\b.*?</w:p>|<w:p\b[^>]*/>', xml, re.S):
        t = ''.join(re.findall(r'<w:t[^>]*>(.*?)</w:t>', p, re.S))
        for a, b in (('&amp;', '&'), ('&lt;', '<'), ('&gt;', '>'),
                     ('&quot;', '"'), ('&apos;', "'")):
            t = t.replace(a, b)
        lines.append(t)
    return '\n'.join(lines)


def main():
    if not os.path.isdir(SRC_DIR):
        sys.exit('✗ 找不到源目录，docx 可能挪了位置：\n   ' + SRC_DIR)
    os.makedirs(OUT_DIR, exist_ok=True)
    for src, dst in MAP.items():
        fp = os.path.join(SRC_DIR, src)
        if not os.path.exists(fp):
            print('  跳过（缺文件）：', src)
            continue
        txt = docx_text(fp)
        open(os.path.join(OUT_DIR, dst), 'w', encoding='utf-8').write(txt)
        print('  %-20s %7d 字' % (dst, len(txt)))
    print('✓ 原书全文已重建到 _ref/（不进 git）')


if __name__ == '__main__':
    main()
