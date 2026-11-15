// デッキの使用率を3つの情報源から集計して src/data/usage.json に書く（規制・環境ページの円グラフ用）。
// - 全国：TCG PORTAL「環境分析」（SNSなどに出た大会の入賞デッキ、直近30日）
// - 関東：カードラボ 秋葉原店「ランキングデュエル優勝デッキまとめ」（直近3週）
// - 関西：ガチまとめ「環境解説と入賞デッキまとめ」の予選デッキ分布（最新の大会から3週間）。
//   参加人数と分布の合計が合わない大会は読み違いの恐れがあるので集計に入れない。
// 取れなかったソースは前回の内容のまま残す。
import {readFileSync, writeFileSync} from 'node:fs';
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

const day = d => new Date(d).toISOString().slice(0, 10);
const keyTotals = entries => {
  const totals = new Map();
  for (const [n, c] of entries) {
    const k = key(n);
    const cur = totals.get(k) || {name: n, count: 0};
    cur.count += c;
    totals.set(k, cur);
  }
  return [...totals.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'ja'));
};

/** 関西：ガチまとめの予選デッキ分布（参加者全員のデッキ） */
async function kansai() {
  const seen = new Set();
  const queue = [START];
  const all = [];
  let n = 0;
  while (queue.length && n < MAX_ARTICLES) {
    const url = queue.shift();
    if (seen.has(url)) continue;
    seen.add(url);
    n++;
    const html = await get(url);
    const a = parseArticle(html, url);
    const canonical = (html.match(/<link rel="canonical" href="([^"]+)"/) || [])[1];
    if (canonical) seen.add(canonical);
    all.push(...a.tournaments);
    const next = a.links.find(l => !seen.has(l));
    if (next) queue.push(next);
  }
  const dated = all.filter(t => t.date);
  if (!dated.length) throw new Error('予選分布が見つからなかった');
  const newest = dated.map(t => t.date).sort().pop();
  const from = day(Date.parse(newest) - WINDOW_DAYS * 86400000);
  const inWindow = dated.filter(t => t.date >= from);
  const used = inWindow.filter(t => t.ok);
  const total = used.reduce((s, t) => s + t.players, 0);
  if (!total) throw new Error('集計できる大会が無かった');
  return {
    id: 'kansai',
    label: '関西',
    metric: '予選の使用者数',
    unit: '人',
    from,
    to: newest,
    total,
    sample: `${used.length}大会・予選${total}人`,
    note: '関西の店舗大会（CS）の予選に出た全員のデッキ。',
    source: {title: 'ガチまとめ「環境解説と入賞デッキまとめ」', url: START},
    events: used
      .sort((a, b) => b.date.localeCompare(a.date))
      .map(({name, date, players, url}) => ({name, date, players, url})),
    skipped: inWindow.filter(t => !t.ok).length,
    decks: keyTotals(used.flatMap(t => Object.entries(t.decks))),
  };
}

/** 関東：カードラボ 秋葉原店のランキングデュエル優勝デッキ（週ごとのブログ） */
const CLABO = 'https://www.c-labo.jp/shop/stakihabara/blog/';
const CLABO_WEEKS = 3;

export function parseClabo(raw, year) {
  const lines = decodeEntities(raw)
    .replace(/<br\s*\/?>/g, '\n')
    .replace(/<\/(p|h\d|div|li)>/g, '\n')
    .replace(/<[^>]+>/g, '')
    .split('\n')
    .map(s => s.replace(/ /g, ' ').trim())
    .filter(Boolean);
  const wins = [];
  lines.forEach((line, i) => {
    const m = line.match(/開催日：\s*(\d{1,2})月(\d{1,2})日\s*参加人数：\s*(\d+)\s*名/);
    if (!m) return;
    let j = i - 1;
    while (j >= 0 && (/^※/.test(lines[j]) || /^【.*】$/.test(lines[j]))) j--;
    const deck = lines[j];
    if (!deck || /開催日|優勝者/.test(deck)) return;
    // 「光と闇の儀式+アルス＝マグナ」のような混合は、先頭のテーマで数える
    const main = deck.split(/\s*[+＋]\s*/)[0].trim();
    wins.push({
      deck,
      main,
      date: `${year}-${String(m[1]).padStart(2, '0')}-${String(m[2]).padStart(2, '0')}`,
      players: Number(m[3]),
    });
  });
  return wins;
}

async function kanto() {
  const list = await get(CLABO);
  const posts = [...list.matchAll(/<a[^>]+href="(\/shop\/stakihabara\/blog\/\d+\/?)"[^>]*>([\s\S]*?)<\/a>/g)]
    .map(m => ({url: new URL(m[1], CLABO).href, title: strip(m[2])}))
    .filter(p => /遊戯王/.test(p.title) && /ランキングデュエル優勝/.test(p.title));
  const uniq = [...new Map(posts.map(p => [p.url, p])).values()].slice(0, CLABO_WEEKS);
  if (!uniq.length) throw new Error('優勝デッキまとめの記事が見つからなかった');
  const wins = [];
  for (const p of uniq) {
    const html = await get(p.url);
    const posted = (html.match(/(\d{4})\.(\d{2})\.(\d{2})/) || [])[1] || String(new Date().getFullYear());
    let ws = parseClabo(html, Number(posted));
    // 年をまたぐ週（12月の大会を1月に投稿）の補正
    ws = ws.map(w => (w.date.slice(5, 7) === '12' && html.match(/\d{4}\.01\.\d{2}/) ? {...w, date: `${Number(posted) - 1}${w.date.slice(4)}`} : w));
    wins.push(...ws);
  }
  if (!wins.length) throw new Error('優勝デッキが読めなかった');
  const dates = wins.map(w => w.date).sort();
  return {
    id: 'kanto',
    label: '関東',
    metric: '優勝回数',
    unit: '回',
    from: dates[0],
    to: dates[dates.length - 1],
    total: wins.length,
    sample: `ランキングデュエル${wins.length}大会の優勝`,
    note: 'カードラボ 秋葉原店のランキングデュエル（公認大会）で優勝したデッキ。混合デッキは先頭のテーマで数えた。',
    source: {title: 'カードラボ 秋葉原店「ランキングデュエル優勝デッキまとめ」', url: CLABO},
    events: uniq.map(p => ({name: p.title.replace(/^【遊戯王OCG】/, ''), url: p.url})),
    skipped: 0,
    decks: keyTotals(wins.map(w => [w.main, 1])),
  };
}

/** 全国：TCG PORTAL の環境分析（SNSなどに出た大会の入賞デッキを集計、毎日更新） */
const PORTAL = 'https://tcg-portal.jp/yugioh/meta-analysis';

export function parsePortal(raw) {
  const html = raw.replace(/<!-- -->/g, '');
  const head = html.match(/(\d+)件のデッキを集計（期間:\s*(\d{4}-\d{2}-\d{2})\s*～\s*(\d{4}-\d{2}-\d{2})）/);
  if (!head) throw new Error('集計件数・期間が見つからなかった');
  const block = html.slice(head.index, html.indexOf('</noscript>', head.index));
  const rows = [...block.matchAll(/<p class="font-medium[^"]*">([^<]+)<\/p><p[^>]*>(\d+)回の大会入賞<\/p>[\s\S]*?シェア<\/p><p[^>]*>([\d.]+)%<\/p>/g)].map(
    m => ({name: decodeEntities(m[1]).trim(), count: Number(m[2]), share: Number(m[3])}),
  );
  return {decks: Number(head[1]), from: head[2], to: head[3], rows};
}

async function national() {
  const p = parsePortal(await get(PORTAL));
  if (p.rows.length < 5) throw new Error('ランキングが読めなかった');
  const total = p.rows.reduce((s, r) => s + r.count, 0);
  return {
    id: 'national',
    label: '全国',
    metric: '入賞回数',
    unit: '回',
    from: p.from,
    to: p.to,
    total,
    sample: `入賞デッキ${p.decks}件`,
    note: 'SNSなどに出た全国の大会の入賞デッキ。1つのデッキが複数テーマに数えられることがあるので、テーマの入賞回数の合計を100%として割合を出し直している（TCG PORTAL のシェア％とは少し違う）。',
    source: {title: 'TCG PORTAL「環境分析」', url: PORTAL},
    events: [],
    skipped: 0,
    decks: p.rows.map(({name, count}) => ({name, count})),
  };
}

async function main() {
  let prev = {sources: []};
  try {
    prev = JSON.parse(readFileSync(OUT, 'utf8'));
  } catch {
    /* 初回 */
  }
  const fetched_at = day(Date.now());
  const sources = [];
  for (const [id, fn] of [['national', national], ['kanto', kanto], ['kansai', kansai]]) {
    try {
      const s = await fn();
      sources.push({...s, fetched_at});
      console.log(`${s.label}: ${s.from}〜${s.to} ${s.sample} デッキ${s.decks.length}種`);
    } catch (e) {
      const old = (prev.sources || []).find(s => s.id === id);
      console.warn(`${id} は取れなかったので前回のまま:`, e.message);
      if (old) sources.push(old);
    }
  }
  if (!sources.length) throw new Error('どのソースも取れなかった');
  writeFileSync(OUT, JSON.stringify({sources}, null, 1) + '\n');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(e => console.warn('使用率データを取れなかったので、前回の usage.json のままにする:', e.message));
}
