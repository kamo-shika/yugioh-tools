// 効果音（Web Audio で合成するので音声ファイルは不要）
const KEY = 'ygo-sound-on';

let ctx: AudioContext | null = null;
let enabled = (() => {
  try {
    return localStorage.getItem(KEY) !== '0';
  } catch {
    return true;
  }
})();

export const isSoundOn = () => enabled;
export function setSoundOn(on: boolean) {
  enabled = on;
  try {
    localStorage.setItem(KEY, on ? '1' : '0');
  } catch {
    /* 保存できなくても動く */
  }
}

function audio(): AudioContext | null {
  if (!enabled) return null;
  try {
    ctx ??= new AudioContext();
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    return ctx;
  } catch {
    return null;
  }
}

function tone(
  freq: number,
  dur: number,
  {type = 'square', gain = 0.06, endFreq, delay = 0}: {
    type?: OscillatorType;
    gain?: number;
    endFreq?: number;
    delay?: number;
  } = {},
) {
  const ac = audio();
  if (!ac) return;
  const t = ac.currentTime + delay;
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (endFreq) osc.frequency.exponentialRampToValueAtTime(endFreq, t + dur);
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g).connect(ac.destination);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

/** LP カウント中の「ディ」 */
export const lpTick = (down: boolean) => tone(down ? 900 : 1300, 0.03, {gain: 0.035});

/** LP カウント終わりの「ディーン」 */
export function lpFinish(down: boolean) {
  if (down) {
    tone(520, 0.45, {endFreq: 180, gain: 0.07, type: 'sawtooth'});
  } else {
    tone(660, 0.12, {type: 'triangle', gain: 0.09});
    tone(990, 0.3, {type: 'triangle', gain: 0.09, delay: 0.1});
  }
}

/** ダイスが転がる音 */
export function diceRattle(duration: number) {
  const n = Math.floor(duration / 90);
  for (let i = 0; i < n; i++) {
    tone(180 + Math.random() * 220, 0.035, {type: 'square', gain: 0.03, delay: i * 0.09 * (1 + i / n)});
  }
}

/** コインを弾く音 */
export const coinFlip = () => tone(1800, 0.25, {type: 'sine', gain: 0.06, endFreq: 2400});

/** 結果が出たときの音 */
export const landed = () => tone(880, 0.18, {type: 'triangle', gain: 0.08});
