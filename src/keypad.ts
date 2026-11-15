/** テンキーで入力できる最大値 */
export const MAX_INPUT = 999999;

/** テンキーのキーを1つ押したあとの入力値を返す（ダイス・コインなど数値以外のキーは無視） */
export function pressKey(input: number, key: string): number {
  if (key === 'C') return 0;
  if (key === '⌫') return Math.floor(input / 10);
  if (!/^\d+$/.test(key)) return input;
  const next = Number(`${input}${key}`);
  return next > MAX_INPUT ? input : next;
}
