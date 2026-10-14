import { expect, test } from '@playwright/test';
import { clienteLogado, contarArquivosDe, limparTudo, semear, type Semente } from '../compartilhado/supabase';
import { entrar } from './ajuda';

let s: Semente;
test.beforeEach(async ({ page }) => {
  await limparTudo();
  s = await semear(await clienteLogado());
  await entrar(page);
});

test('lote: detecta a folha, salva para a aluna e a tira da lista', async ({ page }) => {
  await page.goto('/lote');
  await page.getByLabel('Ano letivo').selectOption({ label: '2026' });
  await page.getByLabel('Turma').selectOption({ label: '3º A' });
  await page.getByLabel('Atividade').selectOption({ label: 'Prova 1' });
  await page.getByRole('button', { name: 'Começar' }).click();

  await expect(page.locator('canvas[data-detectado="sim"]')).toBeAttached({ timeout: 30_000 });
  await page.getByRole('button', { name: 'Capturar' }).click();
  await page.getByRole('button', { name: 'Revisar (1)' }).click();
  await expect(page.getByAltText('Página 1')).toBeVisible({ timeout: 15_000 });
  await page.getByRole('button', { name: 'Continuar (1)' }).click();
  await page.getByRole('button', { name: 'Maria Souza' }).click();
  await expect(page.getByText('Salvo para Maria Souza')).toBeVisible();

  // Próximo trabalho: Maria não aparece mais, mesmo antes do envio terminar.
  await page.getByRole('button', { name: 'Capturar' }).click();
  await page.getByRole('button', { name: 'Revisar (1)' }).click();
  await page.getByRole('button', { name: 'Continuar (1)' }).click();
  await expect(page.getByRole('button', { name: 'Maria Souza' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'João Pedro' })).toBeVisible();

  await expect.poll(() => contarArquivosDe(s.alunos.maria), { timeout: 20_000 }).toBe(1);
});

test('avulso: escaneia, ajusta cantos e salva na pasta', async ({ page }) => {
  await page.goto(`/alunos/${s.alunos.joao}`);
  await page.getByRole('link', { name: 'Escanear' }).click();
  await expect(page.locator('canvas[data-detectado="sim"]')).toBeAttached({ timeout: 30_000 });
  await page.getByRole('button', { name: 'Capturar' }).click();
  await page.getByRole('button', { name: 'Revisar (1)' }).click();
  await page.getByRole('button', { name: 'Ajustar cantos' }).click();
  await page.getByRole('button', { name: 'Página inteira' }).click();
  await page.getByRole('button', { name: 'Aplicar' }).click();
  await page.getByRole('button', { name: 'Girar' }).click();
  await page.getByRole('button', { name: 'Continuar (1)' }).click();
  await page.getByLabel('Atividade').selectOption({ label: 'Prova 1' });
  await page.getByRole('button', { name: 'Salvar' }).click();
  await expect(page).toHaveURL(`/alunos/${s.alunos.joao}`);
  await expect(page.getByTestId('arquivo')).toContainText('1 página(s)', { timeout: 20_000 });
});
