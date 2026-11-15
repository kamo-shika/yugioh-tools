import {describe, expect, it} from 'vitest';
import {allOf, atLeast, choose, exactly} from './hypergeometric';

describe('hypergeometric', () => {
  it('choose', () => {
    expect(choose(40, 5)).toBe(658008);
    expect(choose(5, 6)).toBe(0);
  });

  it('40枚デッキ3枚採用を5枚ドローで1枚以上引く確率は約33.76%', () => {
    expect(atLeast(40, 3, 5, 1)).toBeCloseTo(0.33755, 4);
  });

  it('分布の合計は1', () => {
    let s = 0;
    for (let k = 0; k <= 3; k++) s += exactly(40, 3, 5, k);
    expect(s).toBeCloseTo(1, 12);
  });

  it('グループ1つならatLeastと一致', () => {
    expect(allOf(40, 5, [{copies: 9, min: 1}])).toBeCloseTo(atLeast(40, 9, 5, 1), 12);
  });

  it('2グループのAND条件', () => {
    // A 3枚, B 3枚, 各1枚以上 = 1 - P(A0) - P(B0) + P(A0かつB0)
    const pA0 = exactly(40, 3, 5, 0);
    const pBoth0 = choose(34, 5) / choose(40, 5);
    const expected = 1 - 2 * pA0 + pBoth0;
    expect(allOf(40, 5, [{copies: 3, min: 1}, {copies: 3, min: 1}])).toBeCloseTo(expected, 12);
  });

  it('枚数超過は0', () => {
    expect(allOf(40, 5, [{copies: 41, min: 1}])).toBe(0);
  });
});
