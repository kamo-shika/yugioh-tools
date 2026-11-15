import {describe, expect, it} from 'vitest';
import {applyLp, halve, initialState, undoLp} from './duel';

describe('duel', () => {
  it('ダメージでLPが減り、0未満にならない', () => {
    let s = applyLp(initialState(), 0, 8000 - 1000);
    expect(s.lp).toEqual([7000, 8000]);
    s = applyLp(s, 0, -500);
    expect(s.lp[0]).toBe(0);
  });

  it('undoで直前のLP変化だけ戻る', () => {
    let s = applyLp(initialState(), 0, 7000);
    s = {...s, log: [...s.log, {kind: 'dice', value: 3, at: 0}]};
    s = applyLp(s, 1, 6500);
    s = undoLp(s);
    expect(s.lp).toEqual([7000, 8000]);
    s = undoLp(s);
    expect(s.lp).toEqual([8000, 8000]);
    expect(s.log.filter(e => e.kind === 'dice')).toHaveLength(1);
  });

  it('半分は端数切り上げ', () => {
    expect(halve(8000)).toBe(4000);
    expect(halve(4050)).toBe(2025);
    expect(halve(25)).toBe(13);
  });
});
