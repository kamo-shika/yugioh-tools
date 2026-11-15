import {describe, expect, it} from 'vitest';
import {colorMap, slices, usage, TOP, COLORS} from './UsageChart';
import {parseArticle, parseClabo, parsePortal} from '../scripts/fetch-usage.mjs';

describe('usage', () => {
  it('全国・関東・関西がそろい、それぞれ上位とその他で合計が100%になる', () => {
    expect(usage.sources.map(s => s.id)).toEqual(['national', 'kanto', 'kansai']);
    const colors = colorMap(usage.sources);
    for (const src of usage.sources) {
      const s = slices(src, colors);
      expect(s.length).toBeLessThanOrEqual(TOP + 1);
      expect(s.reduce((a, b) => a + b.count, 0)).toBe(src.total);
      expect(src.decks.reduce((a, b) => a + b.count, 0)).toBe(src.total);
    }
  });
  it('同じデッキはどの地域でも同じ色で、色は8色まで', () => {
    const mk = (id: string, names: string[]) => ({
      ...usage.sources[0],
      id,
      decks: names.map((name, i) => ({name, count: 10 - i})),
      total: names.reduce((a, _, i) => a + 10 - i, 0),
    });
    const a = mk('a', ['A', 'B', 'C', 'D', 'E', 'F']);
    const b = mk('b', ['C', 'G', 'A', 'H', 'I', 'J']);
    const c = mk('c', ['K', 'A', 'B']);
    const colors = colorMap([a, b, c]);
    expect([...colors.values()].length).toBeLessThanOrEqual(COLORS);
    expect(slices(b, colors).find(s => s.name === 'A')?.color).toBe(colors.get('A'));
    // A〜E、G、H、I で8色。9色目にあたる K は色が無いので、その他にまとめる
    expect(colors.has('K')).toBe(false);
    const sc = slices(c, colors);
    expect(sc.map(s => s.name)).toEqual(['A', 'B', 'その他']);
    expect(sc.reduce((x, y) => x + y.count, 0)).toBe(c.total);
  });
  it('カードラボの優勝デッキまとめを読む（混合は先頭のテーマで数える）', () => {
    const html = `<p>【11月3日(月)】</p><p>光と闇の儀式+アルス＝マグナ</p><p>※優勝者様のご希望によりお名前は伏せております</p>
<p>開催日：11月3日 参加人数：16名</p><p>レイズ・ムーン</p><p>開催日：11月4日&nbsp;参加人数：8名</p>`;
    expect(parseClabo(html, 2026)).toEqual([
      {deck: '光と闇の儀式+アルス＝マグナ', main: '光と闇の儀式', date: '2026-11-03', players: 16},
      {deck: 'レイズ・ムーン', main: 'レイズ・ムーン', date: '2026-11-04', players: 8},
    ]);
  });
  it('TCG PORTAL の環境分析を読む', () => {
    const html = `<noscript><p>896<!-- -->件のデッキを集計（期間: <!-- -->2026-10-16<!-- --> ～ <!-- -->2026-11-15<!-- -->）</p>
<p class="font-medium text-sm">光と闇の儀式</p><p class="x">117<!-- -->回の大会入賞</p><p>シェア</p><p class="y">13.1<!-- -->%</p>
<p class="font-medium text-sm">M&#x2200;LICE</p><p class="x">25<!-- -->回の大会入賞</p><p>シェア</p><p class="y">2.8<!-- -->%</p></noscript>`;
    expect(parsePortal(html)).toEqual({
      decks: 896,
      from: '2026-10-16',
      to: '2026-11-15',
      rows: [
        {name: '光と闇の儀式', count: 117, share: 13.1},
        {name: 'M∀LICE', count: 25, share: 2.8},
      ],
    });
  });
  it('記事の予選分布を読み、人数と合計を突き合わせる', () => {
    const html = `<title>【遊戯王OCG】2026年11月上旬の環境解説【テスト杯】</title>
<h2 class="wp-block-heading">11/3 第1回 テスト杯 個人戦</h2>
<h3 class="wp-block-heading">予選デッキ分布</h3>
<p>エルフェンノーツ 3<br>光と闇の儀式⋯2(巳剣1 烙印1)</p>
<p>以下、分布1</p><p>白鴉<br>BF</p><p>以上、7名参加</p>`;
    const {tournaments} = parseArticle(html, 'https://example.com/');
    expect(tournaments).toHaveLength(1);
    expect(tournaments[0]).toMatchObject({name: '第1回 テスト杯 個人戦', date: '2026-11-03', players: 7, ok: true});
    expect(tournaments[0].decks).toEqual({エルフェンノーツ: 3, 光と闇の儀式: 2, 白鴉: 1, BF: 1});
  });
});
