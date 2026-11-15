// オフラインでも開けるようにする最小限の Service Worker。
// - ファイル名にハッシュが付いた assets/ は中身が変わらないので、キャッシュがあればそれを使う
// - それ以外（index.html など）は毎回サーバーに確かめる（ブラウザの HTTP キャッシュも使わない）。
//   GitHub Pages は10分キャッシュさせるので、そのままだと公開直後に古い版が出てしまう
// - つながらないときだけキャッシュから返す
const CACHE = 'yugioh-tools-v2';

self.addEventListener('install', event => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then(c => c.addAll(['./', 'manifest.webmanifest', 'icon-192.png']))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches
      .keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

const save = (req, res) => {
  if (res.ok) {
    const copy = res.clone();
    caches.open(CACHE).then(c => c.put(req, copy));
  }
  return res;
};

self.addEventListener('fetch', event => {
  const req = event.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin) return;
  if (url.pathname.endsWith('/version.json')) return; // 版の確認は素通し

  if (url.pathname.includes('/assets/')) {
    event.respondWith(caches.match(req).then(hit => hit || fetch(req).then(res => save(req, res))));
    return;
  }

  const fresh = req.mode === 'navigate' ? fetch(req.url, {cache: 'no-cache'}) : fetch(req, {cache: 'no-cache'});
  event.respondWith(
    fresh
      .then(res => save(req, res))
      .catch(() => caches.match(req).then(hit => hit || caches.match('./'))),
  );
});
