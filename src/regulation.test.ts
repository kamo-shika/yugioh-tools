import {describe, expect, it} from 'vitest';
import {levelClass, matches, regulation, ymd} from './regulation';

describe('regulation', () => {
  it('データに禁止・制限・準制限が入っている', () => {
    expect(regulation.forbidden.length).toBeGreaterThan(0);
    expect(regulation.limited.length).toBeGreaterThan(0);
    expect(regulation.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
  it('検索は全角半角を区別しない', () => {
    expect(matches('PSYフレームロード・Ω', 'psy')).toBe(true);
    expect(matches('灰流うらら', 'うらら')).toBe(true);
    expect(matches('灰流うらら', 'エルドリッチ')).toBe(false);
  });
  it('表示用の変換', () => {
    expect(ymd('2026-10-01')).toBe('2026/10/01');
    expect(levelClass('準制限')).toBe('lv-semi');
    expect(levelClass('制限解除')).toBe('lv-free');
  });
});
