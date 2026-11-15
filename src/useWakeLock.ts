import {useEffect} from 'react';

/** 対戦中に画面がスリープしないようにする（対応ブラウザのみ。失敗しても何もしない） */
export function useWakeLock() {
  useEffect(() => {
    let lock: WakeLockSentinel | null = null;
    let cancelled = false;

    const request = async () => {
      if (!('wakeLock' in navigator) || document.visibilityState !== 'visible') return;
      try {
        lock = await navigator.wakeLock.request('screen');
        if (cancelled) lock.release().catch(() => {});
      } catch {
        /* 省電力モードなどで拒否されることがある */
      }
    };

    const onVisible = () => {
      if (document.visibilityState === 'visible') request();
    };

    request();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisible);
      lock?.release().catch(() => {});
    };
  }, []);
}
