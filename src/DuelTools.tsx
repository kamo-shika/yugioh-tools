import {ReactNode, useEffect, useState} from 'react';
import {Button} from '@astryxdesign/core/Button';
import {Drawer, DrawerHeader} from '@astryxdesign/core/Drawer';
import {Text} from '@astryxdesign/core/Text';
import {TextInput} from '@astryxdesign/core/TextInput';
import {VStack} from '@astryxdesign/core/Layout';
import {
  DuelEvent,
  DuelState,
  PlayerId,
  START_LP,
  applyLp,
  flipCoin,
  halve,
  initialState,
  rollDice,
  undoLp,
} from './duel';
import {useWakeLock} from './useWakeLock';

type RollEvent = Extract<DuelEvent, {kind: 'dice' | 'coin'}>;

const STORAGE_KEY = 'ygo-duel-state-v1';
const MAX_INPUT = 999999;

function load(): DuelState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as DuelState;
  } catch {
    /* 読めなければ初期状態 */
  }
  return initialState();
}

const fmt = (n: number) => n.toLocaleString('ja-JP');
const KEYS = ['7', '8', '9', 'C', '4', '5', '6', '⌫', '1', '2', '3', '🎲', '0', '00', '000', 'コイン'];
const KEY_LABEL: Record<string, string | undefined> = {
  C: 'クリア',
  '⌫': '1文字消す',
  '🎲': 'ダイスを振る',
  コイン: 'コインを投げる',
};
const DICE_FACE = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];

export default function DuelTools({nav}: {nav: ReactNode}) {
  const [state, setState] = useState<DuelState>(load);
  const [input, setInput] = useState(0);
  const [lastRoll, setLastRoll] = useState<RollEvent | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [editing, setEditing] = useState<PlayerId | null>(null);

  useWakeLock();

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* 保存できない環境でも動作は続ける */
    }
  }, [state]);

  useEffect(() => {
    if (!confirmReset) return;
    const t = setTimeout(() => setConfirmReset(false), 3000);
    return () => clearTimeout(t);
  }, [confirmReset]);

  const changeLp = (p: PlayerId, sign: 1 | -1) => {
    if (!input) return;
    setState(s => applyLp(s, p, s.lp[p] + sign * input));
    setInput(0);
  };
  const halveLp = (p: PlayerId) => setState(s => applyLp(s, p, halve(s.lp[p])));

  const pushRandom = (e: RollEvent) => {
    setLastRoll(e);
    setState(s => ({...s, log: [...s.log, e]}));
  };

  const reset = () => {
    // 誤タップ防止：3秒以内にもう一度押したらリセット
    if (!confirmReset) {
      setConfirmReset(true);
      return;
    }
    setConfirmReset(false);
    setLastRoll(null);
    setInput(0);
    setState(s => ({...initialState(s.names), log: [{kind: 'reset', at: Date.now()}]}));
  };

  const rename = (p: PlayerId, name: string) =>
    setState(s => {
      const names: [string, string] = [...s.names];
      names[p] = name;
      return {...s, names};
    });

  const lastLp = state.log.findLastIndex(e => e.kind === 'lp');
  const hasUndo = lastLp >= 0 && lastLp > state.log.findLastIndex(e => e.kind === 'reset');

  const press = (key: string) => {
    if (key === 'C') return setInput(0);
    if (key === '🎲') return pushRandom({kind: 'dice', value: rollDice(), at: Date.now()});
    if (key === 'コイン') return pushRandom({kind: 'coin', value: flipCoin(), at: Date.now()});
    if (key === '⌫') return setInput(v => Math.floor(v / 10));
    setInput(v => {
      const next = Number(`${v}${key}`);
      return next > MAX_INPUT ? v : next;
    });
  };

  return (
    <div className="duel">
      <header className="duel-bar">
        {nav}
        <div className="duel-bar-actions">
          <Button label="履歴" variant="ghost" onClick={() => setHistoryOpen(true)} />
          <Button label="戻す" variant="secondary" onClick={() => setState(undoLp)} isDisabled={!hasUndo} />
          <Button
            label={confirmReset ? 'もう一度押す' : 'リセット'}
            variant="destructive"
            onClick={reset}
          />
        </div>
      </header>

      <div className="duel-main">
        <PlayerPanel
          side="left"
          name={state.names[0]}
          lp={state.lp[0]}
          canApply={input > 0}
          onDamage={() => changeLp(0, -1)}
          onHeal={() => changeLp(0, 1)}
          onHalve={() => halveLp(0)}
          onEditName={() => setEditing(0)}
        />

        <section className="pad" aria-label="数値入力">
          <div className="pad-display" aria-live="polite">
            <span className="pad-value">
              {input ? fmt(input) : <span className="pad-placeholder">数値を入力</span>}
            </span>
            {lastRoll && (
              <span className="roll-result" key={lastRoll.at}>
                {lastRoll.kind === 'dice' ? (
                  <>
                    <span className="dice-face">{DICE_FACE[lastRoll.value - 1]}</span>
                    {lastRoll.value}
                  </>
                ) : (
                  `コイン ${lastRoll.value}`
                )}
              </span>
            )}
          </div>
          <div className="pad-keys">
            {KEYS.map(k => (
              <button
                key={k}
                type="button"
                className={`key ${/^\d+$/.test(k) ? '' : 'key-sub'}`}
                aria-label={KEY_LABEL[k]}
                onClick={() => press(k)}>
                {k}
              </button>
            ))}
          </div>
        </section>

        <PlayerPanel
          side="right"
          name={state.names[1]}
          lp={state.lp[1]}
          canApply={input > 0}
          onDamage={() => changeLp(1, -1)}
          onHeal={() => changeLp(1, 1)}
          onHalve={() => halveLp(1)}
          onEditName={() => setEditing(1)}
        />
      </div>

      <Drawer isOpen={historyOpen} onOpenChange={setHistoryOpen} label="履歴" side="end" width={360}>
        <DrawerHeader title="履歴" onOpenChange={setHistoryOpen} />
        <div className="drawer-body">
          <History state={state} />
        </div>
      </Drawer>

      <Drawer
        isOpen={editing !== null}
        onOpenChange={o => !o && setEditing(null)}
        label="プレイヤー名"
        side="end"
        width={320}>
        <DrawerHeader title="プレイヤー名" onOpenChange={o => !o && setEditing(null)} />
        <div className="drawer-body">
          <VStack gap={4}>
            <TextInput label="自分側" value={state.names[0]} onChange={v => rename(0, v)} />
            <TextInput label="相手側" value={state.names[1]} onChange={v => rename(1, v)} />
          </VStack>
        </div>
      </Drawer>
    </div>
  );
}

function PlayerPanel({
  side,
  name,
  lp,
  canApply,
  onDamage,
  onHeal,
  onHalve,
  onEditName,
}: {
  side: 'left' | 'right';
  name: string;
  lp: number;
  canApply: boolean;
  onDamage: () => void;
  onHeal: () => void;
  onHalve: () => void;
  onEditName: () => void;
}) {
  const ratio = Math.min(lp, START_LP) / START_LP;
  const level = lp === 0 ? 'zero' : lp <= 2000 ? 'low' : lp <= 4000 ? 'mid' : 'high';
  return (
    <section className={`player player-${side}`} aria-label={`${name}のライフ`}>
      <button type="button" className="player-name" onClick={onEditName}>
        {name}
      </button>
      <div className={`lp lp-${level}`}>{fmt(lp)}</div>
      <div className="lp-bar" aria-hidden="true">
        <div className={`lp-fill lp-fill-${level}`} style={{width: `${ratio * 100}%`}} />
      </div>
      <div className="player-actions">
        <button type="button" className="act act-damage" onClick={onDamage} disabled={!canApply}>
          <span className="act-sign">−</span>
          <span className="act-text">ダメージ</span>
        </button>
        <button type="button" className="act act-heal" onClick={onHeal} disabled={!canApply}>
          <span className="act-sign">＋</span>
          <span className="act-text">回復</span>
        </button>
        <button type="button" className="act act-halve" onClick={onHalve}>
          半分
        </button>
      </div>
    </section>
  );
}

function History({state}: {state: DuelState}) {
  const items = [...state.log].reverse().slice(0, 50);
  if (items.length === 0) return <Text color="secondary">まだ記録はありません。</Text>;
  return (
    <ol className="history">
      {items.map((e, i) => (
        <li key={`${e.at}-${i}`}>
          <Text type="supporting" color="secondary" hasTabularNumbers>
            {new Date(e.at).toLocaleTimeString('ja-JP', {hour: '2-digit', minute: '2-digit'})}
          </Text>
          <Text hasTabularNumbers>{describe(e, state.names)}</Text>
        </li>
      ))}
    </ol>
  );
}

function describe(e: DuelEvent, names: [string, string]): string {
  switch (e.kind) {
    case 'lp': {
      const diff = e.after - e.before;
      const sign = diff > 0 ? '＋' : '−';
      return `${names[e.player]}：${fmt(e.before)} → ${fmt(e.after)}（${sign}${fmt(Math.abs(diff))}）`;
    }
    case 'dice':
      return `ダイス：${e.value}`;
    case 'coin':
      return `コイン：${e.value}`;
    case 'reset':
      return 'デュエルをリセット（LP 8000）';
  }
}
