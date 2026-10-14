import { expect, test } from '@playwright/test';
import { limparTudo } from '../compartilhado/supabase';
import { entrar } from './ajuda';

test.use({ colorScheme: 'dark' });

test.beforeEach(async () => {
  await limparTudo();
});

test('com o SO em modo escuro, o texto dos cartões brancos continua escuro', async ({ page }) => {
  await entrar(page);
  await page.getByLabel('Ano', { exact: true }).fill('2026');
  await page.getByRole('button', { name: 'Criar ano' }).click();
  const link = page.getByRole('link', { name: '2026' });
  await expect(link).toBeVisible();
  const [r, g, b] = await link.evaluate((el) =>
    getComputedStyle(el).color.match(/\d+(\.\d+)?/g)!.slice(0, 3).map(Number),
  );
  const luminancia = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  expect(luminancia).toBeLessThan(0.5);
  const fundo = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  expect(fundo).not.toBe('rgb(10, 10, 10)');
});
