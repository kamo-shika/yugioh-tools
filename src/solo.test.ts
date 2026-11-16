import {describe, expect, test} from 'vitest';
import {
  countSection,
  deckToText,
  destinationsFor,
  draw,
  moveCard,
  parseDeckText,
  shuffleDeck,
  startGame,
  zoneOf,
  type Deck,
} from './solo';
import neuronCopy from './fixtures/neuron-copy-sp.txt?raw';

/** 再現できる乱数（テスト用） */
function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) % 2147483648;
    return s / 2147483648;
  };
}

const find = (deck: Deck, name: string) => deck.entries.find(e => e.name === name);

describe('ニューロンのデッキページを全部コピーした文字', () => {
  const {deck} = parseDeckText(neuronCopy);

  test('メイン40枚・EX15枚・サイド0枚として読める', () => {
    expect(countSection(deck, 'main')).toBe(40);
    expect(countSection(deck, 'extra')).toBe(15);
    expect(countSection(deck, 'side')).toBe(0);
  });

  test('規制の表示（準制限カード など）は枚数に混ざらない', () => {
    expect(find(deck, '灰流うらら')).toEqual({name: '灰流うらら', count: 2, section: 'main'});
    expect(find(deck, '増殖するG')?.count).toBe(1);
    expect(deck.entries.some(e => /制限/.test(e.name))).toBe(false);
  });

  test('前後のメニューや説明文はカードにしない', () => {
    const names = deck.entries.map(e => e.name);
    for (const junk of ['ログイン', 'お気に入り', 'コメント', 'Top', 'カード検索', 'ご利用規約']) {
      expect(names).not.toContain(junk);
    }
  });

  test('デッキ名を拾う', () => {
    expect(deck.name).toBe('比較的最近のデッキとパックで霊使い　ver.2');
  });

  test('空白や記号を含むカード名もそのまま', () => {
    expect(find(deck, 'The Fallen ＆ The Virtuous')).toBeDefined();
  });

  test('エクストラのカードはEX区分', () => {
    expect(find(deck, '大輪の霊使い')).toEqual({name: '大輪の霊使い', count: 3, section: 'extra'});
  });
});

describe('手書きのリスト', () => {
  test('「×3」「3枚」「3 カード名」の書き方と見出しを読める', () => {
    const {deck} = parseDeckText(
      [
        'エルドリッチ',
        'メイン',
        '黄金卿エルドリッチ ×3',
        '3 誘いのΔ',
        '灰流うらら 2枚',
        '《おろかな埋葬》x1',
        '【エクストラ】',
        '黄金狂エルドリッチ ×2',
        'サイド（2）',
        '激流葬 ２',
      ].join('\n'),
    );
    expect(deck.name).toBe('エルドリッチ');
    expect(deck.entries).toEqual([
      {name: '黄金卿エルドリッチ', count: 3, section: 'main'},
      {name: '誘いのΔ', count: 3, section: 'main'},
      {name: '灰流うらら', count: 2, section: 'main'},
      {name: 'おろかな埋葬', count: 1, section: 'main'},
      {name: '黄金狂エルドリッチ', count: 2, section: 'extra'},
      {name: '激流葬', count: 2, section: 'side'},
    ]);
  });

  test('枚数のない行は1枚、同じカードは合算する', () => {
    const {deck} = parseDeckText('灰流うらら\n灰流うらら\n増殖するG');
    expect(deck.entries).toEqual([
      {name: '灰流うらら', count: 2, section: 'main'},
      {name: '増殖するG', count: 1, section: 'main'},
    ]);
  });

  test('「No.81」のような数字で始まる名前を枚数と取り違えない', () => {
    const {deck} = parseDeckText('エクストラ\nNo.81 超弩級砲塔列車スペリオル・ドーラ ×1');
    expect(deck.entries).toEqual([
      {name: 'No.81 超弩級砲塔列車スペリオル・ドーラ', count: 1, section: 'extra'},
    ]);
  });

  test('4枚以上は注意を出す', () => {
    expect(parseDeckText('灰流うらら ×4').warnings).toEqual(['《灰流うらら》が4枚あります']);
  });

  test('書き出した文字を読み直すと同じデッキになる', () => {
    const {deck} = parseDeckText(neuronCopy);
    expect(parseDeckText(deckToText(deck)).deck).toEqual(deck);
  });
});

describe('一人回し', () => {
  const deck: Deck = {
    name: 't',
    entries: [
      {name: 'A', count: 3, section: 'main'},
      {name: 'B', count: 37, section: 'main'},
      {name: 'X', count: 2, section: 'extra'},
      {name: 'S', count: 3, section: 'side'},
    ],
  };

  test('始めると5枚引き、残り35枚。EXは別、サイドは使わない', () => {
    const s = startGame(deck, seeded(1));
    expect(s.zones.hand).toHaveLength(5);
    expect(s.zones.deck).toHaveLength(35);
    expect(s.zones.extra).toHaveLength(2);
    expect(s.cards.some(c => c.name === 'S')).toBe(false);
    expect(s.drawn).toBe(5);
  });

  test('シャッフルは毎回違う並びになりうる（同じカードの組は変わらない）', () => {
    const a = startGame(deck, seeded(1));
    const b = startGame(deck, seeded(2));
    expect([...a.zones.deck, ...a.zones.hand]).not.toEqual([...b.zones.deck, ...b.zones.hand]);
    const s = shuffleDeck(a, seeded(3));
    expect([...s.zones.deck].sort((x, y) => x - y)).toEqual([...a.zones.deck].sort((x, y) => x - y));
  });

  test('ドローはデッキの一番上から。デッキが無くなったら引けない', () => {
    let s = startGame(deck, seeded(1));
    const top = s.zones.deck[0];
    s = draw(s);
    expect(s.zones.hand.at(-1)).toBe(top);
    for (let i = 0; i < 40; i++) s = draw(s);
    expect(s.zones.deck).toHaveLength(0);
    expect(s.zones.hand).toHaveLength(40);
    expect(s.drawn).toBe(40);
  });

  test('手札→場→墓地→除外と動かせ、カードの総数は変わらない', () => {
    let s = startGame(deck, seeded(1));
    const id = s.zones.hand[0];
    s = moveCard(s, id, 'field');
    expect(zoneOf(s, id)).toBe('field');
    s = moveCard(s, id, 'grave');
    s = moveCard(s, id, 'banish');
    expect(zoneOf(s, id)).toBe('banish');
    expect(s.zones.hand).toHaveLength(4);
    const total = Object.values(s.zones).reduce((a, z) => a + z.length, 0);
    expect(total).toBe(42);
  });

  test('デッキの上・下に戻せる', () => {
    let s = startGame(deck, seeded(1));
    const [a, b] = s.zones.hand;
    s = moveCard(s, a, 'deck-top');
    s = moveCard(s, b, 'deck-bottom');
    expect(s.zones.deck[0]).toBe(a);
    expect(s.zones.deck.at(-1)).toBe(b);
  });

  test('EXのカードはデッキに戻すとEXへ。行き先にデッキは出さない', () => {
    let s = startGame(deck, seeded(1));
    const x = s.zones.extra[0];
    s = moveCard(s, x, 'field');
    expect(destinationsFor(s, x)).toEqual(['grave', 'banish', 'hand', 'extra']);
    s = moveCard(s, x, 'deck-top');
    expect(zoneOf(s, x)).toBe('extra');
  });

  test('今いる場所は行き先に出さない', () => {
    const s = startGame(deck, seeded(1));
    expect(destinationsFor(s, s.zones.hand[0])).not.toContain('hand');
  });
});
