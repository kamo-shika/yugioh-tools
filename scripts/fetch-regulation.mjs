// 公式カードデータベースからリミットレギュレーション（禁止・制限・準制限）を取り、
// src/data/regulation.json に書く。ビルド前と毎週の定期実行で動く。
// 取れなかったときはファイルを変えずに終了する（前回の内容でページを出す）。
import {writeFileSync} from 'node:fs';

const DB = 'https://www.db.yugioh-card.com/yugiohdb/forbidden_limited.action';
const SITE = 'https://www.yugioh-card.com/japan/event/limitregulation/';
const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36';
const OUT = new URL('../src/data/regulation.json', import.meta.url);
const SECTIONS = ['update', 'forbidden', 'limited', 'semi_limited', 'release_of_restricted'];

const get = async url => {
  const r = await fetch(url, {headers: {'User-Agent': UA}});
  if (!r.ok) throw new Error(`${url}: ${r.status}`);
  return r.text();
};

const ENTITIES = {"alpha": "α", "Alpha": "Α", "beta": "β", "Beta": "Β", "gamma": "γ", "Gamma": "Γ", "delta": "δ", "Delta": "Δ", "epsilon": "ε", "Epsilon": "Ε", "zeta": "ζ", "Zeta": "Ζ", "eta": "η", "Eta": "Η", "theta": "θ", "Theta": "Θ", "iota": "ι", "Iota": "Ι", "kappa": "κ", "Kappa": "Κ", "lambda": "λ", "Lambda": "Λ", "mu": "μ", "Mu": "Μ", "nu": "ν", "Nu": "Ν", "xi": "ξ", "Xi": "Ξ", "omicron": "ο", "Omicron": "Ο", "pi": "π", "Pi": "Π", "rho": "ρ", "Rho": "Ρ", "sigma": "σ", "Sigma": "Σ", "tau": "τ", "Tau": "Τ", "upsilon": "υ", "Upsilon": "Υ", "phi": "φ", "Phi": "Φ", "chi": "χ", "Chi": "Χ", "psi": "ψ", "Psi": "Ψ", "omega": "ω", "Omega": "Ω", "forall": "∀", "ldquo": "“", "rdquo": "”", "lsquo": "‘", "rsquo": "’", "hellip": "…", "middot": "·", "times": "×", "star": "☆", "hearts": "♥", "spades": "♠", "clubs": "♣", "diams": "♦", "infin": "∞", "nbsp": " ", "rArr": "⇒", "rarr": "→", "larr": "←", "harr": "↔", "deg": "°", "plusmn": "±", "sup2": "²", "frac12": "½", "laquo": "«", "raquo": "»", "bull": "•", "dagger": "†", "sim": "∼"};

const unescape = s =>
  s
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&([a-zA-Z0-9]+);/g, (m, n) => {
      if (n in ENTITIES) return ENTITIES[n];
      console.warn('未対応の文字参照:', m);
      return m;
    })
    .replace(/[⇒\u00a0]/g, c => (c === '⇒' ? '→' : ' '))
    .trim();

const kind = alt =>
  alt === '魔法' ? 'spell' : alt === '罠' ? 'trap' : alt.split('/')[0] === '効果' || alt.split('/')[0] === '通常' ? 'main' : 'extra';

function parse(page) {
  const dates = [...page.matchAll(/<option value="(\d{4}-\d{2}-\d{2})"/g)].map(m => m[1]);
  const out = {};
  SECTIONS.forEach((key, i) => {
    const start = page.indexOf(`id="list_${key}"`);
    if (start < 0) return (out[key] = []);
    const ends = SECTIONS.slice(i + 1)
      .map(k => page.indexOf(`id="list_${k}"`, start + 1))
      .filter(e => e > 0);
    const block = page.slice(start, ends.length ? Math.min(...ends) : undefined);
    out[key] = block
      .split('class="t_row')
      .slice(1)
      .map(row => {
        const name = row.match(/class="name">([\s\S]*?)<\/span>/);
        if (!name) return null;
        const cid = row.match(/cid=(\d+)/);
        const alt = row.match(/alt="([^"]*)"/);
        const status = row.match(/<div class="lr_icon[^"]*">\s*<p>([\s\S]*?)<\/p>/);
        const item = {name: unescape(name[1]), cid: cid ? cid[1] : null, type: kind(alt ? alt[1] : '')};
        if (status) item.status = unescape(status[1]);
        return item;
      })
      .filter(Boolean);
  });
  return {dates, ...out};
}

const LEVEL = {禁止: 0, 制限: 1, 準制限: 2, 解除: 3, 新規: 3};

try {
  const page = await get(DB + '?request_locale=ja');
  const cur = parse(page);
  let upcoming = null;
  try {
    const site = (await get(SITE)).replace(/<[^>]+>/g, '');
    const m = site.match(/最新版：\s*(\d{4})年(\d{2})月(\d{2})日適用/);
    if (m && `${m[1]}-${m[2]}-${m[3]}` > cur.dates[0]) upcoming = `${m[1]}-${m[2]}-${m[3]}`;
  } catch (e) {
    console.warn('公式サイトは取れなかった:', e.message);
  }
  const today = new Date().toISOString().slice(0, 10);
  // DB に未来の適用日が載っていれば、それは発表済みの次回分
  const future = cur.dates.filter(d => d > today);
  const changes = cur.update.map(c => {
    const [from, to] = c.status.includes('→')
      ? c.status.split('→').map(s => s.trim())
      : ['無制限', c.status.replace('新規・', '')];
    const stricter = (LEVEL[to] ?? 3) < (LEVEL[from] ?? 3);
    return {name: c.name, cid: c.cid, type: c.type, from, to: to === '解除' ? '制限解除' : to, stricter};
  });
  const data = {
    date: cur.dates[0],
    previous: cur.dates[1] ?? null,
    upcoming: upcoming ?? future[future.length - 1] ?? null,
    fetched_at: today,
    source: DB + '?request_locale=ja',
    forbidden: cur.forbidden.map(({name, cid, type}) => ({name, cid, type})),
    limited: cur.limited.map(({name, cid, type}) => ({name, cid, type})),
    semi_limited: cur.semi_limited.map(({name, cid, type}) => ({name, cid, type})),
    changes,
  };
  if (!data.forbidden.length || !data.limited.length) throw new Error('リストが空だった');
  writeFileSync(OUT, JSON.stringify(data, null, 1) + '\n');
  console.log(
    `regulation.json: ${data.date} 禁止${data.forbidden.length} 制限${data.limited.length} 準制限${data.semi_limited.length} 変更${changes.length}`,
  );
} catch (e) {
  console.warn('公式DBから取れなかったので、前回の regulation.json のままにする:', e.message);
}
