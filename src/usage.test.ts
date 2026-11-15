import {describe, expect, it} from 'vitest';
import {slices, usage, TOP} from './UsageChart';
import {parseArticle} from '../scripts/fetch-usage.mjs';

describe('usage', () => {
  it('上位とその他で合計が100%になる', () => {
    const s = slices(usage);
    expect(s.length).toBeLessThanOrEqual(TOP + 1);
    expect(s.reduce((a, b) => a + b.count, 0)).toBe(usage.total);
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
