// @vitest-environment jsdom
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {act, cleanup, render} from '@testing-library/react';
import AnimatedLp from './AnimatedLp';

vi.mock('./sound', () => ({lpTick: vi.fn(), lpFinish: vi.fn()}));

// requestAnimationFrame を時間ごと進められるようにする
let now = 0;
let queue: FrameRequestCallback[] = [];
const advance = (ms: number) => {
  const end = now + ms;
  while (now < end) {
    now += 16;
    const q = queue;
    queue = [];
    q.forEach(cb => cb(now));
  }
};

beforeEach(() => {
  now = 0;
  queue = [];
  vi.spyOn(performance, 'now').mockImplementation(() => now);
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => (queue.push(cb), queue.length));
  vi.stubGlobal('cancelAnimationFrame', () => {
    queue = [];
  });
  vi.stubGlobal('matchMedia', () => ({matches: false}));
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const lpTexts = (container: HTMLElement) =>
  [...container.querySelectorAll('.lp')].map(el => el.textContent);

describe('AnimatedLp', () => {
  it('最初は渡されたLPをそのまま表示する', () => {
    const {container} = render(<AnimatedLp lp={8000} className="lp" />);
    expect(lpTexts(container)).toEqual(['8,000']);
  });

  it('LPが変わるとアニメーションの後に新しい値になる', () => {
    const {container, rerender} = render(<AnimatedLp lp={8000} className="lp" />);
    rerender(<AnimatedLp lp={7000} className="lp" />);
    act(() => advance(2000));
    expect(lpTexts(container)).toEqual(['7,000']);
  });

  it('カウント途中は元の値と新しい値の間の数字を表示する', () => {
    const {container, rerender} = render(<AnimatedLp lp={8000} className="lp" />);
    rerender(<AnimatedLp lp={4000} className="lp" />);
    act(() => advance(200));
    const shown = Number(lpTexts(container)[0]!.replace(/,/g, ''));
    expect(shown).toBeLessThan(8000);
    expect(shown).toBeGreaterThan(4000);
  });

  it('何回続けてダメージを受けてもLPの数字は1つだけ表示される', () => {
    const {container, rerender} = render(<AnimatedLp lp={8000} className="lp" />);
    for (const lp of [7500, 7000, 6500, 6000]) {
      rerender(<AnimatedLp lp={lp} className="lp" />);
      act(() => advance(2000));
    }
    expect(lpTexts(container)).toEqual(['6,000']);
  });

  it('増減量の表示は直近の1つだけ', () => {
    const {container, rerender} = render(<AnimatedLp lp={8000} className="lp" />);
    for (const lp of [7500, 7000, 7300]) {
      rerender(<AnimatedLp lp={lp} className="lp" />);
      act(() => advance(2000));
    }
    const deltas = [...container.querySelectorAll('.lp-delta')].map(el => el.textContent);
    expect(deltas).toEqual(['＋300']);
  });

  it('カウント中に次の変化が来たら、最後の値で止まる', () => {
    const {container, rerender} = render(<AnimatedLp lp={8000} className="lp" />);
    rerender(<AnimatedLp lp={7000} className="lp" />);
    act(() => advance(100));
    rerender(<AnimatedLp lp={5000} className="lp" />);
    act(() => advance(2000));
    expect(lpTexts(container)).toEqual(['5,000']);
  });
});
