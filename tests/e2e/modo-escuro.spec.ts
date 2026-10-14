import { expect, test } from '@playwright/test';
import { limparTudo } from '../compartilhado/supabase';
import { entrar } from './ajuda';

test.use({ colorScheme: 'dark' });

test.beforeEach(async () => {
  await limparTudo();
});

test('com o SO em modo escuro, listas, cartões e barra de abas continuam legíveis', async ({ page }) => {
  await entrar(page);
  await page.getByRole('navigation', { name: 'Navegação principal' }).getByRole('link', { name: 'Mais' }).click();
  await page.getByLabel('Ano', { exact: true }).fill('2026');
  await page.getByRole('button', { name: 'Criar ano' }).click();
  const link = page.getByRole('link', { name: '2026' });
  await expect(link).toBeVisible();
  const luminancia = async (cor: string) => {
    const [r, g, b] = cor.match(/\d+(\.\d+)?/g)!.slice(0, 3).map(Number);
    return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  };
  expect(await luminancia(await link.evaluate((el) => getComputedStyle(el).color))).toBeLessThan(0.5);
  const barra = page.getByRole('navigation', { name: 'Navegação principal' });
  expect(await barra.evaluate((el) => getComputedStyle(el).backgroundColor)).toBe('rgb(255, 255, 255)');
  const fundo = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  expect(fundo).not.toBe('rgb(10, 10, 10)');
});
