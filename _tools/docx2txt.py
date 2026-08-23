import sys,zipfile,re
from xml.etree import ElementTree as ET
W='{http://schemas.openxmlformats.org/wordprocessingml/2006/main}'
def conv(p):
    z=zipfile.ZipFile(p)
    x=z.read('word/document.xml')
    r=ET.fromstring(x)
    out=[]
    for para in r.iter(W+'p'):
        t=''.join(n.text or '' for n in para.iter(W+'t'))
        out.append(t)
    return '\n'.join(out)
if __name__=='__main__':
    print(conv(sys.argv[1]))
