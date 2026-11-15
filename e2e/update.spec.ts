import {expect, test} from '@playwright/test';

const banner = (page: import('@playwright/test').Page) => page.getByRole('status').filter({hasText: '新しい版'});

test('公開中の版が手元と同じなら、更新の案内は出ない', async ({page}) => {
  await page.goto('./');
  await expect(page.getByRole('region', {name: '自分のライフ'})).toBeVisible();
  await expect(banner(page)).toHaveCount(0);
});

test('新しい版が公開されていたら更新の案内が出て、押すと読み込み直す', async ({page}) => {
  await page.route('**/version.json*', route => route.fulfill({json: {version: 'newer-build'}}));
  await page.goto('./');
  await expect(banner(page)).toBeVisible();

  const reloaded = page.waitForEvent('load');
  await banner(page).getByRole('button', {name: '更新する'}).click();
  await reloaded;
});

test('アプリに戻ってきたときにも新しい版を確かめる', async ({page}) => {
  await page.goto('./');
  await expect(banner(page)).toHaveCount(0);

  await page.route('**/version.json*', route => route.fulfill({json: {version: 'newer-build'}}));
  await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
  await expect(banner(page)).toBeVisible();
});

test('一度開けば、電波がなくても開ける', async ({page, context}) => {
  await page.goto('./');
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload(); // Service Worker の管理下で読み込み直してキャッシュを作る
  await expect(page.getByRole('region', {name: '自分のライフ'})).toBeVisible();

  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('region', {name: '自分のライフ'})).toBeVisible();
});
