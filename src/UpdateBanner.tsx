import {useEffect, useState} from 'react';
import {APP_VERSION, fetchLatestVersion, isOutdated} from './version';

const CHECK_EVERY_MS = 5 * 60 * 1000;

/** 新しい版が公開されたら画面上に「更新する」を出す */
export default function UpdateBanner() {
  const [outdated, setOutdated] = useState(false);

  useEffect(() => {
    let alive = true;
    const check = async () => {
      if (document.visibilityState === 'hidden') return;
      const latest = await fetchLatestVersion(import.meta.env.BASE_URL);
      if (alive && isOutdated(APP_VERSION, latest)) setOutdated(true);
    };
    check();
    document.addEventListener('visibilitychange', check);
    const timer = setInterval(check, CHECK_EVERY_MS);
    return () => {
      alive = false;
      document.removeEventListener('visibilitychange', check);
      clearInterval(timer);
    };
  }, []);

  if (!outdated) return null;
  return (
    <div className="update-banner" role="status">
      <span>新しい版があります</span>
      <button type="button" onClick={() => location.reload()}>
        更新する
      </button>
    </div>
  );
}
