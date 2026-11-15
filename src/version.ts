/** ビルド時に埋め込まれる、この画面の版（開発中は 'dev'） */
export const APP_VERSION: string = typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : 'dev';

/** 手元の版が公開中の版より古いか */
export function isOutdated(current: string, latest: string | null): boolean {
  if (current === 'dev' || latest === null) return false;
  return current !== latest;
}

/** 公開中の版を version.json から取る（キャッシュを使わない）。取れなければ null */
export async function fetchLatestVersion(base: string): Promise<string | null> {
  try {
    const res = await fetch(`${base}version.json?t=${Date.now()}`, {cache: 'no-store'});
    if (!res.ok) return null;
    const body: unknown = await res.json();
    const version = (body as {version?: unknown})?.version;
    return typeof version === 'string' ? version : null;
  } catch {
    return null;
  }
}
