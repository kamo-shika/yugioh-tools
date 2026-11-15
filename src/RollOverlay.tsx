import {CSSProperties, useEffect, useState} from 'react';
import CoinFace from './CoinFace';
import {coinFlip, diceRattle, landed} from './sound';

export type Roll = {kind: 'dice'; value: number; at: number} | {kind: 'coin'; value: '表' | '裏'; at: number};

const ROLL_MS = 1100;
const CLOSE_MS = 1500;

/** 出目 n を手前に向けるための回転（面の配置は 前1・後6・右3・左4・上2・下5） */
const FACE_ROT: Record<number, [number, number]> = {
  1: [0, 0],
  6: [0, 180],
  3: [0, -90],
  4: [0, 90],
  2: [-90, 0],
  5: [90, 0],
};

// 3x3 のマスのどこに目を置くか
const PIPS: Record<number, number[]> = {
  1: [4],
  2: [2, 6],
  3: [2, 4, 6],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};

const FACES: {n: number; cls: string}[] = [
  {n: 1, cls: 'front'},
  {n: 6, cls: 'back'},
  {n: 3, cls: 'right'},
  {n: 4, cls: 'left'},
  {n: 2, cls: 'top'},
  {n: 5, cls: 'bottom'},
];

const spins = () => 360 * (2 + Math.floor(Math.random() * 2));

/** ダイス・コインの結果を画面中央で演出して見せる。タップで閉じる。 */
export default function RollOverlay({roll, onClose}: {roll: Roll; onClose: () => void}) {
  const [phase, setPhase] = useState<'start' | 'rolling' | 'done'>('start');
  const [spin] = useState(() => ({x: spins(), y: spins(), z: Math.random() < 0.5 ? 0 : 360}));

  useEffect(() => {
    if (roll.kind === 'dice') diceRattle(ROLL_MS);
    else coinFlip();
    const r = requestAnimationFrame(() => requestAnimationFrame(() => setPhase('rolling')));
    const t1 = setTimeout(() => {
      setPhase('done');
      landed();
    }, ROLL_MS);
    const t2 = setTimeout(onClose, ROLL_MS + CLOSE_MS);
    return () => {
      cancelAnimationFrame(r);
      clearTimeout(t1);
      clearTimeout(t2);
    };
    // 1回の出目ごとに1回だけ動かす
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roll.at]);

  let style: CSSProperties;
  if (roll.kind === 'dice') {
    const [rx, ry] = FACE_ROT[roll.value];
    style =
      phase === 'start'
        ? {transform: 'rotateX(-25deg) rotateY(35deg)'}
        : {transform: `rotateX(${rx + spin.x}deg) rotateY(${ry + spin.y}deg) rotateZ(${spin.z}deg)`};
  } else {
    const end = 360 * 5 + (roll.value === '表' ? 0 : 180);
    style = {transform: phase === 'start' ? 'rotateY(0deg)' : `rotateY(${end}deg)`};
  }

  return (
    <div className="roll-overlay" role="dialog" aria-label="結果" onClick={onClose}>
      <div className={`toss ${phase !== 'start' ? 'toss-go' : ''}`}>
        {roll.kind === 'dice' ? (
          <div className="cube" style={style}>
            {FACES.map(f => (
              <div key={f.n} className={`cube-face cube-${f.cls}`}>
                {Array.from({length: 9}, (_, i) => (
                  <span key={i} className={PIPS[f.n].includes(i) ? `pip ${f.n === 1 ? 'pip-one' : ''}` : ''} />
                ))}
              </div>
            ))}
          </div>
        ) : (
          <div className="coin" style={style}>
            <div className="coin-face coin-front">
              <CoinFace side="表" />
            </div>
            <div className="coin-face coin-back">
              <CoinFace side="裏" />
            </div>
          </div>
        )}
      </div>
      <div className={`roll-label ${phase === 'done' ? 'roll-label-show' : ''}`} aria-live="polite">
        {phase === 'done' ? (roll.kind === 'dice' ? `${roll.value}` : roll.value) : ''}
      </div>
    </div>
  );
}
