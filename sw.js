/* 网络优先。⚠️ 微信 X5 内核缓存极顽固，会无视 URL 的 ?query 按路径缓存，
   缓存优先会让改完的内容长期看不到——其余几个 App 都因此改成网络优先。
   内容更新只需重跑 build.py 并 push，不必每次 bump 这里。 */
var CACHE = 'liuren-course-v4-quizfix';
var CORE = ['./', './index.html', './style.css', './app.js',
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
  e.respondWith(
    fetch(e.request).then(function (res) {
      var copy = res.clone();
      caches.open(CACHE).then(function (c) { c.put(e.request, copy); }).catch(function () {});
      return res;
    }).catch(function () {
      // 离线：回退到缓存；忽略 ?v= 差异，否则换了版本号就全部落空
      return caches.match(e.request, { ignoreSearch: true });
    })
  );
});
