import { expect, type Page } from '@playwright/test';
import { EMAIL, SENHA } from '../compartilhado/supabase';

export async function entrar(page: Page) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(EMAIL);
  await page.getByLabel('Senha').fill(SENHA);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page).toHaveURL('/');
}
