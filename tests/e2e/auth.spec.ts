import { expect, test } from '@playwright/test';
import { EMAIL } from '../compartilhado/supabase';
import { entrar } from './ajuda';

test('sem login redireciona para /login', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/\/login$/);
});

test('senha errada mostra erro', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill(EMAIL);
  await page.getByLabel('Senha').fill('errada');
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page.locator('form [role="alert"]')).toHaveText('Email ou senha incorretos.');
});

test('entra e sai', async ({ page }) => {
  await entrar(page);
  await expect(page.getByRole('heading', { name: 'Início' })).toBeVisible();
  await page.getByRole('navigation', { name: 'Navegação principal' }).getByRole('link', { name: 'Mais' }).click();
  await page.getByRole('button', { name: 'Sair' }).click();
  await expect(page).toHaveURL(/\/login$/);
});
