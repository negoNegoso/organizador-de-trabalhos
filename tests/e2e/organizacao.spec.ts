import { expect, test } from '@playwright/test';
import { limparTudo } from '../compartilhado/supabase';
import { entrar } from './ajuda';

test.beforeEach(async () => {
  await limparTudo();
});

test('cria ano, turma, alunos colados e atividade; busca sem acento', async ({ page }) => {
  await entrar(page);
  await page.getByLabel('Ano', { exact: true }).fill('2026');
  await page.getByRole('button', { name: 'Criar ano' }).click();
  await page.getByRole('link', { name: '2026' }).click();

  await page.getByLabel('Nome da turma').fill('3º A');
  await page.getByRole('button', { name: 'Criar turma' }).click();
  await page.getByRole('link', { name: '3º A' }).click();

  await page.getByLabel('Cole um nome por linha').fill('Maria Souza\n\n  João Pedro \nmaria souza\nAna');
  await page.getByRole('button', { name: 'Adicionar alunos' }).click();
  await expect(page.getByRole('status')).toHaveText('3 adicionados, 1 ignorado');
  await expect(page.getByRole('link', { name: /João Pedro/ })).toBeVisible();

  await page.getByRole('tab', { name: 'Atividades' }).click();
  await page.getByLabel('Nome da atividade').fill('Prova 1');
  await page.getByRole('button', { name: 'Criar atividade' }).click();
  await expect(page.getByText('0/3 entregues')).toBeVisible();

  await page.goto('/');
  await page.getByLabel('Buscar aluno').fill('joao');
  await expect(page.getByRole('link', { name: 'João Pedro — 3º A (2026)' })).toBeVisible();
});

test('apagar turma pede confirmação com a contagem de arquivos', async ({ page }) => {
  await entrar(page);
  await page.getByLabel('Ano', { exact: true }).fill('2026');
  await page.getByRole('button', { name: 'Criar ano' }).click();
  await page.getByRole('link', { name: '2026' }).click();
  await page.getByLabel('Nome da turma').fill('3º B');
  await page.getByRole('button', { name: 'Criar turma' }).click();
  await page.getByRole('link', { name: '3º B' }).click();

  await page.getByRole('button', { name: 'Apagar turma' }).click();
  const dialogo = page.getByRole('dialog');
  await expect(dialogo).toContainText('Isso vai apagar 0 arquivo(s).');
  await dialogo.getByRole('button', { name: 'Apagar' }).click();
  await expect(page.getByRole('heading', { name: '2026' })).toBeVisible();
  await expect(page.getByRole('link', { name: '3º B' })).toHaveCount(0);
});
