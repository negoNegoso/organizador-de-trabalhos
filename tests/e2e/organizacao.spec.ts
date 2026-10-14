import { expect, test, type Page } from '@playwright/test';
import { limparTudo } from '../compartilhado/supabase';
import { entrar } from './ajuda';

const abas = (page: Page) => page.getByRole('navigation', { name: 'Navegação principal' });

async function criarAnoETurma(page: Page, turma: string, cor: string) {
  await abas(page).getByRole('link', { name: 'Mais' }).click();
  await page.getByLabel('Ano', { exact: true }).fill('2026');
  await page.getByRole('button', { name: 'Criar ano' }).click();
  await expect(page.getByRole('link', { name: '2026' })).toBeVisible();
  await abas(page).getByRole('link', { name: 'Início' }).click();
  await expect(page.getByText('Nenhuma turma em 2026')).toBeVisible();
  await page.getByRole('button', { name: 'Nova turma' }).click();
  const painel = page.getByRole('dialog', { name: 'Nova turma' });
  await painel.getByLabel('Nome da turma').fill(turma);
  await painel.getByRole('radio', { name: cor }).click();
  await painel.getByRole('button', { name: 'Criar turma' }).click();
  const cartao = page.getByRole('link', { name: new RegExp(turma) });
  await expect(cartao).toHaveAttribute('data-cor', cor.toLowerCase());
  await cartao.click();
}

test.beforeEach(async () => {
  await limparTudo();
});

test('cria ano, turma colorida, alunos colados e atividade; busca sem acento', async ({ page }) => {
  await entrar(page);
  await criarAnoETurma(page, '3º A', 'Verde');

  await page.getByLabel('Cole um nome por linha').fill('Maria Souza\n\n  João Pedro \nmaria souza\nAna');
  await page.getByRole('button', { name: 'Adicionar alunos' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'adicionados' })).toHaveText('3 adicionados, 1 ignorado');
  await expect(page.getByRole('link', { name: /João Pedro/ })).toBeVisible();

  await page.getByRole('tab', { name: 'Atividades' }).click();
  await page.getByLabel('Nome da atividade').fill('Prova 1');
  await page.getByRole('button', { name: 'Criar atividade' }).click();
  await expect(page.getByText('0/3 entregues')).toBeVisible();

  await abas(page).getByRole('link', { name: 'Buscar' }).click();
  await page.getByLabel('Buscar aluno').fill('joao');
  await expect(page.getByRole('link', { name: 'João Pedro — 3º A (2026)' })).toBeVisible();
});

test('apagar turma pede confirmação com a contagem de arquivos', async ({ page }) => {
  await entrar(page);
  await criarAnoETurma(page, '3º B', 'Roxo');

  await page.getByRole('button', { name: 'Apagar turma' }).click();
  const dialogo = page.getByRole('dialog');
  await expect(dialogo).toContainText('Isso vai apagar 0 arquivo(s).');
  await dialogo.getByRole('button', { name: 'Apagar' }).click();
  await expect(page.getByRole('heading', { name: '2026' })).toBeVisible();
  await expect(page.getByRole('link', { name: '3º B' })).toHaveCount(0);
});
