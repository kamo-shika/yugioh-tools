/** 二項係数 C(n, k)。範囲外は 0。 */
export function choose(n: number, k: number): number {
  if (k < 0 || n < 0 || k > n) return 0;
  k = Math.min(k, n - k);
  let r = 1;
  for (let i = 1; i <= k; i++) {
    r = (r * (n - k + i)) / i;
  }
  return r;
}

/** デッキ deck 枚、そのうち対象 copies 枚、draw 枚引いて対象をちょうど k 枚引く確率 */
export function exactly(deck: number, copies: number, draw: number, k: number): number {
  const total = choose(deck, draw);
  if (total === 0) return 0;
  return (choose(copies, k) * choose(deck - copies, draw - k)) / total;
}

/** 対象を at 枚以上引く確率 */
export function atLeast(deck: number, copies: number, draw: number, at: number): number {
  let p = 0;
  for (let k = Math.max(0, at); k <= Math.min(copies, draw); k++) {
    p += exactly(deck, copies, draw, k);
  }
  return Math.min(1, p);
}

export interface Group {
  /** デッキ内の枚数 */
  copies: number;
  /** 最低何枚引きたいか */
  min: number;
}

/**
 * 複数グループの条件を「すべて」満たす確率（多変量超幾何分布）。
 * 各グループはデッキ内で重複しない（別のカード）前提。
 */
export function allOf(deck: number, draw: number, groups: Group[]): number {
  const used = groups.reduce((s, g) => s + g.copies, 0);
  const rest = deck - used;
  const total = choose(deck, draw);
  if (rest < 0 || total === 0) return 0;

  let sum = 0;
  const walk = (i: number, drawn: number, ways: number) => {
    if (drawn > draw) return;
    if (i === groups.length) {
      sum += ways * choose(rest, draw - drawn);
      return;
    }
    const g = groups[i];
    for (let x = Math.max(0, g.min); x <= g.copies && drawn + x <= draw; x++) {
      walk(i + 1, drawn + x, ways * choose(g.copies, x));
    }
  };
  walk(0, 0, 1);
  return Math.min(1, sum / total);
}
