# 六壬课程 · liuren-course

把叶飘然《大六壬通解》按**知识依赖顺序**重排的一套自学教程。一课一课往下读，
读完能自己起课、自己断课。五术堂导航的第 8 个入口（待接）。

2026-08-23 起写，当前 **25 课已成 3 课**。

## ⭐ 内容源在 content/，data/ 全是产物

```
content/                      本仓库              
  00-总目录与学习路线.md   ─┐
  01-…md  02-…md  03-…md   ├─ build.py ─→  data/data-course.js   （课文，按需加载）
                           ─┘                data/data-meta.js     （首屏，含 25 课计划表）
```

⚠️ **改 data/*.js 没有意义**，下次构建就被覆盖。内容只改 `content/*.md`。

⚠️ **未成课的标题、一句话、分部分，只有 `00-总目录与学习路线.md` 一个来源**——
build.py 从那张表里解析出 25 课的计划表交给前端。别在 app.js 里另抄一份，两处早晚对不上。
（liuren-game 和 bazi-game 都踩过「知识说明与 JS 数据结构不一致」的坑。）

## 改内容的流程

```bash
python3 build.py && node smoke.js        # 构建 + 冒烟
python3 _tools/_verify_cite.py           # 引文逐条回查原书页码
python3 _tools/_audit_pan.py             # 盘面复算，与课文里的表逐字比对
```

`smoke.js` 需要 jsdom：`npm i --no-save jsdom`（没装会自动借用 ../bazi-course/node_modules）。

## ⭐ 两个自检脚本，改完内容一定要跑

| 脚本 | 查什么 | 抓到过什么 |
|---|---|---|
| `_tools/_verify_cite.py` | 每条「」引文回原书 OCR 按页核对 | **三处页码错标**、**一处给引文私加了"地盘"二字** |
| `_tools/_audit_pan.py` | 内置起课引擎复算课文里每张盘（天盘/贵人顺逆/四课/贼克三传），与 md 表格逐字比对 | 当前 0 处不符 |

⭐ 一个只会打印通过的脚本毫无价值。`_verify_cite.py` 的价值就在于它**真的报过错**；
改了检查逻辑，先确认它对已知的坏数据仍会报警。

## 出处口径

`〔通解上 p21｜PDF p36〕` —— 前者是**书内印刷页码**，后者是 **PDF／OCR 校对稿页码**，
两者**恒定相差 15**（PDF 页 − 15 ＝ 书内页）。纸书和电子版都能直接翻到。

OCR 校对版在 `马老师项目/大六壬笔记提炼/`，另有按课程目录重排的初/中/高级教材在
`马老师项目/南南-大六壬教材项目/`。

## 三种盘会被渲染成真盘（mdlite.py）

markdown 里这么写，就会渲染成盘而不是表格：

| 写法 | 渲染成 |
|---|---|
| `\|地盘\|子\|丑\|…\|亥\|` ＋ `\|天盘\|…\|` ＋ `\|天将\|…\|` | 方形式盘（外圈十二格的位置＝地盘） |
| `\| \|第四课\|第三课\|第二课\|第一课\|` ＋ 天将/上神/下神 | 四课盘（**从右到左**，最右是第一课） |
| `\| \|传\|遁干\|六亲\|天将\|` ＋ 初传/中传/末传 | 三传竖列 |

认不出的（缺行、地支不合法、原书没给全的占位表）**退回普通表格，不硬套**——
一眼能看出这里原书就是缺的。四课与三传里的干支按五行上色，方盘不上色（十二格全彩反而看不清）。

## 三个坑（照其余几个 App，别拆）

1. **history 路由包装** —— 套壳 `view.html` 的 iframe 与顶层共享同一条 session history。
   若本站不碰 history，读到课文深处一次侧滑会直接退出整个 App 回导航首页。
   `show()` 前进时 pushState，回到栈上已有的屏用 `history.go(-n)` 折叠，
   `popstate` 只移动指针**绝不截断栈**（截断会让 forward 找不到原来那屏，smoke 有断言锁住）。
2. **`wst-frame-guard`** —— iframe 内给 `<html>` 加此 class，隐藏自带返回入口，交给套壳顶栏。
3. **sw.js 网络优先 + 按需加载带 `?v=`** —— 微信 X5 内核缓存极顽固，会无视 `?query` 按路径缓存。
   `data-course.js` 是按需加载的大文件，**必须带 `?v=`**，只 bump sw 版本救不了它；
   sw 离线回退要 `ignoreSearch: true`，否则换了版本号就全部落空。

## localStorage 键

⚠️ 这些键会被五术堂导航首页的学习看板读取，改名要同步改看板。

| 键 | 结构 |
|---|---|
| `liuren_course_read` | `{课id: 阅读百分比 0-100}`，≥90 视为已读 |
| `liuren_course_last` | `{scr, id}` 供「继续读」 |
| `liuren_course_pos` | `{课id: scrollTop}` —— 长文回来接着读（≥95% 的不再跳回） |
| `liuren_course_counts` | `{lesson, planned, done}` —— 写给导航看板当**分母** |
| `liuren_course_theme` | `null`(跟随系统) / `'light'` / `'dark'` |

## 文件

```
content/*.md    ⭐内容源
build.py        content → data/*.js
mdlite.py       零依赖 markdown 转换器（含三种盘的识别）
index.html      页面骨架
style.css       青金蓝与琥珀（含深色模式）
app.js          路由 / 渲染 / 起盘台 / 搜索定位 / 阅读位置
smoke.js        jsdom 冒烟测试（57 项）
data/*.js       产物，勿手改
_tools/         引文回查、盘面复算、docx 提取
_ref/           参考资料
sw.js           Service Worker（网络优先）
manifest.json   PWA
icon180/192/512.png
```

## 待办

- 22 课未写（第 4 课起）。写法与自检标准见 `content/00-总目录与学习路线.md` 和上面两个脚本。
- 五术堂导航入口未接。
