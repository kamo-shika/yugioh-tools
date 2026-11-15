export const START_LP = 8000;

export type PlayerId = 0 | 1;

export type DuelEvent =
  | {kind: 'lp'; player: PlayerId; before: number; after: number; at: number}
  | {kind: 'dice'; value: number; at: number}
  | {kind: 'coin'; value: '表' | '裏'; at: number}
  | {kind: 'reset'; at: number};

export interface DuelState {
  names: [string, string];
  lp: [number, number];
  turn: number;
  log: DuelEvent[];
}

export const initialState = (names: [string, string] = ['自分', '相手']): DuelState => ({
  names,
  lp: [START_LP, START_LP],
  turn: 1,
  log: [],
});

/** LP を変化させる。0 未満にはならない。 */
export function applyLp(state: DuelState, player: PlayerId, after: number): DuelState {
  const before = state.lp[player];
  const next = Math.max(0, Math.round(after));
  if (next === before) return state;
  const lp: [number, number] = [...state.lp];
  lp[player] = next;
  return {
    ...state,
    lp,
    log: [...state.log, {kind: 'lp', player, before, after: next, at: Date.now()}],
  };
}

/** 「LPを半分にする」（端数切り上げ） */
export const halve = (lp: number) => Math.ceil(lp / 2);

/** 直前の LP 変化を取り消す（ダイス・コインのログは残す） */
export function undoLp(state: DuelState): DuelState {
  for (let i = state.log.length - 1; i >= 0; i--) {
    const e = state.log[i];
    if (e.kind === 'reset') return state;
    if (e.kind === 'lp') {
      const lp: [number, number] = [...state.lp];
      lp[e.player] = e.before;
      return {...state, lp, log: [...state.log.slice(0, i), ...state.log.slice(i + 1)]};
    }
  }
  return state;
}

export const rollDice = () => 1 + Math.floor(Math.random() * 6);
export const flipCoin = (): '表' | '裏' => (Math.random() < 0.5 ? '表' : '裏');
