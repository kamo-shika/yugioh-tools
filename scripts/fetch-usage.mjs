// 大会の予選デッキ分布を集計して src/data/usage.json に書く（規制・環境ページの使用率グラフ用）。
// 出典：ガチまとめ「環境解説と入賞デッキまとめ」（関西の大会の予選分布を毎週まとめている記事）。
// 最新記事 https://gachi-matome.com/trend-yg/ から前の記事へリンクをたどり、
// 最新の大会から WINDOW_DAYS 日以内の大会を合計する。
// 参加人数と分布の合計が合わない大会は読み違いの恐れがあるので集計に入れない。
// 取れなかったときはファイルを変えずに終了する（前回の内容でページを出す）。
import {writeFileSync} from 'node:fs';
import {decodeEntities} from './html-entities.mjs';

const START = 'https://gachi-matome.com/trend-yg/';
const MAX_ARTICLES = 4;
const WINDOW_DAYS = 21;
const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36';
const OUT = new URL('../src/data/usage.json', import.meta.url);
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const get = async url => {
  const r = await fetch(url, {headers: {'User-Agent': UA}});
  if (!r.ok) throw new Error(`${url}: ${r.status}`);
  return r.text();
};

const decode = s => decodeEntities(s).replace(/\u00a0/g, ' ');
const strip = s => decode(s.replace(/<[^>]+>/g, '')).trim();

/** 同じデッキの表記ゆれ（全角半角・大文字小文字）をそろえるキー */
const key = name => name.normalize('NFKC').toUpperCase().replace(/\s/g, '');

/** 1記事から大会ごとの予選分布を取り出す */
export function parseArticle(raw, url) {
  // 本文は数値文字参照で書かれているので、先に文字へ戻す（タグの < > はそのまま）
  const html = raw
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)));
  const title = strip((html.match(/<title>([^<]*)/) || [])[1] || '');
  const year = Number((title.match(/(\d{4})年/) || [])[1]) || new Date().getFullYear();
  const lastBracket = [...title.matchAll(/【([^】]+)】/g)].map(m => m[1]).pop() || '';
  const out = [];
  const re = /<h[23][^>]*>\s*予選デッキ分布\s*<\/h[23]>/g;
  let m;
  while ((m = re.exec(html))) {
    const before = html.slice(0, m.index);
    // 直前の「11/3 第1回 もん杯 個人戦」のような見出し
    const heads = [...before.matchAll(/<h2[^>]*>([^<]*)<\/h2>/g)].map(h => strip(h[1]));
    const dated = heads.reverse().find(h => /^\d{1,2}\/\d{1,2}\s/.test(h));
    let name = dated ? dated.replace(/^\d{1,2}\/\d{1,2}\s+/, '') : lastBracket;
    let date = null;
    if (dated) {
      const [mo, d] = dated.match(/^(\d{1,2})\/(\d{1,2})/).slice(1).map(Number);
      date = `${year}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    } else {
      // 見出しに日付が無い記事は、直前に埋め込まれた大会主催者のポストの日付を使う
      const dates = [...before.matchAll(new RegExp(`(${MONTHS.join('|')}) (\\d{1,2}), (\\d{4})`, 'g'))];
      const last = dates.pop();
      if (last)
        date = `${last[3]}-${String(MONTHS.indexOf(last[1]) + 1).padStart(2, '0')}-${String(last[2]).padStart(2, '0')}`;
    }
    const rest = html.slice(m.index + m[0].length);
    const end = rest.search(/以上、\s*\d+\s*名参加/);
    if (end < 0) continue;
    const players = Number(rest.slice(end).match(/以上、\s*(\d+)\s*名参加/)[1]);
    const lines = decode(rest.slice(0, end))
      .replace(/<br\s*\/?>/g, '\n')
      .replace(/<\/p>/g, '\n')
      .replace(/<[^>]+>/g, '')
      .split('\n')
      .map(s => s.trim())
      .filter(Boolean);
    const decks = {};
    let ones = false;
    for (const line of lines) {
      if (/^以下、?分布\s*1/.test(line)) {
        ones = true;
        continue;
      }
      const hit = line.match(/^(.+?)\s*[⋯…：:\s]\s*(\d+)\s*(?:[(（].*)?$/);
      if (hit && !ones) decks[hit[1].trim()] = (decks[hit[1].trim()] || 0) + Number(hit[2]);
      else if (ones) for (const n of line.split(/[、,]/).map(s => s.trim()).filter(Boolean)) decks[n] = (decks[n] || 0) + 1;
    }
    const sum = Object.values(decks).reduce((a, b) => a + b, 0);
    out.push({name, date, players, url, ok: sum === players && sum > 0, sum, decks});
  }
  const prev = [...new Set([...html.matchAll(/https:\/\/gachi-matome\.com\/trend-yg-(\d{8})\//g)].map(x => x[0]))];
  const canonical = (html.match(/<link rel="canonical" href="([^"]+)"/) || [])[1] || url;
  return {title, tournaments: out, links: prev.filter(p => p !== canonical).sort().reverse()};
}

async function main() {
  const seen = new Set();
  const queue = [START];
  const all = [];
  const articles = [];
  while (queue.length && articles.length < MAX_ARTICLES) {
    const url = queue.shift();
    if (seen.has(url)) continue;
    seen.add(url);
    const html = await get(url);
    const a = parseArticle(html, url);
    const canonical = (html.match(/<link rel="canonical" href="([^"]+)"/) || [])[1];
    if (canonical) seen.add(canonical);
    articles.push({url, title: a.title});
    all.push(...a.tournaments);
    // 一番新しい「前の記事」だけをたどる
    const next = a.links.find(l => !seen.has(l));
    if (next) queue.push(next);
  }
  const dated = all.filter(t => t.date);
  if (!dated.length) throw new Error('予選分布が見つからなかった');
  const newest = dated.map(t => t.date).sort().pop();
  const from = new Date(Date.parse(newest) - WINDOW_DAYS * 86400000).toISOString().slice(0, 10);
  const inWindow = dated.filter(t => t.date >= from);
  const used = inWindow.filter(t => t.ok);
  const skipped = inWindow.filter(t => !t.ok).map(t => ({name: t.name, date: t.date, players: t.players, sum: t.sum}));
  const totals = new Map();
  for (const t of used)
    for (const [n, c] of Object.entries(t.decks)) {
      const k = key(n);
      const cur = totals.get(k) || {name: n, count: 0};
      cur.count += c;
      totals.set(k, cur);
    }
  const total = used.reduce((s, t) => s + t.players, 0);
  if (!total) throw new Error('集計できる大会が無かった');
  const decks = [...totals.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'ja'));
  const data = {
    fetched_at: new Date().toISOString().slice(0, 10),
    from,
    to: newest,
    total,
    source: {title: 'ガチまとめ「環境解説と入賞デッキまとめ」', url: START, region: '関西の大会の予選'},
    tournaments: used
      .sort((a, b) => b.date.localeCompare(a.date))
      .map(({name, date, players, url}) => ({name, date, players, url})),
    skipped,
    decks,
  };
  writeFileSync(OUT, JSON.stringify(data, null, 1) + '\n');
  console.log(`usage.json: ${from}〜${newest} ${used.length}大会 ${total}人 デッキ${decks.length}種（除外${skipped.length}）`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(e => console.warn('使用率データを取れなかったので、前回の usage.json のままにする:', e.message));
}
