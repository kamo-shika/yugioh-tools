// 一人回し：デッキレシピの読み込みと、カードの置き場所の管理（画面に依存しない部分）

export type Section = 'main' | 'extra' | 'side';
export type Zone = 'deck' | 'hand' | 'field' | 'grave' | 'banish' | 'extra';
/** 移動先。デッキだけは上か下かを選べる */
export type Destination = Exclude<Zone, 'deck'> | 'deck-top' | 'deck-bottom';

export interface DeckEntry {
  name: string;
  count: number;
  section: Section;
}
export interface Deck {
  name: string;
  entries: DeckEntry[];
}
export interface Card {
  id: number;
  name: string;
  /** エクストラデッキのカード（デッキに戻すとEXへ行く） */
  isExtra: boolean;
}
export interface SoloState {
  cards: Card[];
  /** 各置き場のカードID。デッキは先頭が一番上 */
  zones: Record<Zone, number[]>;
  /** これまでに引いた枚数（初手を含む） */
  drawn: number;
}

export const ZONE_LABEL: Record<Zone, string> = {
  deck: 'デッキ',
  hand: '手札',
  field: '場',
  grave: '墓地',
  banish: '除外',
  extra: 'EX',
};
export const HAND_SIZE = 5;

// ===== 読み込み =====

const LIMIT_LINE = /^(禁止|制限|準制限)カード$/;
const SECTION_HEADERS: [RegExp, Section][] = [
  [/^(メイン(デッキ)?|モンスター(カード)?|魔法(カード)?|罠(カード)?|main(\s*deck)?|monsters?|spells?|traps?)$/i, 'main'],
  [/^(エクストラ(デッキ)?|EX(デッキ)?|extra(\s*deck)?)$/i, 'extra'],
  [/^(サイド(デッキ)?|side(\s*deck)?)$/i, 'side'],
];
const NUM = '([0-9０-９]+)';

const toHalf = (s: string) => s.replace(/[０-９]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xfee0));
const toInt = (s: string) => parseInt(toHalf(s), 10);

/** 見出し行なら区分を返す。「モンスター（18）」「【エクストラデッキ】15枚」のような飾りも許す */
function sectionOf(line: string): Section | null {
  const core = line
    .replace(/^[#＃■□◆◇●○・\-\s【［[]+/, '')
    .replace(/[】］\]]/g, '')
    .replace(/[:：]?\s*[（(]?[0-9０-９]*\s*枚?[)）]?\s*[:：]?$/, '')
    .trim();
  for (const [re, section] of SECTION_HEADERS) if (re.test(core)) return section;
  return null;
}

/** 「カード名 ×3」「3 カード名」「カード名 3枚」のように1行に枚数があれば取り出す */
function inlineEntry(line: string): {name: string; count: number} | null {
  const patterns: [RegExp, number, number][] = [
    [new RegExp(`^(.+?)\\s*[×xX＊*]\\s*${NUM}\\s*枚?$`), 1, 2],
    [new RegExp(`^(.+?)\\s+${NUM}\\s*枚$`), 1, 2],
    [new RegExp(`^(.+?)\\t+${NUM}$`), 1, 2],
    // 「激流葬 2」：名前の後ろに空白と1〜3だけ
    [/^(.+?)\s+([1-3１-３])$/, 1, 2],
    [new RegExp(`^${NUM}\\s*[×xX＊*]?\\s+(.+)$`), 2, 1],
    [new RegExp(`^${NUM}\\s*[×xX＊*]\\s*(.+)$`), 2, 1],
    [new RegExp(`^${NUM}\\s*枚\\s*(.+)$`), 2, 1],
  ];
  for (const [re, ni, ci] of patterns) {
    const m = line.match(re);
    if (m) {
      const name = m[ni].trim().replace(/^《(.+)》$/, '$1');
      const count = toInt(m[ci]);
      if (name && count > 0) return {name, count};
    }
  }
  return null;
}

export interface ParseResult {
  deck: Deck;
  /** 読めなかった行など、本人に見せる注意 */
  warnings: string[];
}

/**
 * 貼り付けた文字からデッキを読む。次の2通りに対応する。
 * - 遊戯王ニューロンのデッキページ（テキスト表示）を全部コピーしたもの
 *   （行番号・カード名・規制・枚数が1行ずつ並ぶ。前後のメニューや説明は無視する）
 * - 手書きのリスト（「カード名 ×3」「3 カード名」など。見出し「エクストラ」「サイド」で区切る）
 */
export function parseDeckText(text: string): ParseResult {
  const raw = text.replace(/\r\n?/g, '\n').split('\n');
  const lines = raw.map(l => l.replace(/ /g, ' ').trim());
  const warnings: string[] = [];

  // ニューロンのページかどうか：カード行の直前に「行番号<TAB>」が付く
  const isNeuron = raw.some(l => /^\d+\t/.test(l)) && lines.some(l => sectionOf(l) !== null);

  // デッキ名：ニューロンなら「お気に入り」の前の行
  let name = '';
  if (isNeuron) {
    const fav = lines.indexOf('お気に入り');
    for (let i = fav - 1; i >= 0; i--) {
      if (lines[i]) {
        name = lines[i];
        break;
      }
    }
  }

  // 見出しが1つでもあれば、最初の見出しより前はデッキ名などとみなす
  const firstHeader = lines.findIndex(l => sectionOf(l) !== null);
  let start = 0;
  if (firstHeader > 0) {
    start = firstHeader;
    if (!isNeuron) {
      const before = lines.slice(0, firstHeader).filter(Boolean);
      if (before.length === 1 && !inlineEntry(before[0])) name = before[0].replace(/^[#＃]\s*/, '');
      else start = 0;
    }
  }

  const counts = new Map<string, DeckEntry>();
  const add = (cardName: string, count: number, section: Section) => {
    const key = `${section}\u0000${cardName}`;
    const cur = counts.get(key);
    if (cur) cur.count += count;
    else counts.set(key, {name: cardName, count, section});
  };

  let section: Section = 'main';
  let pending: string | null = null;
  const flushPending = () => {
    // 枚数のない行：手書きなら1枚、ニューロンなら（メニューなどなので）捨てる
    if (pending !== null && !isNeuron) add(pending, 1, section);
    pending = null;
  };

  for (let i = start; i < lines.length; i++) {
    const line = lines[i];
    if (!line || LIMIT_LINE.test(line) || /合計$/.test(line)) continue;
    const sec = sectionOf(line);
    if (sec) {
      flushPending();
      section = sec;
      continue;
    }
    if (/^[0-9０-９]+$/.test(line)) {
      if (pending !== null) {
        add(pending, toInt(line), section);
        pending = null;
      }
      continue;
    }
    if (isNeuron) {
      // カード名はかならず「行番号」の行の直後
      flushPending();
      const prev = raw[i - 1] ?? '';
      if (/^\d+\t/.test(prev)) pending = line;
      continue;
    }
    const inline = inlineEntry(line);
    flushPending();
    if (inline) add(inline.name, inline.count, section);
    else pending = line;
  }
  flushPending();

  const entries = [...counts.values()];
  for (const e of entries) {
    if (e.count > 3) warnings.push(`《${e.name}》が${e.count}枚あります`);
  }
  return {deck: {name, entries}, warnings};
}

export function countSection(deck: Deck, section: Section): number {
  return deck.entries.filter(e => e.section === section).reduce((a, e) => a + e.count, 0);
}

/** 読み込んだデッキを手書きリストの形に戻す（編集用） */
export function deckToText(deck: Deck): string {
  const out: string[] = [];
  if (deck.name) out.push(deck.name, '');
  const blocks: [Section, string][] = [
    ['main', 'メインデッキ'],
    ['extra', 'エクストラデッキ'],
    ['side', 'サイドデッキ'],
  ];
  for (const [section, title] of blocks) {
    const list = deck.entries.filter(e => e.section === section);
    if (list.length === 0) continue;
    out.push(title);
    for (const e of list) out.push(`${e.name} ×${e.count}`);
    out.push('');
  }
  return out.join('\n').trim();
}

// ===== 一人回し =====

export type Rng = () => number;

export function shuffle<T>(items: T[], rng: Rng = Math.random): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const emptyZones = (): Record<Zone, number[]> => ({
  deck: [],
  hand: [],
  field: [],
  grave: [],
  banish: [],
  extra: [],
});

/** デッキをシャッフルして初手を引いた状態から始める */
export function startGame(deck: Deck, rng: Rng = Math.random, handSize = HAND_SIZE): SoloState {
  const cards: Card[] = [];
  for (const e of deck.entries) {
    if (e.section === 'side') continue;
    for (let i = 0; i < e.count; i++) {
      cards.push({id: cards.length, name: e.name, isExtra: e.section === 'extra'});
    }
  }
  const zones = emptyZones();
  zones.deck = shuffle(
    cards.filter(c => !c.isExtra).map(c => c.id),
    rng,
  );
  zones.extra = cards.filter(c => c.isExtra).map(c => c.id);
  return draw({cards, zones, drawn: 0}, handSize);
}

export function draw(state: SoloState, n = 1): SoloState {
  const k = Math.min(n, state.zones.deck.length);
  if (k <= 0) return state;
  return {
    ...state,
    zones: {
      ...state.zones,
      deck: state.zones.deck.slice(k),
      hand: [...state.zones.hand, ...state.zones.deck.slice(0, k)],
    },
    drawn: state.drawn + k,
  };
}

export function shuffleDeck(state: SoloState, rng: Rng = Math.random): SoloState {
  return {...state, zones: {...state.zones, deck: shuffle(state.zones.deck, rng)}};
}

export function zoneOf(state: SoloState, id: number): Zone | null {
  for (const z of Object.keys(state.zones) as Zone[]) if (state.zones[z].includes(id)) return z;
  return null;
}

/** 選べる移動先（今いる場所と、ありえない行き先は出さない） */
export function destinationsFor(state: SoloState, id: number): Destination[] {
  const card = state.cards[id];
  const from = zoneOf(state, id);
  const all: Destination[] = card.isExtra
    ? ['field', 'grave', 'banish', 'hand', 'extra']
    : ['hand', 'field', 'grave', 'banish', 'deck-top', 'deck-bottom'];
  return all.filter(d => d !== from);
}

export function moveCard(state: SoloState, id: number, to: Destination): SoloState {
  const card = state.cards[id];
  const from = zoneOf(state, id);
  if (!card || from === null) return state;
  // エクストラデッキのカードはメインデッキに入らない（EXに戻る）。逆もない
  let dest = to;
  if (card.isExtra && (to === 'deck-top' || to === 'deck-bottom')) dest = 'extra';
  if (!card.isExtra && to === 'extra') dest = 'deck-top';

  const zones = {...state.zones, [from]: state.zones[from].filter(x => x !== id)};
  if (dest === 'deck-top') zones.deck = [id, ...zones.deck];
  else if (dest === 'deck-bottom') zones.deck = [...zones.deck, id];
  else zones[dest] = [...zones[dest], id];
  return {...state, zones};
}

export const DEST_LABEL: Record<Destination, string> = {
  hand: '手札へ',
  field: '場へ',
  grave: '墓地へ',
  banish: '除外する',
  extra: 'EXに戻す',
  'deck-top': 'デッキの上へ',
  'deck-bottom': 'デッキの下へ',
};
