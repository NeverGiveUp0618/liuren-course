/* 网络优先。⚠️ 微信 X5 内核缓存极顽固，会无视 URL 的 ?query 按路径缓存，
   缓存优先会让改完的内容长期看不到——其余几个 App 都因此改成网络优先。
   内容更新只需重跑 build.py 并 push，不必每次 bump 这里。 */
var CACHE = 'liuren-course-v11-tabbar';
var CORE = ['./', './index.html', './style.css', './app.js', './engine.js',
            './data/data-meta.js', './manifest.json'];

self.addEventListener('install', function (e) {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(function (c) {
    return c.addAll(CORE).catch(function () {});   // 单个失败不能拖垮整次安装
  }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (ks) {
    return Promise.all(ks.map(function (k) { return k === CACHE ? null : caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET') return;
  e.respondWith(netFirstButDontHang(e.request));
});

/* ⚠️ 2026-08-25：纯网络优先在微信里会「一进来界面不对、等一下才好」——
   `<link rel=stylesheet>` 是阻塞渲染的，sw 把它的请求也发到网络上，
   网络一慢，样式迟迟不到，页面就先按无样式的默认排版画了出来（内容占满整屏、
   中文回落到宋体），等 CSS 到了才跳回正常。
   改成「网络优先，但不许干等」：超过 TIMEOUT 还没回来就先拿缓存顶上（秒开），
   网络回来照样写进缓存，所以**下一次打开就是新的**——既不牺牲新鲜度，也不白等。
   ⚠️ 不能改成缓存优先：微信 X5 缓存极顽固、还无视 ?query，那会让改完的内容长期看不到。 */
var TIMEOUT = 1500;

function netFirstButDontHang(req) {
  return new Promise(function (resolve) {
    var settled = false;
    function give(res) { if (!settled && res) { settled = true; resolve(res); } }

    var timer = setTimeout(function () {
      if (settled) return;
      caches.match(req, { ignoreSearch: true }).then(give);   // 没缓存就继续等网络
    }, TIMEOUT);

    fetch(req).then(function (res) {
      clearTimeout(timer);
      var copy = res.clone();
      caches.open(CACHE).then(function (c) { c.put(req, copy); }).catch(function () {});
      give(res);        // 若已用缓存应答，这里只是把新版写进缓存，供下次用
    }).catch(function () {
      clearTimeout(timer);
      // 离线：回退缓存；忽略 ?v= 差异，否则换了版本号就全部落空
      caches.match(req, { ignoreSearch: true }).then(function (c) {
        give(c || new Response('', { status: 504, statusText: 'offline' }));
      });
    });
  });
}
