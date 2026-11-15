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
