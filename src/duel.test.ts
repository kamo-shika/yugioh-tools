import {describe, expect, it} from 'vitest';
import {
  DuelState,
  START_LP,
  applyLp,
  changeBy,
  halve,
  initialState,
  resetDuel,
  undoLp,
} from './duel';

const lpOf = (s: DuelState) => s.lp;

describe('デュエルの状態', () => {
  describe('初期状態', () => {
    it(`両者のLPは ${START_LP} から始まる`, () => {
      expect(lpOf(initialState())).toEqual([8000, 8000]);
    });

    it('履歴は空', () => {
      expect(initialState().log).toEqual([]);
    });
  });

  describe('ダメージと回復（changeBy）', () => {
    it('ダメージを受けた側だけLPが減る', () => {
      expect(lpOf(changeBy(initialState(), 0, -1000))).toEqual([7000, 8000]);
    });

    it('回復した側だけLPが増える', () => {
      expect(lpOf(changeBy(initialState(), 1, 500))).toEqual([8000, 8500]);
    });

    it('LPを超えるダメージでも0で止まる', () => {
      expect(lpOf(changeBy(initialState(), 0, -9000))).toEqual([0, 8000]);
    });

    it('ちょうどLP分のダメージで0になる', () => {
      expect(lpOf(changeBy(initialState(), 0, -8000))).toEqual([0, 8000]);
    });

    it('初期LPを超えて回復できる', () => {
      expect(lpOf(changeBy(initialState(), 0, 1000))).toEqual([9000, 8000]);
    });

    it('連続でダメージを受けると、その分だけ減っていく', () => {
      let s = initialState();
      for (const d of [500, 500, 1000, 2000]) s = changeBy(s, 0, -d);
      expect(lpOf(s)).toEqual([4000, 8000]);
    });

    it('LPが変わると前後の値が履歴に残る', () => {
      const s = changeBy(initialState(), 0, -1000);
      expect(s.log).toEqual([{kind: 'lp', player: 0, before: 8000, after: 7000, at: expect.any(Number)}]);
    });

    it('0ダメージは何も変えず、履歴も増やさない', () => {
      const s = initialState();
      expect(changeBy(s, 0, 0)).toBe(s);
    });

    it('LP0のときのダメージは履歴を増やさない', () => {
      const s = changeBy(initialState(), 0, -8000);
      expect(changeBy(s, 0, -100).log).toHaveLength(1);
    });

    it('元の状態は書き換えない', () => {
      const s = initialState();
      changeBy(s, 0, -1000);
      expect(lpOf(s)).toEqual([8000, 8000]);
    });
  });

  describe('LPを直接指定する（applyLp）', () => {
    it('小数は四捨五入する', () => {
      expect(applyLp(initialState(), 0, 7000.6).lp[0]).toBe(7001);
    });

    it('負の値は0にする', () => {
      expect(applyLp(initialState(), 0, -1).lp[0]).toBe(0);
    });
  });

  describe('半分にする（halve）', () => {
    it.each([
      [8000, 4000],
      [4050, 2025],
      [25, 13],
      [1, 1],
      [0, 0],
    ])('%i の半分は %i（端数切り上げ）', (lp, expected) => {
      expect(halve(lp)).toBe(expected);
    });
  });

  describe('1つ戻す（undoLp）', () => {
    it('直前のLP変化を取り消す', () => {
      const s = changeBy(changeBy(initialState(), 0, -1000), 1, -500);
      expect(lpOf(undoLp(s))).toEqual([7000, 8000]);
    });

    it('続けて戻すと、さらに前の変化も取り消せる', () => {
      const s = changeBy(changeBy(initialState(), 0, -1000), 1, -500);
      expect(lpOf(undoLp(undoLp(s)))).toEqual([8000, 8000]);
    });

    it('0まで減ったLPも戻せる', () => {
      const s = changeBy(changeBy(initialState(), 0, -3000), 0, -9000);
      expect(lpOf(undoLp(s))).toEqual([5000, 8000]);
    });

    it('ダイスとコインの履歴は残したまま、LPだけ戻す', () => {
      let s = changeBy(initialState(), 0, -1000);
      s = {...s, log: [...s.log, {kind: 'dice', value: 3, at: 0}]};
      const undone = undoLp(s);
      expect(lpOf(undone)).toEqual([8000, 8000]);
      expect(undone.log).toEqual([{kind: 'dice', value: 3, at: 0}]);
    });

    it('LPの変化がなければ何もしない', () => {
      const s = initialState();
      expect(undoLp(s)).toBe(s);
    });

    it('リセットより前の変化は戻さない', () => {
      const s = resetDuel(changeBy(initialState(), 0, -1000));
      expect(undoLp(s)).toBe(s);
    });
  });

  describe('リセット（resetDuel）', () => {
    it('両者のLPを初期値に戻す', () => {
      const s = changeBy(changeBy(initialState(), 0, -3000), 1, 500);
      expect(lpOf(resetDuel(s))).toEqual([8000, 8000]);
    });

    it('プレイヤー名は引き継ぐ', () => {
      const s = {...initialState(), names: ['A', 'B'] as [string, string]};
      expect(resetDuel(s).names).toEqual(['A', 'B']);
    });

    it('履歴にはリセットしたことだけが残る', () => {
      const s = resetDuel(changeBy(initialState(), 0, -1000));
      expect(s.log).toEqual([{kind: 'reset', at: expect.any(Number)}]);
    });
  });
});
