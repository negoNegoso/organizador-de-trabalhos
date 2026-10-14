import { expect, test } from '@playwright/test';
import { clienteLogado, contarArquivosDe, criarArquivo, limparTudo, semear } from '../compartilhado/supabase';
import { entrar } from './ajuda';

test.beforeEach(async () => {
  await limparTudo();
});

test('abrir, renomear, mover e apagar arquivo', async ({ page }) => {
  const sb = await clienteLogado();
  const s = await semear(sb);
  const arq = await criarArquivo(sb, s.alunos.maria, s.atividadeId, 'Prova 1');

  await entrar(page);
  await page.goto(`/alunos/${s.alunos.maria}`);
  const cartao = page.getByTestId('arquivo');
  await expect(cartao).toContainText('Prova 1');

  const resposta = await page.request.get(`/arquivos/${arq.id}`);
  expect(resposta.status()).toBe(200);
  expect(resposta.headers()['content-type']).toContain('pdf');

  await cartao.getByRole('button', { name: 'Renomear' }).click();
  await cartao.getByLabel('Novo nome').fill('Prova 1 - refeita');
  await cartao.getByRole('button', { name: 'Salvar' }).click();
  await expect(cartao).toContainText('Prova 1 - refeita');

  await cartao.getByRole('button', { name: 'Mover' }).click();
  await cartao.getByLabel('Mover para qual aluno?').fill('joao');
  await cartao.getByRole('button', { name: /João Pedro/ }).click();
  await expect(page.getByText('Nenhum arquivo ainda.')).toBeVisible();

  await page.goto(`/alunos/${s.alunos.joao}`);
  await expect(page.getByTestId('arquivo')).toContainText('Prova 1 - refeita');
  await page.getByTestId('arquivo').getByRole('button', { name: 'Apagar' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Apagar' }).click();
  await expect(page.getByText('Nenhum arquivo ainda.')).toBeVisible();
  expect(await contarArquivosDe(s.alunos.joao)).toBe(0);
});

test('arquivo de outro id responde 404', async ({ page }) => {
  await entrar(page);
  const r = await page.request.get(`/arquivos/${crypto.randomUUID()}`);
  expect(r.status()).toBe(404);
});
