import regulationJson from './data/regulation.json';
import metaJson from './data/meta.json';

export type CardType = 'main' | 'extra' | 'spell' | 'trap';
export interface RegCard {
  name: string;
  cid: string | null;
  type: string;
}
export interface RegChange extends RegCard {
  from: string;
  to: string;
  stricter: boolean;
}
export interface Regulation {
  date: string;
  previous: string | null;
  upcoming: string | null;
  fetched_at: string;
  source: string;
  forbidden: RegCard[];
  limited: RegCard[];
  semi_limited: RegCard[];
  changes: RegChange[];
}
export interface MetaDeck {
  name: string;
  note: string;
  /** 遊戯王カードWikiのページ名が【name】と違うときだけ指定（【】込み） */
  wiki?: string;
  /** 公式DB検索の語が name と違うとき、または効果文で探すとき（text: true）だけ指定 */
  db?: {keyword?: string; text?: boolean};
}
export interface Meta {
  updated: string;
  regulation: string;
  source: {title: string; url: string; modified: string};
  note: string;
  summary: string;
  tiers: {tier: string; decks: MetaDeck[]}[];
  history: {from: string; top: string[]}[];
}

export const regulation = regulationJson as Regulation;
export const meta = metaJson as Meta;

export const TYPE_LABEL: Record<CardType, string> = {
  main: 'モンスター',
  extra: 'EXモンスター',
  spell: '魔法',
  trap: '罠',
};
export const TYPES: CardType[] = ['main', 'extra', 'spell', 'trap'];

export const cardUrl = (cid: string | null) =>
  cid
    ? `https://www.db.yugioh-card.com/yugiohdb/card_search.action?ope=2&cid=${cid}&request_locale=ja`
    : undefined;

/** デッキの遊戯王カードWikiページ（例：【エルフェンノーツ】） */
export const deckWikiUrl = (d: MetaDeck) =>
  `https://yugioh-wiki.net/index.php?${encodeURIComponent(d.wiki ?? `【${d.name}】`)}`;

/** 公式DBでテーマのカードを探す（既定はカード名検索、text: true なら効果文で検索） */
export const deckDbUrl = (d: MetaDeck) =>
  'https://www.db.yugioh-card.com/yugiohdb/card_search.action?' +
  new URLSearchParams({
    ope: '1',
    sess: '1',
    rp: '100',
    keyword: d.db?.keyword ?? d.name,
    stype: d.db?.text ? '2' : '1',
    request_locale: 'ja',
  }).toString();

/** 2026-10-01 → 2026/10/01 */
export const ymd = (d: string) => d.replaceAll('-', '/');

/** 「制限」「禁止」などの区分を CSS の色名にする */
export const levelClass = (s: string) =>
  s === '禁止' ? 'lv-forbidden' : s === '制限' ? 'lv-limited' : s === '準制限' ? 'lv-semi' : 'lv-free';

/** 名前の部分一致（全角・半角や大文字小文字の違いは吸収する） */
export const matches = (name: string, q: string) => {
  const norm = (s: string) => s.normalize('NFKC').toLowerCase().replace(/\s/g, '');
  return norm(name).includes(norm(q));
};
