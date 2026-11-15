import {afterEach, describe, expect, it, vi} from 'vitest';
import {fetchLatestVersion, isOutdated} from './version';

describe('新しい版があるかの判定（isOutdated）', () => {
  it('公開中の版と同じなら更新はいらない', () => {
    expect(isOutdated('abc', 'abc')).toBe(false);
  });

  it('公開中の版と違えば更新がある', () => {
    expect(isOutdated('abc', 'def')).toBe(true);
  });

  it('公開中の版が分からない（オフラインなど）ときは更新があるとは言わない', () => {
    expect(isOutdated('abc', null)).toBe(false);
  });

  it('手元が開発中の版なら比べない', () => {
    expect(isOutdated('dev', 'def')).toBe(false);
  });
});

describe('公開中の版を取りに行く（fetchLatestVersion）', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('version.json の version を返す', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ok: true, json: async () => ({version: 'def'})}));
    expect(await fetchLatestVersion('/yugioh-tools/')).toBe('def');
  });

  it('ブラウザのキャッシュを使わずに取りに行く', async () => {
    const fetch = vi.fn().mockResolvedValue({ok: true, json: async () => ({version: 'def'})});
    vi.stubGlobal('fetch', fetch);
    await fetchLatestVersion('/yugioh-tools/');
    expect(fetch).toHaveBeenCalledWith(
      expect.stringMatching(/^\/yugioh-tools\/version\.json/),
      expect.objectContaining({cache: 'no-store'}),
    );
  });

  it('通信に失敗したら null', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    expect(await fetchLatestVersion('/yugioh-tools/')).toBeNull();
  });

  it('404 などのときは null', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ok: false, json: async () => ({})}));
    expect(await fetchLatestVersion('/yugioh-tools/')).toBeNull();
  });

  it('中身の形がおかしいときは null', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ok: true, json: async () => ({v: 1})}));
    expect(await fetchLatestVersion('/yugioh-tools/')).toBeNull();
  });
});
