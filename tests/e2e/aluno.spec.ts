import { expect, test } from '@playwright/test';
import { clienteLogado, contarArquivosDe, criarArquivo, limparTudo, semear } from '../compartilhado/supabase';
import { entrar } from './ajuda';

test.beforeEach(async () => {
  await limparTudo();
});
test('abrir, renomear, mover e apagar arquivo pelo ⋯', async ({ page }) => {
  const sb = await clienteLogado();
  const s = await semear(sb);
  const arq = await criarArquivo(sb, s.alunos.maria, s.atividadeId, 'Prova 1');

  await entrar(page);
  await page.goto(`/alunos/${s.alunos.maria}`);
  const cartao = page.getByTestId('arquivo');
  await expect(cartao.getByRole('link', { name: /Prova 1/ })).toHaveAttribute('href', `/arquivos/${arq.id}`);

  const resposta = await page.request.get(`/arquivos/${arq.id}`);
  expect(resposta.status()).toBe(200);
  expect(resposta.headers()['content-type']).toContain('pdf');

  await cartao.getByRole('button', { name: 'Ações do arquivo' }).click();
  await page.getByRole('dialog', { name: 'Prova 1', exact: true }).getByRole('button', { name: 'Renomear' }).click();
  const renomear = page.getByRole('dialog', { name: 'Renomear arquivo' });
  await renomear.getByLabel('Novo nome').fill('Prova 1 - refeita');
  await renomear.getByRole('button', { name: 'Salvar' }).click();
  await expect(cartao).toContainText('Prova 1 - refeita');

  await cartao.getByRole('button', { name: 'Ações do arquivo' }).click();
  await page.getByRole('dialog', { name: 'Prova 1 - refeita' }).getByRole('button', { name: 'Mover para outro aluno' }).click();
  const mover = page.getByRole('dialog', { name: 'Mover para qual aluno?' });
  await mover.getByLabel('Nome do aluno').fill('joao');
  await mover.getByRole('button', { name: /João Pedro/ }).click();
  await expect(page.getByText('Nenhum arquivo ainda.')).toBeVisible();

  await page.goto(`/alunos/${s.alunos.joao}`);
  await page.getByTestId('arquivo').getByRole('button', { name: 'Ações do arquivo' }).click();
  await page.getByRole('dialog', { name: 'Prova 1 - refeita' }).getByRole('button', { name: 'Apagar', exact: true }).click();
  await page.getByRole('dialog', { name: /^Apagar/ }).getByRole('button', { name: 'Apagar' }).click();
  await expect(page.getByText('Nenhum arquivo ainda.')).toBeVisible();
  expect(await contarArquivosDe(s.alunos.joao)).toBe(0);
});

test('renomear o aluno pelo ⋯ e ver a etiqueta da turma', async ({ page }) => {
  const s = await semear(await clienteLogado());
  await entrar(page);
  await page.goto(`/alunos/${s.alunos.maria}`);
  await expect(page.getByText('3º A · 2026')).toBeVisible();
  await page.getByRole('button', { name: 'Ações do aluno' }).click();
  await page.getByRole('dialog', { name: 'Maria Souza' }).getByRole('button', { name: 'Renomear' }).click();
  const painel = page.getByRole('dialog', { name: 'Renomear aluno' });
  await painel.getByLabel('Nome do aluno').fill('Maria S. Lima');
  await painel.getByRole('button', { name: 'Salvar' }).click();
  await expect(page.getByRole('heading', { name: 'Maria S. Lima' })).toBeVisible();
});
test('arquivo de outro id responde 404', async ({ page }) => {
  await entrar(page);
  const r = await page.request.get(`/arquivos/${crypto.randomUUID()}`);
  expect(r.status()).toBe(404);
});
