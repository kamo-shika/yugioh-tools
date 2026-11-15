import {useEffect, useRef, useState} from 'react';
import {lpFinish, lpTick} from './sound';

const fmt = (n: number) => n.toLocaleString('ja-JP');
const reduceMotion = () =>
  typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * LP の数字を目標値までカウントアップ／ダウンさせて表示する。
 * 変化した量（−1,000 など）を浮かせて見せ、パネルを一瞬光らせる。
 */
export default function AnimatedLp({lp, className}: {lp: number; className: string}) {
  const [shown, setShown] = useState(lp);
  const [delta, setDelta] = useState<{value: number; key: number} | null>(null);
  const from = useRef(lp);
  const frame = useRef(0);

  useEffect(() => {
    const start = from.current;
    if (start === lp) return;
    const diff = lp - start;
    const down = diff < 0;
    setDelta({value: diff, key: performance.now()});

    cancelAnimationFrame(frame.current);
    if (reduceMotion()) {
      from.current = lp;
      setShown(lp);
      lpFinish(down);
      return;
    }

    const duration = Math.min(1100, 450 + Math.abs(diff) / 8);
    const t0 = performance.now();
    let lastTick = 0;
    const step = (now: number) => {
      const t = Math.min(1, (now - t0) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      const value = Math.round(start + diff * eased);
      from.current = value;
      setShown(value);
      if (t < 1) {
        if (now - lastTick > 55) {
          lpTick(down);
          lastTick = now;
        }
        frame.current = requestAnimationFrame(step);
      } else {
        from.current = lp;
        setShown(lp);
        lpFinish(down);
      }
    };
    frame.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame.current);
  }, [lp]);

  const flash = delta ? (delta.value < 0 ? 'lp-flash-damage' : 'lp-flash-heal') : '';

  // 演出をやり直すために変化ごとに要素を作り直す。
  // 数字と増減量は兄弟要素なので、key が重なると React が古い要素を消せずに残してしまう（以前のバグ）。
  const changeId = delta?.key ?? 0;

  return (
    <div className="lp-wrap">
      <div className={`${className} ${flash}`} key={`lp-${changeId}`}>
        {fmt(shown)}
      </div>
      {delta && (
        <span
          className={`lp-delta ${delta.value < 0 ? 'lp-delta-damage' : 'lp-delta-heal'}`}
          key={`delta-${changeId}`}
          aria-hidden="true">
          {delta.value < 0 ? '−' : '＋'}
          {fmt(Math.abs(delta.value))}
        </span>
      )}
    </div>
  );
}
