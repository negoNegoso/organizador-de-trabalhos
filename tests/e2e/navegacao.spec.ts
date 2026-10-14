import { expect, test, type Page } from '@playwright/test';
import { clienteLogado, limparTudo, semear, type Semente } from '../compartilhado/supabase';
import { entrar } from './ajuda';

const abas = (page: Page) => page.getByRole('navigation', { name: 'Navegação principal' });

let s: Semente;
test.beforeEach(async ({ page }) => {
  await limparTudo();
  s = await semear(await clienteLogado());
  await entrar(page);
});

test('abas levam às seções e marcam a aba ativa', async ({ page }) => {
  for (const [nome, url] of [['Turmas', '/turmas'], ['Buscar', '/buscar'], ['Mais', '/mais'], ['Início', '/']] as const) {
    await abas(page).getByRole('link', { name: nome }).click();
    await expect(page).toHaveURL(url);
    await expect(abas(page).getByRole('link', { name: nome })).toHaveAttribute('aria-current', 'page');
  }
  await page.goto(`/alunos/${s.alunos.maria}`);
  await expect(abas(page).getByRole('link', { name: 'Turmas' })).toHaveAttribute('aria-current', 'page');
});

test('Início mostra as turmas do ano e troca de ano (lembrando a escolha)', async ({ page }) => {
  const sb = await clienteLogado();
  const ano2025 = (await sb.from('anos_letivos').insert({ ano: 2025 }).select('id').single()).data!;
  await sb.from('turmas').insert({ ano_letivo_id: ano2025.id, nome: '2º B', cor: 'rosa' });
  await page.goto('/');

  await expect(page.getByRole('link', { name: /3º A/ })).toHaveAttribute('data-cor', 'azul');
  await page.getByRole('button', { name: /Ano letivo 2026/ }).click();
  await page.getByRole('dialog', { name: 'Ano letivo' }).getByRole('radio', { name: /2025/ }).click();
  await expect(page.getByRole('link', { name: /2º B/ })).toHaveAttribute('data-cor', 'rosa');
  await expect(page.getByRole('link', { name: /3º A/ })).toHaveCount(0);

  await page.reload();
  await expect(page.getByRole('link', { name: /2º B/ })).toBeVisible();
});

test('nomes muito longos não criam rolagem horizontal', async ({ page }) => {
  const sb = await clienteLogado();
  await sb.from('turmas').insert({ ano_letivo_id: s.anoId, nome: 'Turma com um nome exageradamente comprido para caber' });
  for (const url of ['/', '/turmas']) {
    await page.goto(url);
    const sobra = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(sobra).toBeLessThanOrEqual(0);
  }
});

test('📷 no Início abre o menu e leva à câmera do aluno escolhido', async ({ page }) => {
  await abas(page).getByRole('button', { name: 'Escanear' }).click();
  const menu = page.getByRole('dialog', { name: 'O que você quer fazer?' });
  await expect(menu.getByRole('button', { name: /Escanear lote/ })).toBeVisible();
  await expect(menu.getByRole('button', { name: /Enviar arquivo/ })).toBeVisible();
  await menu.getByRole('button', { name: /Escanear para um aluno/ }).click();
  const busca = page.getByRole('dialog', { name: 'Escanear para qual aluno?' });
  await busca.getByLabel('Nome do aluno').fill('maria');
  await busca.getByRole('button', { name: /Maria Souza/ }).click();
  await expect(page).toHaveURL(`/alunos/${s.alunos.maria}/escanear`);
  await expect(abas(page)).toHaveCount(0);
});
