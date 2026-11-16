import {readFileSync} from 'node:fs';
import {expect, test, type Page} from '@playwright/test';

test.use({reducedMotion: 'reduce'});

const neuronCopy = readFileSync(new URL('../src/fixtures/neuron-copy-sp.txt', import.meta.url), 'utf8');

test.beforeEach(async ({page}) => {
  await page.goto('./#solo');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

const hand = (page: Page) => page.getByRole('region', {name: '手札'}).locator('.card-chip');
const field = (page: Page) => page.getByRole('region', {name: '場'}).locator('.card-chip');
const pile = (page: Page, name: string) => page.getByRole('button', {name: new RegExp(`^${name} \\d+枚$`)});

async function loadDeck(page: Page) {
  await page.getByLabel('デッキレシピ').fill(neuronCopy);
  await expect(page.getByText('メイン 40枚・EX 15枚・サイド 0枚')).toBeVisible();
  await page.getByRole('button', {name: 'このデッキで始める'}).click();
}

async function expectNoScroll(page: Page) {
  const [x, y] = await page.evaluate(() => [
    document.documentElement.scrollWidth > innerWidth,
    document.documentElement.scrollHeight > innerHeight,
  ]);
  expect(x, '横にはみ出していない').toBe(false);
  expect(y, '縦にはみ出していない').toBe(false);
}

test('ニューロンからコピーした文字を貼ると、5枚引いた状態で始まる', async ({page}) => {
  await loadDeck(page);
  await expect(hand(page)).toHaveCount(5);
  await expect(pile(page, 'デッキ')).toHaveAccessibleName('デッキ 35枚');
  await expect(pile(page, 'EX')).toHaveAccessibleName('EX 15枚');
  await expectNoScroll(page);
});

test('ドローを続けて押すと手札が増え、デッキが減る', async ({page}) => {
  await loadDeck(page);
  for (let i = 0; i < 3; i++) await page.getByRole('button', {name: 'ドロー', exact: true}).click();
  await expect(hand(page)).toHaveCount(8);
  await expect(pile(page, 'デッキ')).toHaveAccessibleName('デッキ 32枚');
  await expectNoScroll(page);
});

test('手札→場→墓地と動かし、戻すで1手ずつ戻る', async ({page}) => {
  await loadDeck(page);
  const name = await hand(page).first().textContent();

  await hand(page).first().click();
  await page.getByRole('button', {name: '場へ'}).click();
  await expect(field(page)).toHaveCount(1);
  await expect(field(page).first()).toHaveText(name!);
  await expect(hand(page)).toHaveCount(4);

  await field(page).first().click();
  await page.getByRole('button', {name: '墓地へ'}).click();
  await expect(field(page)).toHaveCount(0);
  await expect(pile(page, '墓地')).toHaveAccessibleName('墓地 1枚');

  await page.getByRole('button', {name: '戻す'}).click();
  await expect(field(page)).toHaveCount(1);
  await page.getByRole('button', {name: '戻す'}).click();
  await expect(hand(page)).toHaveCount(5);
  await expect(page.getByRole('button', {name: '戻す'})).toBeDisabled();
});

test('デッキの中身から手札に加え、EXから場に出せる', async ({page}) => {
  await loadDeck(page);
  await pile(page, 'デッキ').click();
  await page.locator('.pile-list button').first().click();
  await page.getByRole('button', {name: '手札へ'}).click();
  await expect(hand(page)).toHaveCount(6);
  await expect(pile(page, 'デッキ')).toHaveAccessibleName('デッキ 34枚');

  await pile(page, 'EX').click();
  await page.locator('.pile-list button').first().click();
  // EXのカードはデッキに戻す選択肢がない
  await expect(page.getByRole('button', {name: 'デッキの上へ'})).toHaveCount(0);
  await page.getByRole('button', {name: '場へ'}).click();
  await expect(field(page)).toHaveCount(1);
  await expect(pile(page, 'EX')).toHaveAccessibleName('EX 14枚');
});

test('リセットは2回押すと、40枚から引き直す', async ({page}) => {
  await loadDeck(page);
  await page.getByRole('button', {name: 'ドロー', exact: true}).click();
  await hand(page).first().click();
  await page.getByRole('button', {name: '除外する'}).click();

  await page.getByRole('button', {name: 'リセット'}).click();
  await expect(hand(page)).toHaveCount(5); // 1回目ではまだ戻らない
  await page.getByRole('button', {name: 'もう一度押す'}).click();
  await expect(hand(page)).toHaveCount(5);
  await expect(pile(page, 'デッキ')).toHaveAccessibleName('デッキ 35枚');
  await expect(pile(page, '除外')).toHaveAccessibleName('除外 0枚');
});

test('リロードしても続きから', async ({page}) => {
  await loadDeck(page);
  await page.getByRole('button', {name: 'ドロー', exact: true}).click();
  const names = await hand(page).allTextContents();
  await page.reload();
  await expect(hand(page)).toHaveText(names);
});

test('手書きのリストでも読み込める', async ({page}) => {
  await page.getByLabel('デッキレシピ').fill('黄金卿エルドリッチ ×3\n誘いのΔ ×3\n\nエクストラ\n黄金狂エルドリッチ ×2');
  await expect(page.getByText('メイン 6枚・EX 2枚・サイド 0枚')).toBeVisible();
  await page.getByRole('button', {name: 'このデッキで始める'}).click();
  await expect(hand(page)).toHaveCount(5);
  await expect(pile(page, 'デッキ')).toHaveAccessibleName('デッキ 1枚');
});
