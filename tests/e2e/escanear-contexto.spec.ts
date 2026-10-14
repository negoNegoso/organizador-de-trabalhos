import { expect, test, type Page } from '@playwright/test';
import { clienteLogado, limparTudo, semear, type Semente } from '../compartilhado/supabase';
import { entrar } from './ajuda';

const escanear = (page: Page) =>
  page.getByRole('navigation', { name: 'Navegação principal' }).getByRole('button', { name: 'Escanear' });

let s: Semente;
test.beforeEach(async ({ page }) => {
  await limparTudo();
  s = await semear(await clienteLogado());
  await entrar(page);
});

test('📷 na pasta do aluno abre a câmera dele', async ({ page }) => {
  await page.goto(`/alunos/${s.alunos.maria}`);
  await escanear(page).click();
  await expect(page).toHaveURL(`/alunos/${s.alunos.maria}/escanear`);
});

test('📷 na turma lista as atividades e leva ao lote escolhido', async ({ page }) => {
  await page.goto(`/turmas/${s.turmaId}`);
  await escanear(page).click();
  const menu = page.getByRole('dialog', { name: 'Escanear lote — 3º A' });
  await menu.getByRole('button', { name: 'Prova 1' }).click();
  await expect(page).toHaveURL(`/lote/${s.atividadeId}`);
});

test('📷 na turma sem atividades abre direto o criar', async ({ page }) => {
  const sb = await clienteLogado();
  await sb.from('atividades').delete().eq('id', s.atividadeId);
  await page.goto(`/turmas/${s.turmaId}`);
  await escanear(page).click();
  const menu = page.getByRole('dialog', { name: 'Escanear lote — 3º A' });
  const campo = menu.getByLabel('Nova atividade');
  await expect(campo).toBeFocused();
  await campo.fill('Redação');
  await menu.getByRole('button', { name: 'Criar e escanear' }).click();
  await expect(page).toHaveURL(/\/lote\/[0-9a-f-]{36}$/);
});

test('📷 numa turma sem alunos avisa para adicionar alunos', async ({ page }) => {
  const sb = await clienteLogado();
  const vazia = (await sb.from('turmas').insert({ ano_letivo_id: s.anoId, nome: '9º Z' }).select('id').single()).data!;
  await page.goto(`/turmas/${vazia.id}`);
  await escanear(page).click();
  await expect(page.getByRole('dialog', { name: 'Escanear lote — 9º Z' })).toContainText('Adicione alunos primeiro');
});
