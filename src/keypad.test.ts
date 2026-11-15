import {describe, expect, it} from 'vitest';
import {MAX_INPUT, pressKey} from './keypad';

const typeKeys = (...keys: string[]) => keys.reduce(pressKey, 0);

describe('テンキーの入力', () => {
  describe('数字キー', () => {
    it('押した順に桁が並ぶ', () => {
      expect(typeKeys('1', '2', '3')).toBe(123);
    });

    it('00 と 000 はまとめて0を足す', () => {
      expect(typeKeys('1', '00')).toBe(100);
      expect(typeKeys('2', '000')).toBe(2000);
    });

    it('何も入っていないときに 0 系を押しても 0 のまま', () => {
      expect(typeKeys('0')).toBe(0);
      expect(typeKeys('000', '00')).toBe(0);
    });

    it(`上限 ${MAX_INPUT} はちょうど入力できる`, () => {
      expect(typeKeys('9', '9', '9', '9', '9', '9')).toBe(MAX_INPUT);
    });

    it('上限を超える入力は無視して、直前の値のまま', () => {
      expect(typeKeys('9', '9', '9', '9', '9', '9', '1')).toBe(MAX_INPUT);
      expect(typeKeys('1', '000', '000')).toBe(1000);
    });
  });

  describe('消去キー', () => {
    it('C は全部消す', () => {
      expect(typeKeys('1', '2', 'C')).toBe(0);
    });

    it('⌫ は最後の1桁だけ消す', () => {
      expect(typeKeys('1', '2', '3', '⌫')).toBe(12);
    });

    it('空のときの ⌫ は 0 のまま', () => {
      expect(typeKeys('⌫')).toBe(0);
    });
  });

  it('知らないキーは入力を変えない', () => {
    expect(pressKey(12, '🎲')).toBe(12);
  });
});
