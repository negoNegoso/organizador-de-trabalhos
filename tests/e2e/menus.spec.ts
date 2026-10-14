import { expect, test } from '@playwright/test';
import { clienteLogado, limparTudo, semear } from '../compartilhado/supabase';
import { entrar } from './ajuda';

test.beforeEach(async () => {
  await limparTudo();
});

test('confirmação de apagar é um menu inferior que fecha com Esc e com Cancelar', async ({ page }) => {
  const s = await semear(await clienteLogado());
  await entrar(page);
  await page.goto(`/turmas/${s.turmaId}`);

  await page.getByRole('button', { name: 'Apagar turma' }).click();
  const dialogo = page.getByRole('dialog', { name: 'Apagar a turma 3º A?' });
  await expect(dialogo).toContainText('Isso vai apagar 0 arquivo(s).');
  await page.keyboard.press('Escape');
  await expect(dialogo).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Apagar turma' })).toBeFocused();

  await page.getByRole('button', { name: 'Apagar turma' }).click();
  await dialogo.getByRole('button', { name: 'Cancelar' }).click();
  await expect(dialogo).toHaveCount(0);
  await expect(page.getByRole('heading', { name: '3º A' })).toBeVisible();
});

test('se a contagem de arquivos falhar, o usuário ainda consegue cancelar', async ({ page }) => {
  const s = await semear(await clienteLogado());
  await entrar(page);
  await page.goto(`/turmas/${s.turmaId}`);

  await page.route('**/rest/v1/arquivos*', (r) => r.fulfill({ status: 500, body: '{"message":"falha"}' }));
  await page.getByRole('button', { name: 'Apagar turma' }).click();
  const dialogo = page.getByRole('dialog', { name: 'Apagar a turma 3º A?' });
  await expect(dialogo).toContainText('Não consegui contar os arquivos.');
  await expect(dialogo.getByRole('button', { name: 'Apagar', exact: true })).toBeDisabled();
  await dialogo.getByRole('button', { name: 'Cancelar' }).click();
  await expect(dialogo).toHaveCount(0);
  await page.unroute('**/rest/v1/arquivos*');
});
