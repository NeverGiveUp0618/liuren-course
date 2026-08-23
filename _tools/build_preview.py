# -*- coding: utf-8 -*-
"""大六壬教材 markdown → 预览网页。markdown 是源，本文件只做渲染。"""
import re,os,html,json
OB="/Users/xiaojin/Documents/文稿同步文件夹/03_学习 (Learning)/Seafile/学习资料/自创项目/liuren-course/content"
OUT="/private/tmp/claude-501/-Users-xiaojin/404e36e5-811f-4d03-801d-25a063f69971/scratchpad/liuren-course.html"
Z=list("子丑寅卯辰巳午未申酉戌亥")
# 方盘的宫位顺序（顺时针，从左上巳开始）与 grid 坐标
CELLS=[("巳",1,1),("午",1,2),("未",1,3),("申",1,4),
       ("酉",2,4),("戌",3,4),("亥",4,4),("子",4,3),
       ("丑",4,2),("寅",4,1),("卯",3,1),("辰",2,1)]

def esc(s): return html.escape(s,quote=False)
def inline(s):
    s=esc(s)
    s=re.sub(r'\[\[([^\]]+)\]\]',lambda m:'<span class="wiki">'+m.group(1).split('|')[0]+'</span>',s)
    s=re.sub(r'\*\*(.+?)\*\*',r'<strong>\1</strong>',s)
    s=re.sub(r'`([^`]+)`',r'<code>\1</code>',s)
    return s

def pan_html(dp,tp,tj,caption=""):
    """dp:地盘支列表(固定) tp:{地盘支:天盘支} tj:{地盘支:天将} → 方形式盘"""
    cells=[]
    for z,r,c in CELLS:
        t=tp.get(z,"")
        g=tj.get(z,"")
        cells.append(f'<div class="gong" style="grid-row:{r};grid-column:{c}" data-dp="{z}" data-tp="{t}" data-tj="{g}">'
                     f'<span class="tj">{g}</span><span class="tp">{t}</span><span class="dp">{z}</span></div>')
    return ('<div class="panwrap"><div class="pan">'+''.join(cells)+
            f'<div class="panmid">{caption}</div></div>'
            '<p class="panlegend"><span class="k tj">天将</span><span class="k tp">天盘</span><span class="k dp">地盘</span>'
            '　外圈十二格的<b>位置</b>就是地盘，格里的大字是天盘</p></div>')

def try_pan(tbl):
    """把 |地盘|天盘|天将| 三行表转成式盘"""
    head=[c.replace('*','').strip() for c in tbl[0]]
    if head[0]!='地盘' or len(head)!=13: return None
    order=head[1:]
    rows={ [c.replace('*','').strip() for c in r][0]:[c.replace('*','').strip() for c in r][1:] for r in tbl[1:]}
    if '天盘' not in rows: return None
    tp=dict(zip(order,rows['天盘']))
    tj=dict(zip(order,rows.get('天将',['']*12)))
    return pan_html(order,tp,tj)

def table_html(tbl):
    p=try_pan(tbl)
    if p: return p
    out=['<div class="tw"><table><thead><tr>']
    for c in tbl[0]: out.append('<th>'+inline(c.strip())+'</th>')
    out.append('</tr></thead><tbody>')
    for r in tbl[1:]:
        out.append('<tr>'+''.join('<td>'+inline(c.strip())+'</td>' for c in r)+'</tr>')
    out.append('</tbody></table></div>')
    return ''.join(out)

def md2html(md):
    lines=md.split('\n'); out=[]; i=0
    while i<len(lines):
        ln=lines[i]
        if ln.startswith('```'):
            buf=[];i+=1
            while i<len(lines) and not lines[i].startswith('```'): buf.append(lines[i]);i+=1
            i+=1; out.append('<pre class="board">'+esc('\n'.join(buf))+'</pre>'); continue
        if re.match(r'^\|',ln):
            tbl=[]
            while i<len(lines) and lines[i].startswith('|'):
                row=[c for c in lines[i].strip().strip('|').split('|')]
                if not re.match(r'^[\s:\-|]+$',lines[i]): tbl.append(row)
                i+=1
            out.append(table_html(tbl)); continue
        if ln.startswith('>'):
            buf=[]
            while i<len(lines) and lines[i].startswith('>'):
                buf.append(lines[i].lstrip('>').strip()); i+=1
            txt='<br>'.join(inline(b) for b in buf if b)
            cls='quote'
            j=''.join(buf)
            if '⚠' in j: cls='warn'
            elif '⭐' in j: cls='star'
            elif '💡' in j: cls='tip'
            elif '〔通解' in j: cls='cite'
            out.append(f'<blockquote class="{cls}">{txt}</blockquote>'); continue
        m=re.match(r'^(#{1,4}) (.+)$',ln)
        if m:
            lv=len(m.group(1)); out.append(f'<h{lv}>{inline(m.group(2))}</h{lv}>'); i+=1; continue
        if re.match(r'^---+$',ln): out.append('<hr>'); i+=1; continue
        if re.match(r'^[-*] ',ln) or re.match(r'^\d+\. ',ln):
            ol=bool(re.match(r'^\d+\. ',ln)); tag='ol' if ol else 'ul'; items=[]
            while i<len(lines) and (re.match(r'^[-*] ',lines[i]) or re.match(r'^\d+\. ',lines[i]) or lines[i].startswith('   ')):
                if lines[i].startswith('   ') and items: items[-1]+=' '+lines[i].strip()
                else: items.append(re.sub(r'^([-*]|\d+\.) ','',lines[i]))
                i+=1
            out.append(f'<{tag}>'+''.join('<li>'+inline(t)+'</li>' for t in items)+f'</{tag}>'); continue
        if ln.strip()=='': i+=1; continue
        buf=[]
        while i<len(lines) and lines[i].strip() and not re.match(r'^(#|>|\||```|---|[-*] |\d+\. )',lines[i]):
            buf.append(lines[i]); i+=1
        out.append('<p>'+inline(' '.join(buf))+'</p>')
    return '\n'.join(out)

files=sorted(f for f in os.listdir(OB) if f.endswith('.md'))
docs=[]
for f in files:
    md=open(os.path.join(OB,f)).read()
    title=re.search(r'^# (.+)$',md,re.M).group(1)
    short=title.split('·')[-1].strip() if '·' in title else title
    num=re.match(r'^第(\d)课',title)
    docs.append({'id':f[:2],'title':title,'short':short,
                 'label':('第 '+num.group(1)+' 课') if num else '总目录',
                 'html':md2html(md)})
open(OUT.replace('.html','.json'),'w').write(json.dumps(docs,ensure_ascii=False))
print("解析完成：",[(d['id'],d['short']) for d in docs])
