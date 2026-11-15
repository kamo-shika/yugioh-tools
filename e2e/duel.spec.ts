import {expect, test, type Locator, type Page} from '@playwright/test';

// 効果音とアニメーションの待ち時間を減らすため、動きを抑える設定で開く
test.use({reducedMotion: 'reduce'});

test.beforeEach(async ({page}) => {
  await page.goto('./');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

const panel = (page: Page, who: '自分' | '相手') => page.getByRole('region', {name: `${who}のライフ`});
const lpOf = (p: Locator) => p.locator('.lp');

async function enter(page: Page, ...keys: string[]) {
  for (const k of keys) await page.getByRole('button', {name: k, exact: true}).click();
}

async function damage(page: Page, who: '自分' | '相手', ...keys: string[]) {
  await enter(page, ...keys);
  await panel(page, who).getByRole('button', {name: 'ダメージ'}).click();
}

async function expectNoScroll(page: Page) {
  const [x, y] = await page.evaluate(() => [
    document.documentElement.scrollWidth > innerWidth,
    document.documentElement.scrollHeight > innerHeight,
  ]);
  expect(x, '横にはみ出していない').toBe(false);
  expect(y, '縦にはみ出していない').toBe(false);
}

test('最初は両者とも LP 8,000', async ({page}) => {
  await expect(lpOf(panel(page, '自分'))).toHaveText('8,000');
  await expect(lpOf(panel(page, '相手'))).toHaveText('8,000');
});

test('テンキーで入れた数値だけ、押した側のLPが減る', async ({page}) => {
  await damage(page, '相手', '1', '000');
  await expect(lpOf(panel(page, '相手'))).toHaveText('7,000');
  await expect(lpOf(panel(page, '自分'))).toHaveText('8,000');
});

test('続けてダメージを受けても、LPの数字は1つのままでレイアウトが崩れない', async ({page}) => {
  const me = panel(page, '自分');
  const before = await me.boundingBox();

  for (let i = 0; i < 5; i++) await damage(page, '自分', '5', '00');

  await expect(lpOf(me)).toHaveCount(1);
  await expect(lpOf(me)).toHaveText('5,500');
  expect(await me.boundingBox()).toEqual(before);
  await expectNoScroll(page);
});

test('回復と半分を混ぜても数字は1つのまま', async ({page}) => {
  const me = panel(page, '自分');
  await damage(page, '自分', '3', '000');
  await enter(page, '5', '00');
  await me.getByRole('button', {name: '回復'}).click();
  await me.getByRole('button', {name: '半分'}).click();

  await expect(lpOf(me)).toHaveCount(1);
  await expect(lpOf(me)).toHaveText('2,750');
});

test('LPは0より下がらない', async ({page}) => {
  await damage(page, '自分', '9', '000');
  await expect(lpOf(panel(page, '自分'))).toHaveText('0');
});

test('戻すで直前のダメージを取り消せる', async ({page}) => {
  await damage(page, '自分', '1', '000');
  await damage(page, '自分', '2', '000');
  await page.getByRole('button', {name: '戻す'}).click();
  await expect(lpOf(panel(page, '自分'))).toHaveText('7,000');
});

test('リセットは2回押すと両者のLPが8,000に戻る', async ({page}) => {
  await damage(page, '自分', '1', '000');
  await page.getByRole('button', {name: 'リセット'}).click();
  await expect(lpOf(panel(page, '自分'))).toHaveText('7,000');
  await page.getByRole('button', {name: 'もう一度押す'}).click();
  await expect(lpOf(panel(page, '自分'))).toHaveText('8,000');
});

test('リロードしてもLPが残る', async ({page}) => {
  await damage(page, '相手', '2', '000');
  await page.reload();
  await expect(lpOf(panel(page, '相手'))).toHaveText('6,000');
});

test('ダイスを振ると結果が出て、タップで閉じる', async ({page}) => {
  await page.getByRole('button', {name: 'ダイスを振る'}).click();
  const overlay = page.getByRole('dialog', {name: '結果'});
  await expect(overlay.locator('.roll-label')).toHaveText(/^[1-6]$/);
  await overlay.click();
  await expect(overlay).toBeHidden();
});

test('コインを投げると表か裏が出る', async ({page}) => {
  await page.getByRole('button', {name: 'コインを投げる'}).click();
  await expect(page.getByRole('dialog', {name: '結果'}).locator('.roll-label')).toHaveText(/^(表|裏)$/);
});

test('画面全体がスクロールせずに収まる', async ({page}) => {
  await expectNoScroll(page);
});
