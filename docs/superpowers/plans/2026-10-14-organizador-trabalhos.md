# Organizador de Trabalhos — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** App web (PWA) para um(a) professor(a) organizar trabalhos escaneados em pastas ano letivo → turma → aluno, escanear pelo celular com recorte automático e mandar direto para a pasta do aluno.

**Architecture:** Next.js App Router (TypeScript + Tailwind) na Vercel; Supabase para login, Postgres e Storage privado. Leituras em Server Components com o cliente Supabase de servidor; mutações em Client Components com o cliente do navegador + `router.refresh()`. Toda a camada de dados fica em `src/lib/dados/*` (funções que recebem um `SupabaseClient`), o processamento de imagem e PDF em funções puras (`src/lib/imagem`, `src/lib/pdf`), e todo envio passa por uma fila no IndexedDB (`src/lib/fila`) que sobe direto do navegador para o Supabase Storage.

**Tech Stack:** Next.js (latest, App Router), React, TypeScript, Tailwind, Supabase (Auth, Postgres, Storage, CLI local via `npx supabase`), `@supabase/ssr`, `@supabase/supabase-js`, `pdf-lib`, `pdfjs-dist`, `idb`, OpenCV.js 4.10.0 (self-hosted), Vitest, `fake-indexeddb`, `jpeg-js` (só testes), Playwright, pgTAP (`supabase test db`), `sharp` (só para gerar ícones).

**Spec:** `docs/superpowers/specs/2026-10-14-organizador-trabalhos-design.md`

## Global Constraints

- Node.js ≥ 22, npm. Docker rodando (Supabase local para integração, RLS e E2E).
- Toda a interface em português do Brasil.
- Bucket privado `trabalhos`; PDF em `{aluno_id}/{arquivo_id}.pdf`; miniatura em `{aluno_id}/{arquivo_id}.thumb.jpg` (~300 px no lado maior).
- URL assinada para ver/baixar: 300 s.
- PDF enviado pronto: limite 20 MB (`20 * 1024 * 1024` bytes).
- Página escaneada: lado maior 1600 px, JPEG qualidade 0,7, página A4 (595,28 × 841,89 pt) retrato ou paisagem conforme a proporção, centralizada mantendo proporção.
- Captura guardada em memória como JPEG 0,9 com lado maior ≤ 2400 px.
- Detecção a cada ~200 ms; auto-captura com contorno estável por 1000 ms.
- Storage: limite de referência 1 GB (`1024 ** 3`), aviso a partir de 80%.
- RLS em todas as tabelas: `user_id = (select auth.uid())`. Cadastro público desligado.
- Variáveis de ambiente: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (aceita a publishable key ou a anon key), `SUPABASE_SECRET_KEY` (só scripts e testes; nunca no código do app).
- TypeScript ≥ 5.7: ao criar `Blob` a partir de `Uint8Array` use `new Blob([bytes as BlobPart])`; ao criar `ImageData` use `img.data as Uint8ClampedArray<ArrayBuffer>`.
- Todo commit termina com a linha `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Desvios conscientes da spec

- **Sem `jscanify`.** A detecção usa OpenCV.js diretamente (Canny + contornos, ~40 linhas). A correção de perspectiva é uma homografia em JS puro, a mesma usada no recorte manual quando o OpenCV falha: um único caminho de recorte, testável em Node.
- **Reordenar páginas com botões ◀ ▶** em vez de arrastar (drag-and-drop por toque é frágil no Safari).
- **Renomear/apagar aluno** fica na pasta do aluno, não na lista da turma.
- **Colunas extras:** `arquivos.tem_miniatura` e `alunos.nome_busca` (nome sem acento, minúsculo, preenchido por trigger).

## Review Focus

1. **Busca sem acento/maiúscula:** "joao" ou "JOAO" deve achar "João Pedro" → teste na Task 5 (`buscarAlunos`).
2. **Lote com envio ainda na fila:** aluno cujo PDF está pendente no celular não pode reaparecer como "falta" e gerar duplicata → teste na Task 4 (`idsEntregues`) e E2E na Task 12.
3. **Reenvio após sucesso parcial** (upload e insert ok, mas a resposta se perdeu): repetir o mesmo item não pode duplicar o arquivo nem falhar para sempre → teste na Task 10 (integração `criarEnviar`).
4. **Colar nomes com linhas vazias, espaços extras, duplicados ou já existentes na turma** → teste na Task 4 (`parseNomes`) e E2E na Task 6.
5. **PDF corrompido ou que não é PDF** em "Enviar arquivo": mensagem clara e nada entra na fila → teste na Task 9 (`validarPdf`) e E2E na Task 11.

## Estrutura de arquivos

```
src/
  proxy.ts                         protege rotas (sessão Supabase)
  app/
    layout.tsx                     raiz: lang pt-BR, metadata, RegistrarSW
    manifest.ts                    manifesto PWA + share_target
    login/page.tsx, login/FormLogin.tsx
    arquivos/[arquivoId]/route.ts  redireciona para URL assinada (abrir/baixar/miniatura)
    (app)/layout.tsx               cabeçalho, Sair, StatusFila
    (app)/error.tsx                erro genérico
    (app)/page.tsx                 Início
    (app)/anos/[anoId]/page.tsx
    (app)/turmas/[turmaId]/page.tsx
    (app)/alunos/[alunoId]/page.tsx
    (app)/alunos/[alunoId]/enviar/page.tsx
    (app)/alunos/[alunoId]/escanear/page.tsx
    (app)/lote/page.tsx, (app)/lote/[atividadeId]/page.tsx
    (app)/compartilhar/page.tsx
  lib/
    tipos.ts                       tipos de linha do banco
    mensagemErro.ts
    supabase/navegador.ts, servidor.ts, sessao.ts
    dominio/                       regras puras: busca, nomes, entregas, mover, agrupar, formato
    dados/                         acesso ao Supabase: consulta, storage, anos, turmas, alunos, atividades, arquivos, apagar
    imagem/                        tipos, homografia, retificar, cantos, rotacao, filtro, processar, estabilizador, opencv, navegador
    pdf/                           layout, montar, validar, miniatura
    envio/                         erro, classificar, montar
    fila/                          fila (IndexedDB), processar, enviar, useFila
    compartilhar.ts                arquivos recebidos pelo "Compartilhar"
  components/
    ui/                            Confirmar, FormNome, Renomear, BotaoApagar, BuscarAluno
    BotaoSair.tsx, RegistrarSW.tsx
    inicio/                        NovoAno, UsoStorage
    ano/                           NovaTurma, AcoesAno
    turma/                         AcoesTurma, AbaAlunos, AdicionarAlunos, AbaAtividades
    aluno/                         AcoesAluno, ListaArquivos
    fila/StatusFila.tsx
    envio/                         EscolherDestino, EnviarArquivos
    scanner/                       Camera, EditorCantos, Revisao, SeletorAluno, Scanner
    lote/EscolherLote.tsx
public/
  sw.js                            service worker: share target + cache do OpenCV
  opencv/opencv.js                 OpenCV.js 4.10.0
  icons/                           ícones PWA
supabase/
  config.toml
  migrations/20261014000000_esquema_inicial.sql
  tests/rls.test.sql
scripts/ env-local.sh, criar-usuario.mjs, gerar-icones.mjs
tests/
  compartilhado/supabase.ts        helpers de teste (usuário, limpeza, sementes)
  integration/                     Vitest contra Supabase local
  e2e/                             Playwright
```

---

### Task 1: Esqueleto do projeto e ferramentas de teste

**Files:**
- Create: projeto Next.js (via `create-next-app`), `vitest.config.ts`, `vitest.integracao.config.ts`, `src/lib/dominio/formato.ts`, `src/lib/dominio/formato.test.ts`
- Modify: `package.json` (scripts), `.gitignore`, `supabase/config.toml` (gerado por `supabase init`)

**Interfaces:**
- Produces: `formatarBytes(n: number): string`, `usoAlto(bytes: number): boolean`, `LIMITE_STORAGE`, `LIMIAR_AVISO`, `nomeDownload(titulo: string): string`, `tituloPadrao(data: Date): string`, `formatarData(iso: string): string`, `hojeIso(d?: Date): string` em `src/lib/dominio/formato.ts`. Scripts npm `test`, `test:int`, `test:db`, `test:e2e`, `db:start`, `usuario`.

- [ ] **Step 1: Criar o app Next.js na pasta atual**

A pasta já tem `.git` e `docs/`, que o `create-next-app` aceita.

```bash
npx create-next-app@latest . --ts --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm --yes
npx next --version
```

Anote a versão. Se for **< 16**, nas tasks seguintes o arquivo `src/proxy.ts` deve se chamar `src/middleware.ts` e exportar `middleware` em vez de `proxy`.

- [ ] **Step 2: Instalar dependências**

```bash
npm i @supabase/supabase-js @supabase/ssr pdf-lib pdfjs-dist idb
npm i -D vitest fake-indexeddb jpeg-js dotenv @playwright/test supabase sharp
npx playwright install chromium
```

- [ ] **Step 3: Inicializar o Supabase local e desligar cadastro**

```bash
npx supabase init
```

Em `supabase/config.toml`, na seção `[auth]`, defina `enable_signup = false`. Na seção `[auth.email]`, defina também `enable_signup = false`.

- [ ] **Step 4: Configurar Vitest**

`vitest.config.ts`:

```ts
import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
  test: { include: ['src/**/*.test.ts'], environment: 'node' },
});
```

`vitest.integracao.config.ts`:

```ts
import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
  test: {
    include: ['tests/integration/**/*.test.ts'],
    environment: 'node',
    setupFiles: ['tests/integration/setup.ts'],
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
});
```

Em `package.json`, dentro de `"scripts"`, adicione:

```json
"test": "vitest run",
"test:int": "vitest run -c vitest.integracao.config.ts",
"test:db": "supabase test db",
"test:e2e": "playwright test",
"db:start": "supabase start && bash scripts/env-local.sh",
"usuario": "node --env-file=.env.local scripts/criar-usuario.mjs"
```

Acrescente ao `.gitignore`:

```
.env.local
supabase/.temp
test-results/
playwright-report/
tests/e2e/fixtures/folha.y4m
```

- [ ] **Step 5: Escrever o teste de formato (falhando)**

`src/lib/dominio/formato.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { formatarBytes, formatarData, hojeIso, LIMITE_STORAGE, nomeDownload, tituloPadrao, usoAlto } from './formato';

describe('formatarBytes', () => {
  it('formata em B, KB, MB e GB no padrão brasileiro', () => {
    expect(formatarBytes(0)).toBe('0 B');
    expect(formatarBytes(500)).toBe('500 B');
    expect(formatarBytes(1536)).toBe('1,5 KB');
    expect(formatarBytes(320 * 1024 * 1024)).toBe('320 MB');
    expect(formatarBytes(1.2 * 1024 ** 3)).toBe('1,2 GB');
  });
});

describe('usoAlto', () => {
  it('avisa a partir de 80% de 1 GB', () => {
    expect(usoAlto(LIMITE_STORAGE * 0.79)).toBe(false);
    expect(usoAlto(LIMITE_STORAGE * 0.8)).toBe(true);
  });
});

describe('nomeDownload', () => {
  it('troca caracteres proibidos e adiciona .pdf', () => {
    expect(nomeDownload('Prova 1/2: final?')).toBe('Prova 1-2- final-.pdf');
    expect(nomeDownload('   ')).toBe('trabalho.pdf');
  });
});

describe('datas', () => {
  it('tituloPadrao usa a data no formato brasileiro', () => {
    expect(tituloPadrao(new Date(2026, 9, 14))).toBe('Trabalho 14/10/2026');
  });
  it('formatarData converte ISO sem depender de fuso', () => {
    expect(formatarData('2026-03-05')).toBe('05/03/2026');
  });
  it('hojeIso devolve AAAA-MM-DD local', () => {
    expect(hojeIso(new Date(2026, 0, 2))).toBe('2026-01-02');
  });
});
```

- [ ] **Step 6: Rodar e ver falhar**

Run: `npm test`
Expected: FAIL, "Failed to resolve import ./formato"

- [ ] **Step 7: Implementar**

`src/lib/dominio/formato.ts`:

```ts
export const LIMITE_STORAGE = 1024 ** 3;
export const LIMIAR_AVISO = 0.8;

export function formatarBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  const unidades = ['KB', 'MB', 'GB'];
  let valor = n / 1024;
  let i = 0;
  while (valor >= 1024 && i < unidades.length - 1) {
    valor /= 1024;
    i++;
  }
  const casas = valor < 10 ? 1 : 0;
  return `${valor.toLocaleString('pt-BR', { maximumFractionDigits: casas })} ${unidades[i]}`;
}

export function usoAlto(bytes: number): boolean {
  return bytes / LIMITE_STORAGE >= LIMIAR_AVISO;
}

export function nomeDownload(titulo: string): string {
  const base = titulo.replace(/[\\/:*?"<>|]+/g, '-').trim() || 'trabalho';
  return `${base}.pdf`;
}

export function tituloPadrao(data: Date): string {
  return `Trabalho ${data.toLocaleDateString('pt-BR')}`;
}

export function formatarData(iso: string): string {
  const [ano, mes, dia] = iso.split('-');
  return `${dia}/${mes}/${ano}`;
}

export function hojeIso(d: Date = new Date()): string {
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mes}-${dia}`;
}
```

- [ ] **Step 8: Rodar e ver passar; conferir o build**

Run: `npm test && npm run build`
Expected: testes PASS; build conclui sem erros.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "chore: esqueleto Next.js, Supabase local e Vitest

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Banco de dados — tabelas, RLS, Storage e testes pgTAP

**Files:**
- Create: `supabase/migrations/20261014000000_esquema_inicial.sql`, `supabase/tests/rls.test.sql`, `scripts/env-local.sh`

**Interfaces:**
- Produces: tabelas `anos_letivos`, `turmas`, `alunos` (com `nome_busca`), `atividades`, `arquivos` (com `tem_miniatura`); função RPC `uso_storage(): bigint`; bucket privado `trabalhos`. Arquivo `.env.local` com `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`, `TEST_EMAIL`, `TEST_PASSWORD`.

- [ ] **Step 1: Escrever o teste pgTAP (falhando)**

`supabase/tests/rls.test.sql`:

```sql
begin;
create extension if not exists pgtap with schema extensions;
select plan(14);

insert into auth.users (id, email, aud, role, instance_id) values
  ('11111111-1111-1111-1111-111111111111', 'a@teste.local', 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000'),
  ('22222222-2222-2222-2222-222222222222', 'b@teste.local', 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000');

-- Usuário A (dono) cria dados
set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';
insert into public.anos_letivos (id, ano) values ('a0000000-0000-0000-0000-000000000001', 2026);
insert into public.turmas (id, ano_letivo_id, nome) values ('a0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', '3º A');
insert into public.alunos (id, turma_id, nome) values ('a0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000002', '  João   Pedro ');
insert into public.atividades (id, turma_id, nome) values ('a0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000002', 'Prova 1');
insert into public.arquivos (aluno_id, atividade_id, titulo, storage_path, paginas, tamanho_bytes)
  values ('a0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000004', 'Prova 1', 'a0000000-0000-0000-0000-000000000003/x.pdf', 1, 1234);
insert into storage.objects (bucket_id, name, owner_id) values ('trabalhos', 'a0000000-0000-0000-0000-000000000003/x.pdf', '11111111-1111-1111-1111-111111111111');

select is((select count(*)::int from public.alunos), 1, 'dono vê o próprio aluno');
select is((select user_id from public.alunos limit 1), '11111111-1111-1111-1111-111111111111'::uuid, 'user_id preenchido automaticamente');
select is((select nome_busca from public.alunos limit 1), 'joao pedro', 'nome_busca sem acento, minúsculo e com espaços normalizados');
select is(public.uso_storage(), 1234::bigint, 'uso_storage soma os arquivos do dono');
select is((select count(*)::int from storage.objects where bucket_id = 'trabalhos'), 1, 'dono vê o próprio objeto');

-- Usuário B (outro)
set local request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}';
select is(
  (select count(*)::int from public.anos_letivos) + (select count(*)::int from public.turmas)
  + (select count(*)::int from public.alunos) + (select count(*)::int from public.atividades)
  + (select count(*)::int from public.arquivos),
  0, 'outro usuário não lê nenhuma tabela');
select is(public.uso_storage(), 0::bigint, 'uso_storage do outro usuário é zero');
select is_empty($$ update public.alunos set nome = 'x' returning id $$, 'outro usuário não altera alunos');
select is_empty($$ delete from public.arquivos returning id $$, 'outro usuário não apaga arquivos');
select throws_ok(
  $$ insert into public.anos_letivos (ano, user_id) values (2030, '11111111-1111-1111-1111-111111111111') $$,
  '42501', null, 'outro usuário não grava em nome do dono');
select is((select count(*)::int from storage.objects where bucket_id = 'trabalhos'), 0, 'outro usuário não vê objetos do dono');
select throws_ok(
  $$ insert into storage.objects (bucket_id, name, owner_id) values ('trabalhos', 'z/z.pdf', '11111111-1111-1111-1111-111111111111') $$,
  '42501', null, 'outro usuário não grava objeto em nome do dono');

-- Anônimo
set local role anon;
set local request.jwt.claims = '{"role":"anon"}';
select is((select count(*)::int from public.alunos), 0, 'anônimo não lê alunos');
select is((select count(*)::int from storage.objects where bucket_id = 'trabalhos'), 0, 'anônimo não vê objetos');

select * from finish();
rollback;
```

- [ ] **Step 2: Subir o Supabase local e ver o teste falhar**

```bash
npx supabase start
npm run test:db
```

Expected: FAIL, `relation "public.anos_letivos" does not exist`.

- [ ] **Step 3: Escrever a migração**

`supabase/migrations/20261014000000_esquema_inicial.sql`:

```sql
create extension if not exists unaccent with schema extensions;

create table public.anos_letivos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  ano int not null check (ano between 2000 and 2100),
  arquivado boolean not null default false,
  criado_em timestamptz not null default now(),
  unique (user_id, ano)
);

create table public.turmas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  ano_letivo_id uuid not null references public.anos_letivos on delete cascade,
  nome text not null check (length(trim(nome)) > 0),
  criado_em timestamptz not null default now()
);

create table public.alunos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  turma_id uuid not null references public.turmas on delete cascade,
  nome text not null check (length(trim(nome)) > 0),
  nome_busca text not null default '',
  criado_em timestamptz not null default now()
);

create table public.atividades (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  turma_id uuid not null references public.turmas on delete cascade,
  nome text not null check (length(trim(nome)) > 0),
  data date,
  criado_em timestamptz not null default now()
);

create table public.arquivos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  aluno_id uuid not null references public.alunos on delete cascade,
  atividade_id uuid references public.atividades on delete set null,
  titulo text not null check (length(trim(titulo)) > 0),
  storage_path text not null unique,
  paginas int not null check (paginas > 0),
  tamanho_bytes bigint not null check (tamanho_bytes >= 0),
  tem_miniatura boolean not null default false,
  criado_em timestamptz not null default now()
);

create index on public.anos_letivos (user_id);
create index on public.turmas (user_id);
create index on public.turmas (ano_letivo_id);
create index on public.alunos (user_id);
create index on public.alunos (turma_id);
create index on public.atividades (user_id);
create index on public.atividades (turma_id);
create index on public.arquivos (user_id);
create index on public.arquivos (aluno_id);
create index on public.arquivos (atividade_id);

-- Nome normalizado para busca sem acento
create function public.alunos_nome_busca() returns trigger
language plpgsql
set search_path = public, extensions
as $$
begin
  new.nome_busca := regexp_replace(lower(unaccent(trim(new.nome))), '\s+', ' ', 'g');
  return new;
end
$$;

create trigger alunos_nome_busca
before insert or update of nome on public.alunos
for each row execute function public.alunos_nome_busca();

-- RLS: só o dono
alter table public.anos_letivos enable row level security;
alter table public.turmas enable row level security;
alter table public.alunos enable row level security;
alter table public.atividades enable row level security;
alter table public.arquivos enable row level security;

create policy dono on public.anos_letivos for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy dono on public.turmas for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy dono on public.alunos for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy dono on public.atividades for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy dono on public.arquivos for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- Uso do storage (RLS filtra para o usuário atual)
create function public.uso_storage() returns bigint
language sql stable security invoker
set search_path = ''
as $$
  select coalesce(sum(tamanho_bytes), 0)::bigint from public.arquivos
$$;

-- Bucket privado e políticas
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('trabalhos', 'trabalhos', false, 20971520, array['application/pdf', 'image/jpeg']);

create policy "trabalhos: dono lê" on storage.objects for select to authenticated
  using (bucket_id = 'trabalhos' and owner_id = (select auth.uid())::text);
create policy "trabalhos: dono grava" on storage.objects for insert to authenticated
  with check (bucket_id = 'trabalhos' and owner_id = (select auth.uid())::text);
create policy "trabalhos: dono altera" on storage.objects for update to authenticated
  using (bucket_id = 'trabalhos' and owner_id = (select auth.uid())::text)
  with check (bucket_id = 'trabalhos' and owner_id = (select auth.uid())::text);
create policy "trabalhos: dono apaga" on storage.objects for delete to authenticated
  using (bucket_id = 'trabalhos' and owner_id = (select auth.uid())::text);
```

- [ ] **Step 4: Aplicar e ver passar**

```bash
npx supabase db reset
npm run test:db
```

Expected: `rls.test.sql .. ok`, 14 testes passando.

- [ ] **Step 5: Script que gera o `.env.local`**

`scripts/env-local.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail
eval "$(npx supabase status -o env 2>/dev/null)"
cat > .env.local <<EOF
NEXT_PUBLIC_SUPABASE_URL=$API_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=$ANON_KEY
SUPABASE_SECRET_KEY=$SERVICE_ROLE_KEY
TEST_EMAIL=professora@teste.local
TEST_PASSWORD=senha-de-teste-123
EOF
echo ".env.local gerado"
```

Run: `bash scripts/env-local.sh && grep -c = .env.local`
Expected: `.env.local gerado` e `5`.

- [ ] **Step 6: Commit**

```bash
git add supabase scripts/env-local.sh
git commit -m "feat(db): esquema, RLS, bucket privado e testes pgTAP

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Login, proteção de rotas e base de testes E2E

**Files:**
- Create: `src/lib/supabase/navegador.ts`, `src/lib/supabase/servidor.ts`, `src/lib/supabase/sessao.ts`, `src/proxy.ts`, `src/app/login/page.tsx`, `src/app/login/FormLogin.tsx`, `src/app/(app)/layout.tsx`, `src/app/(app)/page.tsx`, `src/components/BotaoSair.tsx`, `src/lib/mensagemErro.ts`, `scripts/criar-usuario.mjs`, `tests/compartilhado/supabase.ts`, `tests/integration/setup.ts`, `playwright.config.ts`, `tests/e2e/global-setup.ts`, `tests/e2e/ajuda.ts`, `tests/e2e/auth.spec.ts`
- Modify: `src/app/layout.tsx`
- Delete: `src/app/page.tsx`

**Interfaces:**
- Produces: `clienteNavegador(): SupabaseClient`, `clienteServidor(): Promise<SupabaseClient>`, `atualizarSessao(req: NextRequest): Promise<NextResponse>`, `mensagemErro(e: unknown): string`. Helpers de teste em `tests/compartilhado/supabase.ts`: `EMAIL`, `SENHA`, `admin()`, `garantirUsuario()`, `clienteLogado()`, `limparTudo()`, `pdfDeTeste(paginas?)`. Helper E2E `entrar(page)`.

- [ ] **Step 1: Clientes Supabase**

`src/lib/supabase/navegador.ts`:

```ts
import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

let cliente: SupabaseClient | null = null;

export function clienteNavegador(): SupabaseClient {
  cliente ??= createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
  return cliente;
}
```

`src/lib/supabase/servidor.ts`:

```ts
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function clienteServidor() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (lista) => {
          try {
            lista.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // Chamado de um Server Component: o proxy renova a sessão.
          }
        },
      },
    },
  );
}
```

`src/lib/supabase/sessao.ts`:

```ts
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function atualizarSessao(request: NextRequest) {
  let resposta = NextResponse.next({ request });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (lista) => {
          lista.forEach(({ name, value }) => request.cookies.set(name, value));
          resposta = NextResponse.next({ request });
          lista.forEach(({ name, value, options }) => resposta.cookies.set(name, value, options));
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const ehLogin = request.nextUrl.pathname.startsWith('/login');

  if (!user && !ehLogin) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.search = '';
    return NextResponse.redirect(url);
  }
  if (user && ehLogin) {
    const url = request.nextUrl.clone();
    url.pathname = '/';
    url.search = '';
    return NextResponse.redirect(url);
  }
  return resposta;
}
```

`src/proxy.ts` (se Next < 16: `src/middleware.ts` com `export async function middleware`):

```ts
import type { NextRequest } from 'next/server';
import { atualizarSessao } from '@/lib/supabase/sessao';

export async function proxy(request: NextRequest) {
  return atualizarSessao(request);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|sw.js|manifest.webmanifest|opencv/|icons/).*)'],
};
```

`src/lib/mensagemErro.ts`:

```ts
export function mensagemErro(e: unknown): string {
  return e instanceof Error && e.message ? e.message : 'Erro inesperado. Tente de novo.';
}
```

- [ ] **Step 2: Tela de login, layout e botão Sair**

`src/app/layout.tsx` (substitui o gerado):

```tsx
import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Organizador de Trabalhos',
  description: 'Pastas de trabalhos escaneados por aluno',
};

export const viewport: Viewport = { themeColor: '#1d4ed8' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="bg-gray-50 text-gray-900 antialiased">{children}</body>
    </html>
  );
}
```

`src/app/login/page.tsx`:

```tsx
import { FormLogin } from './FormLogin';

export default function PaginaLogin() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-6 p-4">
      <h1 className="text-2xl font-semibold">Organizador de Trabalhos</h1>
      <FormLogin />
    </main>
  );
}
```

`src/app/login/FormLogin.tsx`:

```tsx
'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { clienteNavegador } from '@/lib/supabase/navegador';

export function FormLogin() {
  const router = useRouter();
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function entrar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const dados = new FormData(e.currentTarget);
    setEnviando(true);
    setErro(null);
    const { error } = await clienteNavegador().auth.signInWithPassword({
      email: String(dados.get('email')),
      password: String(dados.get('senha')),
    });
    setEnviando(false);
    if (error) {
      setErro('Email ou senha incorretos.');
      return;
    }
    router.replace('/');
    router.refresh();
  }

  return (
    <form onSubmit={entrar} className="space-y-4">
      <div>
        <label htmlFor="email" className="block text-sm">Email</label>
        <input id="email" name="email" type="email" required autoComplete="email" className="w-full rounded border px-3 py-2" />
      </div>
      <div>
        <label htmlFor="senha" className="block text-sm">Senha</label>
        <input id="senha" name="senha" type="password" required autoComplete="current-password" className="w-full rounded border px-3 py-2" />
      </div>
      {erro && <p role="alert" className="text-sm text-red-600">{erro}</p>}
      <button disabled={enviando} className="w-full rounded bg-blue-700 py-2 text-white disabled:opacity-50">
        Entrar
      </button>
    </form>
  );
}
```

`src/components/BotaoSair.tsx`:

```tsx
'use client';

import { useRouter } from 'next/navigation';
import { clienteNavegador } from '@/lib/supabase/navegador';

export function BotaoSair() {
  const router = useRouter();
  return (
    <button
      onClick={async () => {
        await clienteNavegador().auth.signOut();
        router.replace('/login');
        router.refresh();
      }}
      className="text-sm text-gray-600"
    >
      Sair
    </button>
  );
}
```

`src/app/(app)/layout.tsx`:

```tsx
import Link from 'next/link';
import { BotaoSair } from '@/components/BotaoSair';

export default function LayoutApp({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh">
      <header className="flex items-center justify-between border-b bg-white px-4 py-3">
        <Link href="/" className="font-semibold">Organizador</Link>
        <BotaoSair />
      </header>
      <main className="mx-auto max-w-2xl p-4">{children}</main>
    </div>
  );
}
```

`src/app/(app)/page.tsx` (provisório; a Task 6 substitui):

```tsx
export default function Inicio() {
  return <h1 className="text-xl font-semibold">Início</h1>;
}
```

Apague `src/app/page.tsx`: `git rm src/app/page.tsx`.

- [ ] **Step 3: Script para criar a conta (produção e local)**

`scripts/criar-usuario.mjs`:

```js
import { createClient } from '@supabase/supabase-js';

const [email, senha] = process.argv.slice(2);
if (!email || !senha) {
  console.error('Uso: npm run usuario -- <email> <senha>');
  process.exit(1);
}
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const { error } = await admin.auth.admin.createUser({ email, password: senha, email_confirm: true });
if (error) {
  console.error(error.message);
  process.exit(1);
}
console.log(`Usuário ${email} criado.`);
```

- [ ] **Step 4: Helpers de teste compartilhados**

`tests/compartilhado/supabase.ts`:

```ts
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { PDFDocument } from 'pdf-lib';

export const EMAIL = process.env.TEST_EMAIL ?? 'professora@teste.local';
export const SENHA = process.env.TEST_PASSWORD ?? 'senha-de-teste-123';

const opcoes = { auth: { persistSession: false, autoRefreshToken: false } };

export function admin(): SupabaseClient {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, opcoes);
}

export async function garantirUsuario(): Promise<void> {
  const { error } = await admin().auth.admin.createUser({ email: EMAIL, password: SENHA, email_confirm: true });
  if (error && error.code !== 'email_exists' && !/already/i.test(error.message)) throw error;
}

export async function clienteLogado(): Promise<SupabaseClient> {
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, opcoes);
  const { error } = await sb.auth.signInWithPassword({ email: EMAIL, password: SENHA });
  if (error) throw error;
  return sb;
}

export async function limparTudo(): Promise<void> {
  const a = admin();
  const vazio = await a.storage.emptyBucket('trabalhos');
  if (vazio.error) throw vazio.error;
  const { error } = await a.from('anos_letivos').delete().not('id', 'is', null);
  if (error) throw error;
}

export async function pdfDeTeste(paginas = 1): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  for (let i = 0; i < paginas; i++) doc.addPage([595.28, 841.89]).drawText(`Pagina ${i + 1}`, { x: 50, y: 750 });
  return doc.save();
}
```

`tests/integration/setup.ts`:

```ts
import { config } from 'dotenv';
import { beforeAll } from 'vitest';

config({ path: '.env.local' });

beforeAll(async () => {
  const { garantirUsuario } = await import('../compartilhado/supabase');
  await garantirUsuario();
});
```

- [ ] **Step 5: Configurar Playwright**

`playwright.config.ts`:

```ts
import { defineConfig, devices } from '@playwright/test';
import { config } from 'dotenv';

config({ path: '.env.local' });

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  globalSetup: './tests/e2e/global-setup.ts',
  use: {
    ...devices['Pixel 7'],
    baseURL: 'http://localhost:3100',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run build && npx next start -p 3100',
    url: 'http://localhost:3100/login',
    reuseExistingServer: !process.env.CI,
    timeout: 240_000,
  },
});
```

`tests/e2e/global-setup.ts`:

```ts
import { config } from 'dotenv';

export default async function globalSetup() {
  config({ path: '.env.local' });
  const { garantirUsuario } = await import('../compartilhado/supabase');
  await garantirUsuario();
}
```

`tests/e2e/ajuda.ts`:

```ts
import { expect, type Page } from '@playwright/test';
import { EMAIL, SENHA } from '../compartilhado/supabase';

export async function entrar(page: Page) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(EMAIL);
  await page.getByLabel('Senha').fill(SENHA);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page).toHaveURL('/');
}
```

- [ ] **Step 6: Escrever o E2E de autenticação (falhando)**

`tests/e2e/auth.spec.ts`:

```ts
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
  await expect(page.getByRole('alert')).toHaveText('Email ou senha incorretos.');
});

test('entra e sai', async ({ page }) => {
  await entrar(page);
  await expect(page.getByRole('heading', { name: 'Início' })).toBeVisible();
  await page.getByRole('button', { name: 'Sair' }).click();
  await expect(page).toHaveURL(/\/login$/);
});
```

Antes de implementar os passos 1–2 este teste falharia. Se você já os fez, rode só para confirmar o comportamento.

- [ ] **Step 7: Rodar o E2E**

Run: `npm run test:e2e -- auth.spec.ts`
Expected: 3 passed.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat(auth): login por email/senha, proteção de rotas e base E2E

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Regras de domínio puras

**Files:**
- Create: `src/lib/tipos.ts`, `src/lib/dominio/busca.ts`, `src/lib/dominio/nomes.ts`, `src/lib/dominio/entregas.ts`, `src/lib/dominio/mover.ts`, `src/lib/dominio/agrupar.ts`
- Test: `src/lib/dominio/busca.test.ts`, `nomes.test.ts`, `entregas.test.ts`, `mover.test.ts`, `agrupar.test.ts`

**Interfaces:**
- Produces:
  - `src/lib/tipos.ts`: `AnoLetivo`, `Turma`, `TurmaDetalhe`, `Aluno`, `AlunoComContagem`, `AlunoDetalhe`, `Atividade`, `AtividadeDetalhe`, `Arquivo`, `ResultadoBusca`, `Escopo` (definições abaixo).
  - `normalizar(s: string): string`
  - `limparNome(nome: string): string`; `parseNomes(texto: string, existentes?: string[]): { novos: string[]; ignorados: number }`
  - `idsEntregues(doBanco: string[], pendentes: { alunoId: string; atividadeId: string | null }[], atividadeId: string): Set<string>`; `calcularEntregas<A extends { id: string }>(alunos: A[], entregues: Set<string>): { entregues: A[]; faltam: A[] }`
  - `atividadeAposMover(atividadeId: string | null, turmaDaAtividade: string | null, turmaDestino: string): string | null`
  - `type Grupo = { chave: string; titulo: string; arquivos: Arquivo[] }`; `agruparPorAtividade(arquivos: Arquivo[], atividades: Atividade[]): Grupo[]`

- [ ] **Step 1: Tipos**

`src/lib/tipos.ts`:

```ts
export type AnoLetivo = { id: string; ano: number; arquivado: boolean };
export type Turma = { id: string; ano_letivo_id: string; nome: string };
export type TurmaDetalhe = Turma & { anos_letivos: { ano: number } };
export type Aluno = { id: string; turma_id: string; nome: string };
export type AlunoComContagem = Aluno & { total_arquivos: number };
export type AlunoDetalhe = Aluno & {
  turmas: { id: string; nome: string; ano_letivo_id: string; anos_letivos: { ano: number } };
};
export type Atividade = { id: string; turma_id: string; nome: string; data: string | null };
export type AtividadeDetalhe = Atividade & { turmas: { id: string; nome: string } };
export type Arquivo = {
  id: string;
  aluno_id: string;
  atividade_id: string | null;
  titulo: string;
  storage_path: string;
  paginas: number;
  tamanho_bytes: number;
  tem_miniatura: boolean;
  criado_em: string;
};
export type ResultadoBusca = { id: string; nome: string; turma: { id: string; nome: string }; ano: number };
export type Escopo = { tipo: 'arquivo' | 'aluno' | 'turma' | 'ano'; id: string };
```

- [ ] **Step 2: Escrever os testes (falhando)**

`src/lib/dominio/busca.test.ts`:

```ts
import { expect, it } from 'vitest';
import { normalizar } from './busca';

it('remove acentos, baixa caixa e junta espaços', () => {
  expect(normalizar('  JOÃO   Conceição ')).toBe('joao conceicao');
});
```

`src/lib/dominio/nomes.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { limparNome, parseNomes } from './nomes';

describe('limparNome', () => {
  it('apara e junta espaços internos', () => {
    expect(limparNome('  Maria   Souza ')).toBe('Maria Souza');
  });
});

describe('parseNomes', () => {
  it('ignora linhas vazias e conta repetidos', () => {
    expect(parseNomes('Maria Souza\n\n  João Pedro \nmaria souza\r\nAna')).toEqual({
      novos: ['Maria Souza', 'João Pedro', 'Ana'],
      ignorados: 1,
    });
  });

  it('ignora quem já está na turma, sem diferenciar acento', () => {
    expect(parseNomes('Joao Pedro\nBia', ['João Pedro'])).toEqual({ novos: ['Bia'], ignorados: 1 });
  });

  it('texto vazio não gera nada', () => {
    expect(parseNomes('  \n \n')).toEqual({ novos: [], ignorados: 0 });
  });
});
```

`src/lib/dominio/entregas.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { calcularEntregas, idsEntregues } from './entregas';

describe('idsEntregues', () => {
  it('soma o banco com os pendentes da mesma atividade', () => {
    const pendentes = [
      { alunoId: 'b', atividadeId: 'at1' },
      { alunoId: 'c', atividadeId: 'outra' },
      { alunoId: 'd', atividadeId: null },
    ];
    expect([...idsEntregues(['a'], pendentes, 'at1')].sort()).toEqual(['a', 'b']);
  });
});

describe('calcularEntregas', () => {
  it('separa quem entregou de quem falta, mantendo a ordem', () => {
    const alunos = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
    expect(calcularEntregas(alunos, new Set(['b']))).toEqual({
      entregues: [{ id: 'b' }],
      faltam: [{ id: 'a' }, { id: 'c' }],
    });
  });
});
```

`src/lib/dominio/mover.test.ts`:

```ts
import { expect, it } from 'vitest';
import { atividadeAposMover } from './mover';

it('mantém a atividade se o destino é da mesma turma', () => {
  expect(atividadeAposMover('at1', 'turmaA', 'turmaA')).toBe('at1');
});

it('remove a atividade se o destino é de outra turma', () => {
  expect(atividadeAposMover('at1', 'turmaA', 'turmaB')).toBeNull();
});

it('sem atividade continua sem atividade', () => {
  expect(atividadeAposMover(null, null, 'turmaB')).toBeNull();
});
```

`src/lib/dominio/agrupar.test.ts`:

```ts
import { expect, it } from 'vitest';
import type { Arquivo, Atividade } from '../tipos';
import { agruparPorAtividade } from './agrupar';

const arq = (id: string, atividade_id: string | null): Arquivo => ({
  id, aluno_id: 'al', atividade_id, titulo: id, storage_path: `al/${id}.pdf`,
  paginas: 1, tamanho_bytes: 1, tem_miniatura: false, criado_em: '2026-10-14T00:00:00Z',
});
const atividades: Atividade[] = [
  { id: 'p2', turma_id: 't', nome: 'Prova 2', data: null },
  { id: 'p1', turma_id: 't', nome: 'Prova 1', data: null },
  { id: 'vazia', turma_id: 't', nome: 'Sem arquivos', data: null },
];

it('agrupa na ordem das atividades, omite vazias e põe o resto em Outros', () => {
  const grupos = agruparPorAtividade([arq('x', 'p1'), arq('y', null), arq('z', 'p2'), arq('w', 'apagada')], atividades);
  expect(grupos.map((g) => [g.titulo, g.arquivos.map((a) => a.id)])).toEqual([
    ['Prova 2', ['z']],
    ['Prova 1', ['x']],
    ['Outros', ['y', 'w']],
  ]);
});
```

- [ ] **Step 3: Rodar e ver falhar**

Run: `npm test`
Expected: FAIL nos 5 arquivos novos (imports não resolvidos).

- [ ] **Step 4: Implementar**

`src/lib/dominio/busca.ts`:

```ts
export function normalizar(s: string): string {
  return s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim().replace(/\s+/g, ' ');
}
```

`src/lib/dominio/nomes.ts`:

```ts
import { normalizar } from './busca';

export function limparNome(nome: string): string {
  return nome.trim().replace(/\s+/g, ' ');
}

export function parseNomes(texto: string, existentes: string[] = []): { novos: string[]; ignorados: number } {
  const vistos = new Set(existentes.map(normalizar));
  const novos: string[] = [];
  let ignorados = 0;
  for (const linha of texto.split(/\r?\n/)) {
    const nome = limparNome(linha);
    if (!nome) continue;
    const chave = normalizar(nome);
    if (vistos.has(chave)) {
      ignorados++;
      continue;
    }
    vistos.add(chave);
    novos.push(nome);
  }
  return { novos, ignorados };
}
```

`src/lib/dominio/entregas.ts`:

```ts
export function idsEntregues(
  doBanco: string[],
  pendentes: { alunoId: string; atividadeId: string | null }[],
  atividadeId: string,
): Set<string> {
  const ids = new Set(doBanco);
  for (const p of pendentes) if (p.atividadeId === atividadeId) ids.add(p.alunoId);
  return ids;
}

export function calcularEntregas<A extends { id: string }>(alunos: A[], entregues: Set<string>) {
  return {
    entregues: alunos.filter((a) => entregues.has(a.id)),
    faltam: alunos.filter((a) => !entregues.has(a.id)),
  };
}
```

`src/lib/dominio/mover.ts`:

```ts
export function atividadeAposMover(
  atividadeId: string | null,
  turmaDaAtividade: string | null,
  turmaDestino: string,
): string | null {
  return atividadeId && turmaDaAtividade === turmaDestino ? atividadeId : null;
}
```

`src/lib/dominio/agrupar.ts`:

```ts
import type { Arquivo, Atividade } from '../tipos';

export type Grupo = { chave: string; titulo: string; arquivos: Arquivo[] };

export function agruparPorAtividade(arquivos: Arquivo[], atividades: Atividade[]): Grupo[] {
  const grupos: Grupo[] = atividades
    .map((a) => ({ chave: a.id, titulo: a.nome, arquivos: arquivos.filter((f) => f.atividade_id === a.id) }))
    .filter((g) => g.arquivos.length > 0);
  const ids = new Set(atividades.map((a) => a.id));
  const outros = arquivos.filter((f) => !f.atividade_id || !ids.has(f.atividade_id));
  if (outros.length) grupos.push({ chave: 'outros', titulo: 'Outros', arquivos: outros });
  return grupos;
}
```

- [ ] **Step 5: Rodar e ver passar**

Run: `npm test`
Expected: todos PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib
git commit -m "feat(dominio): busca normalizada, parser de nomes, entregas, mover e agrupar

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Camada de dados (Supabase)

**Files:**
- Create: `src/lib/dados/consulta.ts`, `src/lib/dados/storage.ts`, `src/lib/dados/anos.ts`, `src/lib/dados/turmas.ts`, `src/lib/dados/alunos.ts`, `src/lib/dados/atividades.ts`, `src/lib/dados/arquivos.ts`, `src/lib/dados/apagar.ts`
- Modify: `tests/compartilhado/supabase.ts` (adiciona `semear`, `criarArquivo`, `contarArquivosDe`)
- Test: `src/lib/dados/storage.test.ts`, `tests/integration/dados.test.ts`

**Interfaces:**
- Consumes: tipos de `src/lib/tipos.ts`; `normalizar`, `atividadeAposMover` (Task 4).
- Produces (todas recebem `sb: SupabaseClient` como 1º argumento):
  - `consulta.ts`: `checar<T>(r, mensagens?: Record<string,string>): T`; `buscarTodos<T>(consulta: (de: number, ate: number) => PromiseLike<Resposta<T[]>>, lote?: number): Promise<T[]>`
  - `storage.ts`: `BUCKET = 'trabalhos'`; `caminhoPdf(alunoId, arquivoId): string`; `caminhoMiniatura(caminhoDoPdf): string`; `caminhosDoArquivo(a: { storage_path: string; tem_miniatura: boolean }): string[]`; `removerObjetos(sb, caminhos: string[]): Promise<void>`
  - `anos.ts`: `listarAnos(sb): Promise<AnoLetivo[]>`; `obterAno(sb, id): Promise<AnoLetivo>`; `criarAno(sb, ano: number): Promise<AnoLetivo>`; `definirArquivado(sb, id, arquivado: boolean): Promise<void>`
  - `turmas.ts`: `listarTurmas(sb, anoId): Promise<Turma[]>`; `obterTurma(sb, id): Promise<TurmaDetalhe>`; `criarTurma(sb, anoId, nome): Promise<Turma>`; `renomearTurma(sb, id, nome): Promise<void>`
  - `alunos.ts`: `listarAlunos(sb, turmaId): Promise<AlunoComContagem[]>`; `obterAluno(sb, id): Promise<AlunoDetalhe>`; `criarAlunos(sb, turmaId, nomes: string[]): Promise<Aluno[]>`; `renomearAluno(sb, id, nome): Promise<void>`; `buscarAlunos(sb, termo): Promise<ResultadoBusca[]>`
  - `atividades.ts`: `listarAtividades(sb, turmaId): Promise<Atividade[]>`; `obterAtividade(sb, id): Promise<AtividadeDetalhe>`; `criarAtividade(sb, turmaId, nome, data: string | null): Promise<Atividade>`; `renomearAtividade(sb, id, nome): Promise<void>`; `apagarAtividade(sb, id): Promise<void>`; `alunosComEntrega(sb, atividadeId): Promise<string[]>`; `entregasDaTurma(sb, turmaId): Promise<Record<string, string[]>>`
  - `arquivos.ts`: `listarArquivosDoAluno(sb, alunoId): Promise<Arquivo[]>`; `renomearArquivo(sb, id, titulo): Promise<void>`; `moverArquivo(sb, arquivo: Arquivo, destino: Pick<Aluno, 'id' | 'turma_id'>): Promise<void>`; `usoStorage(sb): Promise<number>`
  - `apagar.ts`: `contarArquivos(sb, e: Escopo): Promise<number>`; `apagar(sb, e: Escopo): Promise<void>`
  - Helpers de teste: `semear(sb): Promise<Semente>` com `Semente = { anoId; turmaId; atividadeId; alunos: { maria: string; joao: string } }`; `criarArquivo(sb, alunoId, atividadeId: string | null, titulo: string): Promise<Arquivo>`; `contarArquivosDe(alunoId): Promise<number>`

- [ ] **Step 1: Teste unitário dos caminhos (falhando)**

`src/lib/dados/storage.test.ts`:

```ts
import { expect, it } from 'vitest';
import { caminhoMiniatura, caminhoPdf, caminhosDoArquivo } from './storage';

it('monta caminhos de PDF e miniatura', () => {
  expect(caminhoPdf('al', 'arq')).toBe('al/arq.pdf');
  expect(caminhoMiniatura('al/arq.pdf')).toBe('al/arq.thumb.jpg');
});

it('lista os objetos de um arquivo conforme a miniatura', () => {
  expect(caminhosDoArquivo({ storage_path: 'al/a.pdf', tem_miniatura: true })).toEqual(['al/a.pdf', 'al/a.thumb.jpg']);
  expect(caminhosDoArquivo({ storage_path: 'al/a.pdf', tem_miniatura: false })).toEqual(['al/a.pdf']);
});
```

Run: `npm test -- storage` → Expected: FAIL (import não resolvido).

- [ ] **Step 2: Implementar `consulta.ts` e `storage.ts`**

`src/lib/dados/consulta.ts`:

```ts
export type Resposta<T> = { data: T | null; error: { message: string; code?: string } | null };

export function checar<T>(r: Resposta<T>, mensagens: Record<string, string> = {}): T {
  if (r.error) throw new Error((r.error.code && mensagens[r.error.code]) || r.error.message);
  return r.data as T;
}

/** Busca todas as linhas, página por página (o PostgREST limita a 1000 por resposta). */
export async function buscarTodos<T>(
  consulta: (de: number, ate: number) => PromiseLike<Resposta<T[]>>,
  lote = 1000,
): Promise<T[]> {
  const todos: T[] = [];
  for (let de = 0; ; de += lote) {
    const pagina = checar(await consulta(de, de + lote - 1)) ?? [];
    todos.push(...pagina);
    if (pagina.length < lote) return todos;
  }
}
```

`src/lib/dados/storage.ts`:

```ts
import type { SupabaseClient } from '@supabase/supabase-js';

export const BUCKET = 'trabalhos';

export const caminhoPdf = (alunoId: string, arquivoId: string) => `${alunoId}/${arquivoId}.pdf`;
export const caminhoMiniatura = (caminhoDoPdf: string) => caminhoDoPdf.replace(/\.pdf$/, '.thumb.jpg');

export function caminhosDoArquivo(a: { storage_path: string; tem_miniatura: boolean }): string[] {
  return a.tem_miniatura ? [a.storage_path, caminhoMiniatura(a.storage_path)] : [a.storage_path];
}

export async function removerObjetos(sb: SupabaseClient, caminhos: string[]): Promise<void> {
  for (let i = 0; i < caminhos.length; i += 100) {
    const { error } = await sb.storage.from(BUCKET).remove(caminhos.slice(i, i + 100));
    if (error) throw new Error(error.message);
  }
}
```

Run: `npm test -- storage` → Expected: PASS.

- [ ] **Step 3: Helpers de semente para os testes**

Acrescente a `tests/compartilhado/supabase.ts`:

```ts
import { BUCKET, caminhoPdf } from '../../src/lib/dados/storage';
import type { Arquivo } from '../../src/lib/tipos';

export type Semente = {
  anoId: string;
  turmaId: string;
  atividadeId: string;
  alunos: { maria: string; joao: string };
};

async function inserir<T>(sb: SupabaseClient, tabela: string, valores: object): Promise<T> {
  const { data, error } = await sb.from(tabela).insert(valores).select('*').single();
  if (error) throw error;
  return data as T;
}

/** Ano 2026 → turma "3º A" → alunos "Maria Souza" e "João Pedro" + atividade "Prova 1". */
export async function semear(sb: SupabaseClient): Promise<Semente> {
  const ano = await inserir<{ id: string }>(sb, 'anos_letivos', { ano: 2026 });
  const turma = await inserir<{ id: string }>(sb, 'turmas', { ano_letivo_id: ano.id, nome: '3º A' });
  const maria = await inserir<{ id: string }>(sb, 'alunos', { turma_id: turma.id, nome: 'Maria Souza' });
  const joao = await inserir<{ id: string }>(sb, 'alunos', { turma_id: turma.id, nome: 'João Pedro' });
  const atividade = await inserir<{ id: string }>(sb, 'atividades', { turma_id: turma.id, nome: 'Prova 1' });
  return { anoId: ano.id, turmaId: turma.id, atividadeId: atividade.id, alunos: { maria: maria.id, joao: joao.id } };
}

export async function criarArquivo(
  sb: SupabaseClient,
  alunoId: string,
  atividadeId: string | null,
  titulo: string,
): Promise<Arquivo> {
  const id = crypto.randomUUID();
  const caminho = caminhoPdf(alunoId, id);
  const bytes = await pdfDeTeste();
  const up = await sb.storage.from(BUCKET).upload(caminho, bytes, { contentType: 'application/pdf' });
  if (up.error) throw up.error;
  return inserir<Arquivo>(sb, 'arquivos', {
    id, aluno_id: alunoId, atividade_id: atividadeId, titulo,
    storage_path: caminho, paginas: 1, tamanho_bytes: bytes.byteLength,
  });
}

export async function contarArquivosDe(alunoId: string): Promise<number> {
  const sb = await clienteLogado();
  const { count, error } = await sb.from('arquivos').select('id', { count: 'exact', head: true }).eq('aluno_id', alunoId);
  if (error) throw error;
  return count ?? 0;
}
```

(Junte o `import` de `SupabaseClient` ao import já existente de `@supabase/supabase-js` no topo do arquivo.)

- [ ] **Step 4: Escrever o teste de integração (falhando)**

`tests/integration/dados.test.ts`:

```ts
import type { SupabaseClient } from '@supabase/supabase-js';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { apagar, contarArquivos } from '@/lib/dados/apagar';
import { criarAno, definirArquivado, listarAnos } from '@/lib/dados/anos';
import { buscarAlunos, criarAlunos, listarAlunos, obterAluno } from '@/lib/dados/alunos';
import { alunosComEntrega, entregasDaTurma } from '@/lib/dados/atividades';
import { listarArquivosDoAluno, moverArquivo, usoStorage } from '@/lib/dados/arquivos';
import { BUCKET } from '@/lib/dados/storage';
import { criarTurma, listarTurmas } from '@/lib/dados/turmas';
import { clienteLogado, criarArquivo, limparTudo, semear } from '../compartilhado/supabase';

let sb: SupabaseClient;
beforeAll(async () => {
  sb = await clienteLogado();
});
beforeEach(async () => {
  await limparTudo();
});

const existe = async (caminho: string) => !(await sb.storage.from(BUCKET).download(caminho)).error;

describe('anos', () => {
  it('lista do mais recente para o mais antigo e arquiva', async () => {
    const a25 = await criarAno(sb, 2025);
    await criarAno(sb, 2026);
    await definirArquivado(sb, a25.id, true);
    expect((await listarAnos(sb)).map((a) => [a.ano, a.arquivado])).toEqual([[2026, false], [2025, true]]);
  });

  it('recusa ano repetido com mensagem clara', async () => {
    await criarAno(sb, 2026);
    await expect(criarAno(sb, 2026)).rejects.toThrow('Esse ano já existe.');
  });
});

describe('alunos', () => {
  it('busca ignora acento e maiúscula', async () => {
    const s = await semear(sb);
    expect(await buscarAlunos(sb, 'JOAO')).toEqual([
      { id: s.alunos.joao, nome: 'João Pedro', turma: { id: s.turmaId, nome: '3º A' }, ano: 2026 },
    ]);
  });

  it('busca com % e _ não quebra nem casa tudo', async () => {
    await semear(sb);
    expect(await buscarAlunos(sb, '%_')).toEqual([]);
  });

  it('lista com contagem de arquivos e detalhe com turma e ano', async () => {
    const s = await semear(sb);
    await criarArquivo(sb, s.alunos.maria, null, 'Livre');
    const lista = await listarAlunos(sb, s.turmaId);
    expect(lista.map((a) => [a.nome, a.total_arquivos])).toEqual([['João Pedro', 0], ['Maria Souza', 1]]);
    const det = await obterAluno(sb, s.alunos.maria);
    expect(det.turmas).toMatchObject({ id: s.turmaId, nome: '3º A', anos_letivos: { ano: 2026 } });
  });

  it('cria vários alunos de uma vez', async () => {
    const s = await semear(sb);
    const novos = await criarAlunos(sb, s.turmaId, ['Ana', 'Bia']);
    expect(novos.map((a) => a.nome)).toEqual(['Ana', 'Bia']);
    expect(await criarAlunos(sb, s.turmaId, [])).toEqual([]);
  });
});

describe('entregas', () => {
  it('agrupa por atividade sem repetir aluno', async () => {
    const s = await semear(sb);
    await criarArquivo(sb, s.alunos.maria, s.atividadeId, 'Prova 1');
    await criarArquivo(sb, s.alunos.maria, s.atividadeId, 'Prova 1 (refeita)');
    await criarArquivo(sb, s.alunos.joao, null, 'Livre');
    expect(await entregasDaTurma(sb, s.turmaId)).toEqual({ [s.atividadeId]: [s.alunos.maria] });
    expect(await alunosComEntrega(sb, s.atividadeId)).toEqual([s.alunos.maria]);
  });
});

describe('mover', () => {
  it('para aluno de outra turma: muda caminho e tira a atividade', async () => {
    const s = await semear(sb);
    const turmaB = await criarTurma(sb, s.anoId, '3º B');
    const [ana] = await criarAlunos(sb, turmaB.id, ['Ana']);
    const arq = await criarArquivo(sb, s.alunos.maria, s.atividadeId, 'Prova 1');
    await moverArquivo(sb, arq, ana);
    const [movido] = await listarArquivosDoAluno(sb, ana.id);
    expect(movido).toMatchObject({ id: arq.id, atividade_id: null, titulo: 'Prova 1', storage_path: `${ana.id}/${arq.id}.pdf` });
    expect(await existe(movido.storage_path)).toBe(true);
    expect(await existe(arq.storage_path)).toBe(false);
  });

  it('na mesma turma mantém a atividade', async () => {
    const s = await semear(sb);
    const arq = await criarArquivo(sb, s.alunos.maria, s.atividadeId, 'Prova 1');
    await moverArquivo(sb, arq, { id: s.alunos.joao, turma_id: s.turmaId });
    const [movido] = await listarArquivosDoAluno(sb, s.alunos.joao);
    expect(movido.atividade_id).toBe(s.atividadeId);
  });
});

describe('apagar', () => {
  it('turma: conta, remove do storage e apaga as linhas', async () => {
    const s = await semear(sb);
    const a1 = await criarArquivo(sb, s.alunos.maria, s.atividadeId, 'P1');
    const a2 = await criarArquivo(sb, s.alunos.joao, null, 'Livre');
    expect(await contarArquivos(sb, { tipo: 'turma', id: s.turmaId })).toBe(2);
    await apagar(sb, { tipo: 'turma', id: s.turmaId });
    expect(await listarTurmas(sb, s.anoId)).toEqual([]);
    expect(await existe(a1.storage_path)).toBe(false);
    expect(await existe(a2.storage_path)).toBe(false);
  });

  it('ano inteiro', async () => {
    const s = await semear(sb);
    await criarArquivo(sb, s.alunos.maria, null, 'X');
    expect(await contarArquivos(sb, { tipo: 'ano', id: s.anoId })).toBe(1);
    await apagar(sb, { tipo: 'ano', id: s.anoId });
    expect(await listarAnos(sb)).toEqual([]);
  });

  it('turma sem arquivos', async () => {
    const s = await semear(sb);
    expect(await contarArquivos(sb, { tipo: 'turma', id: s.turmaId })).toBe(0);
    await apagar(sb, { tipo: 'turma', id: s.turmaId });
    expect(await listarTurmas(sb, s.anoId)).toEqual([]);
  });

  it('um arquivo', async () => {
    const s = await semear(sb);
    const a = await criarArquivo(sb, s.alunos.maria, null, 'X');
    await apagar(sb, { tipo: 'arquivo', id: a.id });
    expect(await listarArquivosDoAluno(sb, s.alunos.maria)).toEqual([]);
    expect(await existe(a.storage_path)).toBe(false);
  });
});

describe('uso', () => {
  it('soma o tamanho dos arquivos', async () => {
    const s = await semear(sb);
    const a = await criarArquivo(sb, s.alunos.maria, null, 'X');
    expect(await usoStorage(sb)).toBe(a.tamanho_bytes);
  });
});
```

Run: `npm run test:int`
Expected: FAIL (módulos `@/lib/dados/*` inexistentes).

- [ ] **Step 5: Implementar anos, turmas, alunos e atividades**

`src/lib/dados/anos.ts`:

```ts
import type { SupabaseClient } from '@supabase/supabase-js';
import type { AnoLetivo } from '../tipos';
import { checar } from './consulta';

const CAMPOS = 'id,ano,arquivado';

export async function listarAnos(sb: SupabaseClient): Promise<AnoLetivo[]> {
  return checar(await sb.from('anos_letivos').select(CAMPOS).order('ano', { ascending: false }));
}

export async function obterAno(sb: SupabaseClient, id: string): Promise<AnoLetivo> {
  return checar(await sb.from('anos_letivos').select(CAMPOS).eq('id', id).single());
}

export async function criarAno(sb: SupabaseClient, ano: number): Promise<AnoLetivo> {
  return checar(await sb.from('anos_letivos').insert({ ano }).select(CAMPOS).single(), {
    '23505': 'Esse ano já existe.',
    '23514': 'Ano inválido.',
  });
}

export async function definirArquivado(sb: SupabaseClient, id: string, arquivado: boolean): Promise<void> {
  checar(await sb.from('anos_letivos').update({ arquivado }).eq('id', id));
}
```

`src/lib/dados/turmas.ts`:

```ts
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Turma, TurmaDetalhe } from '../tipos';
import { checar } from './consulta';

const CAMPOS = 'id,ano_letivo_id,nome';

export async function listarTurmas(sb: SupabaseClient, anoId: string): Promise<Turma[]> {
  return checar(await sb.from('turmas').select(CAMPOS).eq('ano_letivo_id', anoId).order('nome'));
}

export async function obterTurma(sb: SupabaseClient, id: string): Promise<TurmaDetalhe> {
  return checar(await sb.from('turmas').select(`${CAMPOS},anos_letivos(ano)`).eq('id', id).single());
}

export async function criarTurma(sb: SupabaseClient, anoId: string, nome: string): Promise<Turma> {
  return checar(await sb.from('turmas').insert({ ano_letivo_id: anoId, nome }).select(CAMPOS).single());
}

export async function renomearTurma(sb: SupabaseClient, id: string, nome: string): Promise<void> {
  checar(await sb.from('turmas').update({ nome }).eq('id', id));
}
```

`src/lib/dados/alunos.ts`:

```ts
import type { SupabaseClient } from '@supabase/supabase-js';
import { normalizar } from '../dominio/busca';
import type { Aluno, AlunoComContagem, AlunoDetalhe, ResultadoBusca } from '../tipos';
import { checar } from './consulta';

const CAMPOS = 'id,turma_id,nome';

export async function listarAlunos(sb: SupabaseClient, turmaId: string): Promise<AlunoComContagem[]> {
  const linhas = checar<(Aluno & { arquivos: { count: number }[] })[]>(
    await sb.from('alunos').select(`${CAMPOS},arquivos(count)`).eq('turma_id', turmaId).order('nome'),
  );
  return linhas.map(({ arquivos, ...a }) => ({ ...a, total_arquivos: arquivos[0]?.count ?? 0 }));
}

export async function obterAluno(sb: SupabaseClient, id: string): Promise<AlunoDetalhe> {
  return checar(
    await sb.from('alunos').select(`${CAMPOS},turmas(id,nome,ano_letivo_id,anos_letivos(ano))`).eq('id', id).single(),
  );
}

export async function criarAlunos(sb: SupabaseClient, turmaId: string, nomes: string[]): Promise<Aluno[]> {
  if (!nomes.length) return [];
  return checar(
    await sb.from('alunos').insert(nomes.map((nome) => ({ turma_id: turmaId, nome }))).select(CAMPOS),
  );
}

export async function renomearAluno(sb: SupabaseClient, id: string, nome: string): Promise<void> {
  checar(await sb.from('alunos').update({ nome }).eq('id', id));
}

export async function buscarAlunos(sb: SupabaseClient, termo: string): Promise<ResultadoBusca[]> {
  const t = normalizar(termo);
  if (t.length < 2) return [];
  const padrao = `%${t.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
  const linhas = checar<
    { id: string; nome: string; turmas: { id: string; nome: string; anos_letivos: { ano: number } } }[]
  >(
    await sb
      .from('alunos')
      .select('id,nome,turmas(id,nome,anos_letivos(ano))')
      .ilike('nome_busca', padrao)
      .order('nome')
      .limit(30),
  );
  return linhas.map((l) => ({
    id: l.id,
    nome: l.nome,
    turma: { id: l.turmas.id, nome: l.turmas.nome },
    ano: l.turmas.anos_letivos.ano,
  }));
}
```

`src/lib/dados/atividades.ts`:

```ts
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Atividade, AtividadeDetalhe } from '../tipos';
import { buscarTodos, checar } from './consulta';

const CAMPOS = 'id,turma_id,nome,data';

export async function listarAtividades(sb: SupabaseClient, turmaId: string): Promise<Atividade[]> {
  return checar(
    await sb
      .from('atividades')
      .select(CAMPOS)
      .eq('turma_id', turmaId)
      .order('data', { ascending: false, nullsFirst: false })
      .order('criado_em', { ascending: false }),
  );
}

export async function obterAtividade(sb: SupabaseClient, id: string): Promise<AtividadeDetalhe> {
  return checar(await sb.from('atividades').select(`${CAMPOS},turmas(id,nome)`).eq('id', id).single());
}

export async function criarAtividade(
  sb: SupabaseClient,
  turmaId: string,
  nome: string,
  data: string | null,
): Promise<Atividade> {
  return checar(await sb.from('atividades').insert({ turma_id: turmaId, nome, data }).select(CAMPOS).single());
}

export async function renomearAtividade(sb: SupabaseClient, id: string, nome: string): Promise<void> {
  checar(await sb.from('atividades').update({ nome }).eq('id', id));
}

/** Os arquivos continuam com o aluno (atividade_id vira nulo, título é mantido). */
export async function apagarAtividade(sb: SupabaseClient, id: string): Promise<void> {
  checar(await sb.from('atividades').delete().eq('id', id));
}

export async function alunosComEntrega(sb: SupabaseClient, atividadeId: string): Promise<string[]> {
  const linhas = await buscarTodos<{ aluno_id: string }>((de, ate) =>
    sb.from('arquivos').select('aluno_id').eq('atividade_id', atividadeId).order('id').range(de, ate),
  );
  return [...new Set(linhas.map((l) => l.aluno_id))];
}

export async function entregasDaTurma(sb: SupabaseClient, turmaId: string): Promise<Record<string, string[]>> {
  const linhas = await buscarTodos<{ atividade_id: string; aluno_id: string }>((de, ate) =>
    sb
      .from('arquivos')
      .select('atividade_id,aluno_id,atividades!inner(turma_id)')
      .eq('atividades.turma_id', turmaId)
      .order('id')
      .range(de, ate),
  );
  const mapa: Record<string, string[]> = {};
  for (const l of linhas) {
    const lista = (mapa[l.atividade_id] ??= []);
    if (!lista.includes(l.aluno_id)) lista.push(l.aluno_id);
  }
  return mapa;
}
```

- [ ] **Step 6: Implementar arquivos e apagar**

`src/lib/dados/arquivos.ts`:

```ts
import type { SupabaseClient } from '@supabase/supabase-js';
import { atividadeAposMover } from '../dominio/mover';
import type { Aluno, Arquivo } from '../tipos';
import { checar } from './consulta';
import { BUCKET, caminhoMiniatura, caminhoPdf } from './storage';

const CAMPOS = 'id,aluno_id,atividade_id,titulo,storage_path,paginas,tamanho_bytes,tem_miniatura,criado_em';

export async function listarArquivosDoAluno(sb: SupabaseClient, alunoId: string): Promise<Arquivo[]> {
  return checar(
    await sb.from('arquivos').select(CAMPOS).eq('aluno_id', alunoId).order('criado_em', { ascending: false }),
  );
}

export async function renomearArquivo(sb: SupabaseClient, id: string, titulo: string): Promise<void> {
  checar(await sb.from('arquivos').update({ titulo }).eq('id', id));
}

export async function usoStorage(sb: SupabaseClient): Promise<number> {
  return Number(checar(await sb.rpc('uso_storage')) ?? 0);
}

export async function moverArquivo(
  sb: SupabaseClient,
  arquivo: Arquivo,
  destino: Pick<Aluno, 'id' | 'turma_id'>,
): Promise<void> {
  if (destino.id === arquivo.aluno_id) return;

  let turmaDaAtividade: string | null = null;
  if (arquivo.atividade_id) {
    const at = checar<{ turma_id: string }>(
      await sb.from('atividades').select('turma_id').eq('id', arquivo.atividade_id).single(),
    );
    turmaDaAtividade = at.turma_id;
  }

  const novoPdf = caminhoPdf(destino.id, arquivo.id);
  const pares: [string, string][] = [[arquivo.storage_path, novoPdf]];
  if (arquivo.tem_miniatura) pares.push([caminhoMiniatura(arquivo.storage_path), caminhoMiniatura(novoPdf)]);

  const bucket = sb.storage.from(BUCKET);
  const movidos: [string, string][] = [];
  const desfazer = async () => {
    for (const [de, para] of movidos) await bucket.move(para, de);
  };

  for (const [de, para] of pares) {
    const { error } = await bucket.move(de, para);
    if (error) {
      await desfazer();
      throw new Error(error.message);
    }
    movidos.push([de, para]);
  }

  const { error } = await sb
    .from('arquivos')
    .update({
      aluno_id: destino.id,
      storage_path: novoPdf,
      atividade_id: atividadeAposMover(arquivo.atividade_id, turmaDaAtividade, destino.turma_id),
    })
    .eq('id', arquivo.id);
  if (error) {
    await desfazer();
    throw new Error(error.message);
  }
}
```

`src/lib/dados/apagar.ts`:

```ts
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Escopo } from '../tipos';
import { buscarTodos, checar } from './consulta';
import { caminhosDoArquivo, removerObjetos } from './storage';

const TABELA = { arquivo: 'arquivos', aluno: 'alunos', turma: 'turmas', ano: 'anos_letivos' } as const;

type Linha = { storage_path: string; tem_miniatura: boolean };

function arquivosDoEscopo(sb: SupabaseClient, e: Escopo): Promise<Linha[]> {
  return buscarTodos<Linha>((de, ate) => {
    switch (e.tipo) {
      case 'arquivo':
        return sb.from('arquivos').select('storage_path,tem_miniatura').eq('id', e.id).order('id').range(de, ate);
      case 'aluno':
        return sb.from('arquivos').select('storage_path,tem_miniatura').eq('aluno_id', e.id).order('id').range(de, ate);
      case 'turma':
        return sb
          .from('arquivos')
          .select('storage_path,tem_miniatura,alunos!inner(turma_id)')
          .eq('alunos.turma_id', e.id)
          .order('id')
          .range(de, ate);
      case 'ano':
        return sb
          .from('arquivos')
          .select('storage_path,tem_miniatura,alunos!inner(turmas!inner(ano_letivo_id))')
          .eq('alunos.turmas.ano_letivo_id', e.id)
          .order('id')
          .range(de, ate);
    }
  });
}

export async function contarArquivos(sb: SupabaseClient, e: Escopo): Promise<number> {
  return (await arquivosDoEscopo(sb, e)).length;
}

/** Remove os objetos do Storage e depois a linha (o banco apaga os filhos em cascata). */
export async function apagar(sb: SupabaseClient, e: Escopo): Promise<void> {
  const linhas = await arquivosDoEscopo(sb, e);
  await removerObjetos(sb, linhas.flatMap(caminhosDoArquivo));
  checar(await sb.from(TABELA[e.tipo]).delete().eq('id', e.id));
}
```

- [ ] **Step 7: Rodar e ver passar**

Run: `npm run test:int && npm test`
Expected: todos PASS.

- [ ] **Step 8: Commit**

```bash
git add src/lib/dados tests
git commit -m "feat(dados): CRUD, busca, entregas, mover e apagar com limpeza do storage

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Telas de organização — Início, Ano e Turma

**Files:**
- Create: `src/components/ui/Confirmar.tsx`, `src/components/ui/FormNome.tsx`, `src/components/ui/Renomear.tsx`, `src/components/ui/BotaoApagar.tsx`, `src/components/ui/BuscarAluno.tsx`, `src/components/inicio/NovoAno.tsx`, `src/components/inicio/UsoStorage.tsx`, `src/components/ano/NovaTurma.tsx`, `src/components/ano/AcoesAno.tsx`, `src/components/turma/AcoesTurma.tsx`, `src/components/turma/AbaAlunos.tsx`, `src/components/turma/AdicionarAlunos.tsx`, `src/components/turma/AbaAtividades.tsx`, `src/app/(app)/anos/[anoId]/page.tsx`, `src/app/(app)/turmas/[turmaId]/page.tsx`, `src/app/(app)/error.tsx`, `tests/e2e/organizacao.spec.ts`
- Modify: `src/app/(app)/page.tsx`

**Interfaces:**
- Consumes: camada de dados (Task 5), `parseNomes`, `limparNome`, `normalizar`, `calcularEntregas`, `formatarBytes`, `usoAlto`, `formatarData`, `LIMITE_STORAGE`, `mensagemErro`, `clienteNavegador`, `clienteServidor`.
- Produces componentes reutilizados depois:
  - `<Confirmar titulo mensagem textoConfirmar ocupado? onConfirmar onCancelar />`
  - `<FormNome rotulo textoBotao placeholder? inicial? onSalvar={(nome: string) => Promise<void>} />`
  - `<Renomear atual rotulo? onSalvar={(novo: string) => Promise<void>} />`
  - `<BotaoApagar escopo: Escopo rotulo descricao depois: string | 'refresh' />`
  - `<BuscarAluno rotulo? onEscolher?: (r: ResultadoBusca) => void excluirId? />`: sem `onEscolher`, mostra links para `/alunos/{id}`.

- [ ] **Step 1: Escrever o E2E (falhando)**

`tests/e2e/organizacao.spec.ts`:

```ts
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
```

Run: `npm run test:e2e -- organizacao.spec.ts`
Expected: FAIL (não existe campo "Ano").

- [ ] **Step 2: Componentes de UI reutilizáveis**

`src/components/ui/Confirmar.tsx`:

```tsx
'use client';

type Props = {
  titulo: string;
  mensagem: string;
  textoConfirmar: string;
  ocupado?: boolean;
  onConfirmar: () => void;
  onCancelar: () => void;
};

export function Confirmar({ titulo, mensagem, textoConfirmar, ocupado, onConfirmar, onCancelar }: Props) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirmar-titulo"
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
    >
      <div className="w-full max-w-sm space-y-4 rounded-lg bg-white p-4 text-gray-900">
        <h2 id="confirmar-titulo" className="font-semibold">{titulo}</h2>
        <p className="text-sm text-gray-700">{mensagem}</p>
        <div className="flex justify-end gap-2">
          <button onClick={onCancelar} className="rounded px-3 py-2">Cancelar</button>
          <button onClick={onConfirmar} disabled={ocupado} className="rounded bg-red-600 px-3 py-2 text-white disabled:opacity-50">
            {textoConfirmar}
          </button>
        </div>
      </div>
    </div>
  );
}
```

`src/components/ui/FormNome.tsx`:

```tsx
'use client';

import { useId, useState, type FormEvent } from 'react';
import { limparNome } from '@/lib/dominio/nomes';
import { mensagemErro } from '@/lib/mensagemErro';

type Props = {
  rotulo: string;
  textoBotao: string;
  placeholder?: string;
  inicial?: string;
  onSalvar: (nome: string) => Promise<void>;
};

export function FormNome({ rotulo, textoBotao, placeholder, inicial = '', onSalvar }: Props) {
  const id = useId();
  const [valor, setValor] = useState(inicial);
  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    const nome = limparNome(valor);
    if (!nome) return;
    setOcupado(true);
    setErro(null);
    try {
      await onSalvar(nome);
      setValor('');
    } catch (err) {
      setErro(mensagemErro(err));
    } finally {
      setOcupado(false);
    }
  }

  return (
    <form onSubmit={enviar} className="flex flex-wrap items-end gap-2">
      <div className="min-w-0 flex-1">
        <label htmlFor={id} className="block text-sm">{rotulo}</label>
        <input id={id} value={valor} onChange={(e) => setValor(e.target.value)} placeholder={placeholder} className="w-full rounded border px-3 py-2" />
      </div>
      <button disabled={ocupado} className="rounded bg-blue-700 px-4 py-2 text-white disabled:opacity-50">{textoBotao}</button>
      {erro && <p role="alert" className="w-full text-sm text-red-600">{erro}</p>}
    </form>
  );
}
```

`src/components/ui/Renomear.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { FormNome } from './FormNome';

type Props = { atual: string; rotulo?: string; onSalvar: (novo: string) => Promise<void> };

export function Renomear({ atual, rotulo = 'Renomear', onSalvar }: Props) {
  const [editando, setEditando] = useState(false);
  if (!editando) {
    return <button onClick={() => setEditando(true)} className="text-sm text-blue-700">{rotulo}</button>;
  }
  return (
    <div className="w-full">
      <FormNome
        rotulo="Novo nome"
        textoBotao="Salvar"
        inicial={atual}
        onSalvar={async (novo) => {
          await onSalvar(novo);
          setEditando(false);
        }}
      />
      <button onClick={() => setEditando(false)} className="mt-1 text-sm text-gray-600">Cancelar</button>
    </div>
  );
}
```

`src/components/ui/BotaoApagar.tsx`:

```tsx
'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { apagar, contarArquivos } from '@/lib/dados/apagar';
import { mensagemErro } from '@/lib/mensagemErro';
import { clienteNavegador } from '@/lib/supabase/navegador';
import type { Escopo } from '@/lib/tipos';
import { Confirmar } from './Confirmar';

type Props = { escopo: Escopo; rotulo: string; descricao: string; depois: string | 'refresh' };

export function BotaoApagar({ escopo, rotulo, descricao, depois }: Props) {
  const router = useRouter();
  const [quantidade, setQuantidade] = useState<number | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function abrir() {
    setErro(null);
    try {
      setQuantidade(await contarArquivos(clienteNavegador(), escopo));
    } catch (e) {
      setErro(mensagemErro(e));
    }
  }

  async function confirmar() {
    setOcupado(true);
    try {
      await apagar(clienteNavegador(), escopo);
      setQuantidade(null);
      if (depois !== 'refresh') router.push(depois);
      router.refresh();
    } catch (e) {
      setErro(mensagemErro(e));
    } finally {
      setOcupado(false);
    }
  }

  const mensagem =
    escopo.tipo === 'arquivo'
      ? 'O arquivo será apagado definitivamente.'
      : `Isso vai apagar ${quantidade} arquivo(s). Não dá para desfazer.`;

  return (
    <>
      <button onClick={abrir} className="text-sm text-red-600">{rotulo}</button>
      {erro && <p role="alert" className="text-sm text-red-600">{erro}</p>}
      {quantidade !== null && (
        <Confirmar
          titulo={`Apagar ${descricao}?`}
          mensagem={mensagem}
          textoConfirmar="Apagar"
          ocupado={ocupado}
          onConfirmar={confirmar}
          onCancelar={() => setQuantidade(null)}
        />
      )}
    </>
  );
}
```

`src/components/ui/BuscarAluno.tsx`:

```tsx
'use client';

import Link from 'next/link';
import { useEffect, useId, useState } from 'react';
import { buscarAlunos } from '@/lib/dados/alunos';
import { normalizar } from '@/lib/dominio/busca';
import { clienteNavegador } from '@/lib/supabase/navegador';
import type { ResultadoBusca } from '@/lib/tipos';

type Props = { rotulo?: string; onEscolher?: (r: ResultadoBusca) => void; excluirId?: string };

const rotuloDe = (r: ResultadoBusca) => `${r.nome} — ${r.turma.nome} (${r.ano})`;

export function BuscarAluno({ rotulo = 'Buscar aluno', onEscolher, excluirId }: Props) {
  const id = useId();
  const [termo, setTermo] = useState('');
  const [resultados, setResultados] = useState<ResultadoBusca[]>([]);
  const ativo = normalizar(termo).length >= 2;

  useEffect(() => {
    if (!ativo) return;
    let vivo = true;
    const t = setTimeout(async () => {
      try {
        const r = await buscarAlunos(clienteNavegador(), termo);
        if (vivo) setResultados(r.filter((x) => x.id !== excluirId));
      } catch {
        if (vivo) setResultados([]);
      }
    }, 250);
    return () => {
      vivo = false;
      clearTimeout(t);
    };
  }, [termo, ativo, excluirId]);

  const lista = ativo ? resultados : [];

  return (
    <div className="space-y-2">
      <label htmlFor={id} className="block text-sm">{rotulo}</label>
      <input id={id} type="search" value={termo} onChange={(e) => setTermo(e.target.value)} className="w-full rounded border px-3 py-2" />
      {lista.length > 0 && (
        <ul className="divide-y rounded border bg-white">
          {lista.map((r) => (
            <li key={r.id}>
              {onEscolher ? (
                <button type="button" onClick={() => onEscolher(r)} className="w-full p-3 text-left">{rotuloDe(r)}</button>
              ) : (
                <Link href={`/alunos/${r.id}`} className="block p-3">{rotuloDe(r)}</Link>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Início**

`src/components/inicio/NovoAno.tsx`:

```tsx
'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { criarAno } from '@/lib/dados/anos';
import { mensagemErro } from '@/lib/mensagemErro';
import { clienteNavegador } from '@/lib/supabase/navegador';

export function NovoAno() {
  const router = useRouter();
  const [ano, setAno] = useState(String(new Date().getFullYear()));
  const [erro, setErro] = useState<string | null>(null);

  async function criar(e: FormEvent) {
    e.preventDefault();
    setErro(null);
    try {
      await criarAno(clienteNavegador(), Number(ano));
      router.refresh();
    } catch (err) {
      setErro(mensagemErro(err));
    }
  }

  return (
    <form onSubmit={criar} className="flex flex-wrap items-end gap-2">
      <div>
        <label htmlFor="novo-ano" className="block text-sm">Ano</label>
        <input id="novo-ano" type="number" min={2000} max={2100} value={ano} onChange={(e) => setAno(e.target.value)} className="w-28 rounded border px-3 py-2" />
      </div>
      <button className="rounded bg-blue-700 px-4 py-2 text-white">Criar ano</button>
      {erro && <p role="alert" className="w-full text-sm text-red-600">{erro}</p>}
    </form>
  );
}
```

`src/components/inicio/UsoStorage.tsx`:

```tsx
import { formatarBytes, LIMITE_STORAGE, usoAlto } from '@/lib/dominio/formato';

export function UsoStorage({ bytes }: { bytes: number }) {
  const pct = Math.min(100, Math.round((bytes / LIMITE_STORAGE) * 100));
  const alto = usoAlto(bytes);
  return (
    <section className="space-y-1 text-sm">
      <p>{formatarBytes(bytes)} de 1 GB usados</p>
      <div className="h-2 rounded bg-gray-200">
        <div className={`h-2 rounded ${alto ? 'bg-red-500' : 'bg-blue-600'}`} style={{ width: `${pct}%` }} />
      </div>
      {alto && (
        <p role="alert" className="text-red-600">
          Armazenamento acima de 80%. Apague arquivos antigos ou aumente o plano do Supabase.
        </p>
      )}
    </section>
  );
}
```

`src/app/(app)/page.tsx` (substitui o provisório):

```tsx
import Link from 'next/link';
import { NovoAno } from '@/components/inicio/NovoAno';
import { UsoStorage } from '@/components/inicio/UsoStorage';
import { BuscarAluno } from '@/components/ui/BuscarAluno';
import { listarAnos } from '@/lib/dados/anos';
import { usoStorage } from '@/lib/dados/arquivos';
import { clienteServidor } from '@/lib/supabase/servidor';
import type { AnoLetivo } from '@/lib/tipos';

function ListaAnos({ anos }: { anos: AnoLetivo[] }) {
  return (
    <ul className="grid grid-cols-3 gap-2">
      {anos.map((a) => (
        <li key={a.id}>
          <Link href={`/anos/${a.id}`} className="block rounded border bg-white p-3 text-center font-medium">{a.ano}</Link>
        </li>
      ))}
    </ul>
  );
}

export default async function Inicio() {
  const sb = await clienteServidor();
  const [anos, uso] = await Promise.all([listarAnos(sb), usoStorage(sb)]);
  const ativos = anos.filter((a) => !a.arquivado);
  const arquivados = anos.filter((a) => a.arquivado);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Início</h1>
      <Link href="/lote" className="block rounded bg-blue-700 py-4 text-center text-lg text-white">Escanear lote</Link>
      <BuscarAluno />
      <section className="space-y-3">
        <h2 className="font-medium">Anos letivos</h2>
        <ListaAnos anos={ativos} />
        {arquivados.length > 0 && (
          <details>
            <summary className="cursor-pointer text-sm text-gray-600">Arquivados ({arquivados.length})</summary>
            <div className="mt-2"><ListaAnos anos={arquivados} /></div>
          </details>
        )}
        <NovoAno />
      </section>
      <UsoStorage bytes={uso} />
    </div>
  );
}
```

- [ ] **Step 4: Página do ano**

`src/components/ano/NovaTurma.tsx`:

```tsx
'use client';

import { useRouter } from 'next/navigation';
import { FormNome } from '@/components/ui/FormNome';
import { criarTurma } from '@/lib/dados/turmas';
import { clienteNavegador } from '@/lib/supabase/navegador';

export function NovaTurma({ anoId }: { anoId: string }) {
  const router = useRouter();
  return (
    <FormNome
      rotulo="Nome da turma"
      textoBotao="Criar turma"
      placeholder="ex.: 3º A"
      onSalvar={async (nome) => {
        await criarTurma(clienteNavegador(), anoId, nome);
        router.refresh();
      }}
    />
  );
}
```

`src/components/ano/AcoesAno.tsx`:

```tsx
'use client';

import { useRouter } from 'next/navigation';
import { BotaoApagar } from '@/components/ui/BotaoApagar';
import { definirArquivado } from '@/lib/dados/anos';
import { clienteNavegador } from '@/lib/supabase/navegador';
import type { AnoLetivo } from '@/lib/tipos';

export function AcoesAno({ ano }: { ano: AnoLetivo }) {
  const router = useRouter();
  return (
    <div className="flex flex-wrap gap-4">
      <button
        onClick={async () => {
          await definirArquivado(clienteNavegador(), ano.id, !ano.arquivado);
          router.refresh();
        }}
        className="text-sm text-blue-700"
      >
        {ano.arquivado ? 'Desarquivar ano' : 'Arquivar ano'}
      </button>
      <BotaoApagar escopo={{ tipo: 'ano', id: ano.id }} rotulo="Apagar ano" descricao={`o ano ${ano.ano}`} depois="/" />
    </div>
  );
}
```

`src/app/(app)/anos/[anoId]/page.tsx`:

```tsx
import Link from 'next/link';
import { AcoesAno } from '@/components/ano/AcoesAno';
import { NovaTurma } from '@/components/ano/NovaTurma';
import { obterAno } from '@/lib/dados/anos';
import { listarTurmas } from '@/lib/dados/turmas';
import { clienteServidor } from '@/lib/supabase/servidor';

export default async function PaginaAno({ params }: { params: Promise<{ anoId: string }> }) {
  const { anoId } = await params;
  const sb = await clienteServidor();
  const [ano, turmas] = await Promise.all([obterAno(sb, anoId), listarTurmas(sb, anoId)]);

  return (
    <div className="space-y-4">
      <nav className="text-sm"><Link href="/">← Início</Link></nav>
      <h1 className="text-xl font-semibold">{ano.ano}</h1>
      {ano.arquivado && <p className="text-sm text-gray-600">Ano arquivado</p>}
      <AcoesAno ano={ano} />
      <ul className="grid grid-cols-2 gap-3">
        {turmas.map((t) => (
          <li key={t.id}>
            <Link href={`/turmas/${t.id}`} className="block rounded border bg-white p-4 font-medium">{t.nome}</Link>
          </li>
        ))}
      </ul>
      {turmas.length === 0 && <p className="text-sm text-gray-600">Nenhuma turma ainda.</p>}
      <NovaTurma anoId={anoId} />
    </div>
  );
}
```

- [ ] **Step 5: Página da turma (abas Alunos e Atividades)**

`src/components/turma/AcoesTurma.tsx`:

```tsx
'use client';

import { useRouter } from 'next/navigation';
import { BotaoApagar } from '@/components/ui/BotaoApagar';
import { Renomear } from '@/components/ui/Renomear';
import { renomearTurma } from '@/lib/dados/turmas';
import { clienteNavegador } from '@/lib/supabase/navegador';
import type { Turma } from '@/lib/tipos';

export function AcoesTurma({ turma }: { turma: Turma }) {
  const router = useRouter();
  return (
    <div className="flex flex-wrap gap-4">
      <Renomear
        atual={turma.nome}
        rotulo="Renomear turma"
        onSalvar={async (nome) => {
          await renomearTurma(clienteNavegador(), turma.id, nome);
          router.refresh();
        }}
      />
      <BotaoApagar escopo={{ tipo: 'turma', id: turma.id }} rotulo="Apagar turma" descricao={`a turma ${turma.nome}`} depois={`/anos/${turma.ano_letivo_id}`} />
    </div>
  );
}
```

`src/components/turma/AdicionarAlunos.tsx`:

```tsx
'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { criarAlunos } from '@/lib/dados/alunos';
import { parseNomes } from '@/lib/dominio/nomes';
import { mensagemErro } from '@/lib/mensagemErro';
import { clienteNavegador } from '@/lib/supabase/navegador';

const plural = (n: number, palavra: string) => `${n} ${palavra}${n === 1 ? '' : 's'}`;

export function AdicionarAlunos({ turmaId, existentes }: { turmaId: string; existentes: string[] }) {
  const router = useRouter();
  const [texto, setTexto] = useState('');
  const [resultado, setResultado] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  async function adicionar() {
    const { novos, ignorados } = parseNomes(texto, existentes);
    setOcupado(true);
    setErro(null);
    try {
      await criarAlunos(clienteNavegador(), turmaId, novos);
      setTexto('');
      setResultado(`${plural(novos.length, 'adicionado')}, ${plural(ignorados, 'ignorado')}`);
      router.refresh();
    } catch (e) {
      setErro(mensagemErro(e));
    } finally {
      setOcupado(false);
    }
  }

  return (
    <div className="space-y-2">
      <label htmlFor="nomes" className="block text-sm">Cole um nome por linha</label>
      <textarea id="nomes" rows={5} value={texto} onChange={(e) => setTexto(e.target.value)} className="w-full rounded border p-2" />
      <button onClick={adicionar} disabled={ocupado || !texto.trim()} className="rounded bg-blue-700 px-4 py-2 text-white disabled:opacity-50">
        Adicionar alunos
      </button>
      {resultado && <p role="status" className="text-sm text-green-700">{resultado}</p>}
      {erro && <p role="alert" className="text-sm text-red-600">{erro}</p>}
    </div>
  );
}
```

`src/components/turma/AbaAlunos.tsx`:

```tsx
import Link from 'next/link';
import type { AlunoComContagem } from '@/lib/tipos';
import { AdicionarAlunos } from './AdicionarAlunos';

export function AbaAlunos({ turmaId, alunos }: { turmaId: string; alunos: AlunoComContagem[] }) {
  return (
    <div className="space-y-4">
      {alunos.length === 0 ? (
        <p className="text-sm text-gray-600">Nenhum aluno ainda.</p>
      ) : (
        <ul className="divide-y rounded border bg-white">
          {alunos.map((a) => (
            <li key={a.id}>
              <Link href={`/alunos/${a.id}`} className="flex justify-between p-3">
                <span>{a.nome}</span>
                <span className="text-sm text-gray-500">{a.total_arquivos} arquivo(s)</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <AdicionarAlunos turmaId={turmaId} existentes={alunos.map((a) => a.nome)} />
    </div>
  );
}
```

`src/components/turma/AbaAtividades.tsx`:

```tsx
'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Confirmar } from '@/components/ui/Confirmar';
import { FormNome } from '@/components/ui/FormNome';
import { Renomear } from '@/components/ui/Renomear';
import { apagarAtividade, criarAtividade, renomearAtividade } from '@/lib/dados/atividades';
import { calcularEntregas } from '@/lib/dominio/entregas';
import { formatarData } from '@/lib/dominio/formato';
import { clienteNavegador } from '@/lib/supabase/navegador';
import type { Aluno, Atividade } from '@/lib/tipos';

type Props = { turmaId: string; atividades: Atividade[]; alunos: Aluno[]; entregas: Record<string, string[]> };

function ApagarAtividade({ atividade }: { atividade: Atividade }) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  return (
    <>
      <button onClick={() => setAberto(true)} className="text-sm text-red-600">Apagar</button>
      {aberto && (
        <Confirmar
          titulo={`Apagar a atividade ${atividade.nome}?`}
          mensagem="Os arquivos continuam nas pastas dos alunos, em “Outros”."
          textoConfirmar="Apagar"
          onCancelar={() => setAberto(false)}
          onConfirmar={async () => {
            await apagarAtividade(clienteNavegador(), atividade.id);
            setAberto(false);
            router.refresh();
          }}
        />
      )}
    </>
  );
}

export function AbaAtividades({ turmaId, atividades, alunos, entregas }: Props) {
  const router = useRouter();
  const [data, setData] = useState('');

  return (
    <div className="space-y-4">
      <FormNome
        rotulo="Nome da atividade"
        textoBotao="Criar atividade"
        onSalvar={async (nome) => {
          await criarAtividade(clienteNavegador(), turmaId, nome, data || null);
          setData('');
          router.refresh();
        }}
      />
      <label className="block text-sm">
        Data (opcional)
        <input type="date" value={data} onChange={(e) => setData(e.target.value)} className="ml-2 rounded border px-2 py-1" />
      </label>
      <ul className="space-y-2">
        {atividades.map((at) => {
          const { entregues, faltam } = calcularEntregas(alunos, new Set(entregas[at.id] ?? []));
          return (
            <li key={at.id} className="rounded border bg-white p-3">
              <details>
                <summary className="flex cursor-pointer justify-between gap-2">
                  <span>
                    {at.nome}
                    {at.data && <span className="ml-2 text-sm text-gray-500">{formatarData(at.data)}</span>}
                  </span>
                  <span className="text-sm">{entregues.length}/{alunos.length} entregues</span>
                </summary>
                <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <h4 className="font-medium">Faltam</h4>
                    <ul>{faltam.map((a) => <li key={a.id}>{a.nome}</li>)}</ul>
                  </div>
                  <div>
                    <h4 className="font-medium">Entregaram</h4>
                    <ul>{entregues.map((a) => <li key={a.id}>{a.nome}</li>)}</ul>
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap gap-4">
                  <Renomear
                    atual={at.nome}
                    onSalvar={async (nome) => {
                      await renomearAtividade(clienteNavegador(), at.id, nome);
                      router.refresh();
                    }}
                  />
                  <ApagarAtividade atividade={at} />
                </div>
              </details>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
```

`src/app/(app)/turmas/[turmaId]/page.tsx`:

```tsx
import Link from 'next/link';
import { AbaAlunos } from '@/components/turma/AbaAlunos';
import { AbaAtividades } from '@/components/turma/AbaAtividades';
import { AcoesTurma } from '@/components/turma/AcoesTurma';
import { listarAlunos } from '@/lib/dados/alunos';
import { entregasDaTurma, listarAtividades } from '@/lib/dados/atividades';
import { obterTurma } from '@/lib/dados/turmas';
import { clienteServidor } from '@/lib/supabase/servidor';

type Props = { params: Promise<{ turmaId: string }>; searchParams: Promise<{ aba?: string }> };

export default async function PaginaTurma({ params, searchParams }: Props) {
  const { turmaId } = await params;
  const { aba = 'alunos' } = await searchParams;
  const sb = await clienteServidor();
  const turma = await obterTurma(sb, turmaId);
  const [alunos, atividades, entregas] = await Promise.all([
    listarAlunos(sb, turmaId),
    listarAtividades(sb, turmaId),
    entregasDaTurma(sb, turmaId),
  ]);
  const classeAba = (ativa: boolean) => `pb-2 ${ativa ? 'border-b-2 border-blue-700 font-medium' : 'text-gray-600'}`;

  return (
    <div className="space-y-4">
      <nav className="text-sm"><Link href={`/anos/${turma.ano_letivo_id}`}>← {turma.anos_letivos.ano}</Link></nav>
      <h1 className="text-xl font-semibold">{turma.nome}</h1>
      <AcoesTurma turma={turma} />
      <div role="tablist" className="flex gap-6 border-b">
        <Link role="tab" aria-selected={aba !== 'atividades'} href="?aba=alunos" className={classeAba(aba !== 'atividades')}>Alunos</Link>
        <Link role="tab" aria-selected={aba === 'atividades'} href="?aba=atividades" className={classeAba(aba === 'atividades')}>Atividades</Link>
      </div>
      {aba === 'atividades' ? (
        <AbaAtividades turmaId={turmaId} atividades={atividades} alunos={alunos} entregas={entregas} />
      ) : (
        <AbaAlunos turmaId={turmaId} alunos={alunos} />
      )}
    </div>
  );
}
```

`src/app/(app)/error.tsx`:

```tsx
'use client';

export default function Erro({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="space-y-3">
      <h1 className="text-xl font-semibold">Algo deu errado</h1>
      <p className="text-sm text-gray-600">Talvez o item tenha sido apagado ou a conexão caiu.</p>
      <button onClick={reset} className="rounded border px-3 py-2">Tentar de novo</button>
    </div>
  );
}
```

- [ ] **Step 6: Rodar o E2E e ver passar**

Run: `npm run test:e2e -- organizacao.spec.ts`
Expected: 2 passed.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(ui): início, ano e turma com alunos, atividades e entregas

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Pasta do aluno e acesso aos arquivos

**Files:**
- Create: `src/app/arquivos/[arquivoId]/route.ts`, `src/components/aluno/AcoesAluno.tsx`, `src/components/aluno/ListaArquivos.tsx`, `src/app/(app)/alunos/[alunoId]/page.tsx`, `tests/e2e/aluno.spec.ts`

**Interfaces:**
- Consumes: `obterAluno`, `listarArquivosDoAluno`, `listarAtividades`, `renomearAluno`, `renomearArquivo`, `moverArquivo`, `agruparPorAtividade`, `Grupo`, `nomeDownload`, `BUCKET`, `caminhoMiniatura`, `BotaoApagar`, `Renomear`, `BuscarAluno`.
- Produces: rota `GET /arquivos/{id}` (abrir), `?download=1` (baixar com nome do título), `?miniatura=1` (JPEG da miniatura). Responde redirecionando para uma URL assinada de 300 s, ou 404. Página `/alunos/{id}` com links "Escanear" (`/alunos/{id}/escanear`) e "Enviar arquivo" (`/alunos/{id}/enviar`).

- [ ] **Step 1: Escrever o E2E (falhando)**

`tests/e2e/aluno.spec.ts`:

```ts
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
```

Run: `npm run test:e2e -- aluno.spec.ts`
Expected: FAIL (página do aluno não existe).

- [ ] **Step 2: Rota de acesso ao arquivo**

`src/app/arquivos/[arquivoId]/route.ts`:

```ts
import { NextResponse, type NextRequest } from 'next/server';
import { BUCKET, caminhoMiniatura } from '@/lib/dados/storage';
import { nomeDownload } from '@/lib/dominio/formato';
import { clienteServidor } from '@/lib/supabase/servidor';

export async function GET(request: NextRequest, { params }: { params: Promise<{ arquivoId: string }> }) {
  const { arquivoId } = await params;
  const sb = await clienteServidor();
  const { data: arquivo } = await sb
    .from('arquivos')
    .select('titulo,storage_path,tem_miniatura')
    .eq('id', arquivoId)
    .maybeSingle();
  if (!arquivo) return new NextResponse('Arquivo não encontrado', { status: 404 });

  const q = request.nextUrl.searchParams;
  const miniatura = q.has('miniatura');
  if (miniatura && !arquivo.tem_miniatura) return new NextResponse('Sem miniatura', { status: 404 });

  const caminho = miniatura ? caminhoMiniatura(arquivo.storage_path) : arquivo.storage_path;
  const { data, error } = await sb.storage
    .from(BUCKET)
    .createSignedUrl(caminho, 300, q.has('download') ? { download: nomeDownload(arquivo.titulo) } : undefined);
  if (error || !data) return new NextResponse('Falha ao gerar link', { status: 500 });
  return NextResponse.redirect(data.signedUrl);
}
```

- [ ] **Step 3: Componentes da pasta**

`src/components/aluno/AcoesAluno.tsx`:

```tsx
'use client';

import { useRouter } from 'next/navigation';
import { BotaoApagar } from '@/components/ui/BotaoApagar';
import { Renomear } from '@/components/ui/Renomear';
import { renomearAluno } from '@/lib/dados/alunos';
import { clienteNavegador } from '@/lib/supabase/navegador';
import type { Aluno } from '@/lib/tipos';

export function AcoesAluno({ aluno }: { aluno: Aluno }) {
  const router = useRouter();
  return (
    <div className="flex flex-wrap gap-4">
      <Renomear
        atual={aluno.nome}
        rotulo="Renomear aluno"
        onSalvar={async (nome) => {
          await renomearAluno(clienteNavegador(), aluno.id, nome);
          router.refresh();
        }}
      />
      <BotaoApagar escopo={{ tipo: 'aluno', id: aluno.id }} rotulo="Apagar aluno" descricao={aluno.nome} depois={`/turmas/${aluno.turma_id}`} />
    </div>
  );
}
```

`src/components/aluno/ListaArquivos.tsx`:

```tsx
'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { BotaoApagar } from '@/components/ui/BotaoApagar';
import { BuscarAluno } from '@/components/ui/BuscarAluno';
import { Renomear } from '@/components/ui/Renomear';
import { moverArquivo, renomearArquivo } from '@/lib/dados/arquivos';
import type { Grupo } from '@/lib/dominio/agrupar';
import { mensagemErro } from '@/lib/mensagemErro';
import { clienteNavegador } from '@/lib/supabase/navegador';
import type { Arquivo } from '@/lib/tipos';

function CartaoArquivo({ arquivo, alunoId }: { arquivo: Arquivo; alunoId: string }) {
  const router = useRouter();
  const [movendo, setMovendo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  return (
    <li data-testid="arquivo" className="rounded border bg-white p-3">
      <div className="flex gap-3">
        {arquivo.tem_miniatura ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={`/arquivos/${arquivo.id}?miniatura=1`} alt="" className="h-20 w-16 rounded border object-cover" />
        ) : (
          <div className="flex h-20 w-16 items-center justify-center rounded border text-xs text-gray-500">PDF</div>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{arquivo.titulo}</p>
          <p className="text-xs text-gray-500">
            {new Date(arquivo.criado_em).toLocaleDateString('pt-BR')} · {arquivo.paginas} página(s)
          </p>
          <div className="mt-2 flex flex-wrap gap-3 text-sm">
            <a href={`/arquivos/${arquivo.id}`} target="_blank" rel="noreferrer" className="text-blue-700">Abrir</a>
            <a href={`/arquivos/${arquivo.id}?download=1`} className="text-blue-700">Baixar</a>
            <Renomear
              atual={arquivo.titulo}
              onSalvar={async (titulo) => {
                await renomearArquivo(clienteNavegador(), arquivo.id, titulo);
                router.refresh();
              }}
            />
            <button onClick={() => setMovendo((m) => !m)} className="text-blue-700">Mover</button>
            <BotaoApagar escopo={{ tipo: 'arquivo', id: arquivo.id }} rotulo="Apagar" descricao={`“${arquivo.titulo}”`} depois="refresh" />
          </div>
        </div>
      </div>
      {movendo && (
        <div className="mt-3">
          <BuscarAluno
            rotulo="Mover para qual aluno?"
            excluirId={alunoId}
            onEscolher={async (r) => {
              setErro(null);
              try {
                await moverArquivo(clienteNavegador(), arquivo, { id: r.id, turma_id: r.turma.id });
                setMovendo(false);
                router.refresh();
              } catch (e) {
                setErro(mensagemErro(e));
              }
            }}
          />
          {erro && <p role="alert" className="text-sm text-red-600">{erro}</p>}
        </div>
      )}
    </li>
  );
}

export function ListaArquivos({ grupos, alunoId }: { grupos: Grupo[]; alunoId: string }) {
  if (!grupos.length) return <p className="text-sm text-gray-600">Nenhum arquivo ainda.</p>;
  return (
    <div className="space-y-6">
      {grupos.map((g) => (
        <section key={g.chave}>
          <h2 className="mb-2 font-medium">{g.titulo}</h2>
          <ul className="space-y-2">
            {g.arquivos.map((a) => <CartaoArquivo key={a.id} arquivo={a} alunoId={alunoId} />)}
          </ul>
        </section>
      ))}
    </div>
  );
}
```

`src/app/(app)/alunos/[alunoId]/page.tsx`:

```tsx
import Link from 'next/link';
import { AcoesAluno } from '@/components/aluno/AcoesAluno';
import { ListaArquivos } from '@/components/aluno/ListaArquivos';
import { obterAluno } from '@/lib/dados/alunos';
import { listarArquivosDoAluno } from '@/lib/dados/arquivos';
import { listarAtividades } from '@/lib/dados/atividades';
import { agruparPorAtividade } from '@/lib/dominio/agrupar';
import { clienteServidor } from '@/lib/supabase/servidor';

export default async function PaginaAluno({ params }: { params: Promise<{ alunoId: string }> }) {
  const { alunoId } = await params;
  const sb = await clienteServidor();
  const aluno = await obterAluno(sb, alunoId);
  const [arquivos, atividades] = await Promise.all([
    listarArquivosDoAluno(sb, alunoId),
    listarAtividades(sb, aluno.turma_id),
  ]);

  return (
    <div className="space-y-4">
      <nav className="text-sm">
        <Link href={`/turmas/${aluno.turma_id}`}>← {aluno.turmas.nome} · {aluno.turmas.anos_letivos.ano}</Link>
      </nav>
      <h1 className="text-xl font-semibold">{aluno.nome}</h1>
      <AcoesAluno aluno={{ id: aluno.id, turma_id: aluno.turma_id, nome: aluno.nome }} />
      <div className="flex gap-2">
        <Link href={`/alunos/${alunoId}/escanear`} className="flex-1 rounded bg-blue-700 py-3 text-center text-white">Escanear</Link>
        <Link href={`/alunos/${alunoId}/enviar`} className="flex-1 rounded border bg-white py-3 text-center">Enviar arquivo</Link>
      </div>
      <ListaArquivos grupos={agruparPorAtividade(arquivos, atividades)} alunoId={alunoId} />
    </div>
  );
}
```

- [ ] **Step 4: Rodar o E2E e ver passar**

Run: `npm run test:e2e -- aluno.spec.ts`
Expected: 2 passed.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(aluno): pasta do aluno com abrir, baixar, renomear, mover e apagar

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Processamento de imagem (funções puras)

**Files:**
- Create: `src/lib/imagem/tipos.ts`, `src/lib/imagem/homografia.ts`, `src/lib/imagem/cantos.ts`, `src/lib/imagem/retificar.ts`, `src/lib/imagem/rotacao.ts`, `src/lib/imagem/filtro.ts`, `src/lib/imagem/processar.ts`, `src/lib/imagem/estabilizador.ts`, `src/lib/imagem/teste-ajuda.ts`
- Test: `src/lib/imagem/homografia.test.ts`, `cantos.test.ts`, `retificar.test.ts`, `rotacao.test.ts`, `filtro.test.ts`, `processar.test.ts`, `estabilizador.test.ts`

**Interfaces:**
- Produces:
  - `tipos.ts`: `type Imagem = { data: Uint8ClampedArray; width: number; height: number }` (compatível com `ImageData`); `type Ponto = { x: number; y: number }`; `type Cantos = [Ponto, Ponto, Ponto, Ponto]` (ordem: sup-esq, sup-dir, inf-dir, inf-esq); `type Rotacao = 0 | 90 | 180 | 270`; `type Filtro = 'documento' | 'cor'`; `type Pagina = { id: string; fonte: Blob; largura: number; altura: number; cantos: Cantos; rotacao: Rotacao; detectado: boolean }`
  - `homografia(de: Cantos, para: Cantos): number[]` (matriz 3×3 em linha, 9 números); `aplicarHomografia(h: number[], p: Ponto): Ponto`
  - `cantosDaImagem(img: { width: number; height: number }): Cantos`; `ordenarCantos(pts: Ponto[]): Cantos`; `escalarCantos(c: Cantos, fator: number): Cantos`; `distanciaMaxima(a: Cantos, b: Cantos): number`
  - `tamanhoRetificado(c: Cantos, maxLado: number): { largura: number; altura: number }`; `retificar(img: Imagem, c: Cantos, maxLado: number): Imagem`; `redimensionar(img: Imagem, maxLado: number): Imagem`
  - `rotacionar(img: Imagem, graus: Rotacao): Imagem` (sentido horário)
  - `filtroDocumento(img: Imagem): Imagem`
  - `processarImagem(img: Imagem, cantos: Cantos, rotacao: Rotacao, filtro: Filtro, maxLado: number): Imagem`
  - `class Estabilizador { constructor(tolerancia: number, duracaoMs?: number); atualizar(cantos: Cantos | null, agoraMs: number): boolean; reiniciar(): void }`

- [ ] **Step 1: Tipos e helper de teste**

`src/lib/imagem/tipos.ts`:

```ts
export type Imagem = { data: Uint8ClampedArray; width: number; height: number };
export type Ponto = { x: number; y: number };
/** Ordem: superior-esquerdo, superior-direito, inferior-direito, inferior-esquerdo. */
export type Cantos = [Ponto, Ponto, Ponto, Ponto];
export type Rotacao = 0 | 90 | 180 | 270;
export type Filtro = 'documento' | 'cor';

/** Uma página capturada e ainda não processada. `fonte` é JPEG com lado maior ≤ 2400 px. */
export type Pagina = {
  id: string;
  fonte: Blob;
  largura: number;
  altura: number;
  cantos: Cantos;
  rotacao: Rotacao;
  detectado: boolean;
};
```

`src/lib/imagem/teste-ajuda.ts`:

```ts
import type { Imagem } from './tipos';

export function criarImagem(w: number, h: number, cor: (x: number, y: number) => [number, number, number]): Imagem {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const [r, g, b] = cor(x, y);
      data.set([r, g, b, 255], (y * w + x) * 4);
    }
  }
  return { data, width: w, height: h };
}

export function pixel(img: Imagem, x: number, y: number): number[] {
  const i = (y * img.width + x) * 4;
  return Array.from(img.data.slice(i, i + 4));
}
```

- [ ] **Step 2: Escrever os testes (falhando)**

`src/lib/imagem/homografia.test.ts`:

```ts
import { expect, it } from 'vitest';
import { aplicarHomografia, homografia } from './homografia';
import type { Cantos } from './tipos';

const quadrado: Cantos = [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }, { x: 0, y: 100 }];
const trapezio: Cantos = [{ x: 10, y: 20 }, { x: 90, y: 5 }, { x: 110, y: 95 }, { x: -5, y: 80 }];

it('leva cada canto de origem ao canto de destino', () => {
  const h = homografia(quadrado, trapezio);
  quadrado.forEach((p, i) => {
    const q = aplicarHomografia(h, p);
    expect(q.x).toBeCloseTo(trapezio[i].x, 6);
    expect(q.y).toBeCloseTo(trapezio[i].y, 6);
  });
});

it('identidade quando origem e destino são iguais', () => {
  const q = aplicarHomografia(homografia(quadrado, quadrado), { x: 37, y: 12 });
  expect(q.x).toBeCloseTo(37, 9);
  expect(q.y).toBeCloseTo(12, 9);
});

it('recusa origem degenerada', () => {
  const ponto: Cantos = [{ x: 1, y: 1 }, { x: 1, y: 1 }, { x: 1, y: 1 }, { x: 1, y: 1 }];
  expect(() => homografia(ponto, quadrado)).toThrow('Cantos inválidos');
});
```

`src/lib/imagem/cantos.test.ts`:

```ts
import { expect, it } from 'vitest';
import { cantosDaImagem, distanciaMaxima, escalarCantos, ordenarCantos } from './cantos';

it('cantos da imagem inteira', () => {
  expect(cantosDaImagem({ width: 4, height: 3 })).toEqual([{ x: 0, y: 0 }, { x: 4, y: 0 }, { x: 4, y: 3 }, { x: 0, y: 3 }]);
});

it('ordena pontos soltos em sup-esq, sup-dir, inf-dir, inf-esq', () => {
  const pts = [{ x: 90, y: 95 }, { x: 12, y: 8 }, { x: 5, y: 88 }, { x: 95, y: 3 }];
  expect(ordenarCantos(pts)).toEqual([{ x: 12, y: 8 }, { x: 95, y: 3 }, { x: 90, y: 95 }, { x: 5, y: 88 }]);
});

it('escala e mede deslocamento', () => {
  const c = cantosDaImagem({ width: 10, height: 10 });
  expect(escalarCantos(c, 2)[2]).toEqual({ x: 20, y: 20 });
  expect(distanciaMaxima(c, escalarCantos(c, 2))).toBeCloseTo(Math.hypot(10, 10));
});
```

`src/lib/imagem/retificar.test.ts`:

```ts
import { expect, it } from 'vitest';
import { cantosDaImagem } from './cantos';
import { redimensionar, retificar, tamanhoRetificado } from './retificar';
import { criarImagem, pixel } from './teste-ajuda';

it('com os cantos da imagem inteira devolve a mesma imagem', () => {
  const img = criarImagem(4, 3, (x, y) => [x * 50, y * 80, 7]);
  const r = retificar(img, cantosDaImagem(img), 100);
  expect([r.width, r.height]).toEqual([4, 3]);
  for (let y = 0; y < 3; y++) for (let x = 0; x < 4; x++) {
    pixel(r, x, y).forEach((v, i) => expect(Math.abs(v - pixel(img, x, y)[i])).toBeLessThanOrEqual(1));
  }
});

it('recorta só a região dos cantos', () => {
  const img = criarImagem(10, 10, (x, y) => (x >= 2 && x < 6 && y >= 2 && y < 6 ? [255, 255, 255] : [0, 0, 0]));
  const r = retificar(img, [{ x: 2, y: 2 }, { x: 6, y: 2 }, { x: 6, y: 6 }, { x: 2, y: 6 }], 100);
  expect([r.width, r.height]).toEqual([4, 4]);
  for (let i = 0; i < r.data.length; i += 4) expect(r.data[i]).toBe(255);
});

it('recusa cantos colapsados num ponto', () => {
  const img = criarImagem(10, 10, () => [0, 0, 0]);
  const p = { x: 5, y: 5 };
  expect(() => retificar(img, [p, p, p, p], 100)).toThrow('Cantos inválidos');
});

it('limita o lado maior sem ampliar', () => {
  expect(tamanhoRetificado(cantosDaImagem({ width: 200, height: 100 }), 50)).toEqual({ largura: 50, altura: 25 });
  expect(tamanhoRetificado(cantosDaImagem({ width: 20, height: 10 }), 50)).toEqual({ largura: 20, altura: 10 });
  const r = redimensionar(criarImagem(200, 100, () => [9, 9, 9]), 50);
  expect([r.width, r.height]).toEqual([50, 25]);
});
```

`src/lib/imagem/rotacao.test.ts`:

```ts
import { expect, it } from 'vitest';
import { rotacionar } from './rotacao';
import { criarImagem, pixel } from './teste-ajuda';

const img = criarImagem(2, 1, (x) => (x === 0 ? [10, 0, 0] : [20, 0, 0])); // [A B]

it('90° no sentido horário: A em cima, B embaixo', () => {
  const r = rotacionar(img, 90);
  expect([r.width, r.height]).toEqual([1, 2]);
  expect(pixel(r, 0, 0)[0]).toBe(10);
  expect(pixel(r, 0, 1)[0]).toBe(20);
});

it('180° inverte a ordem; 0° não muda', () => {
  const r = rotacionar(img, 180);
  expect([pixel(r, 0, 0)[0], pixel(r, 1, 0)[0]]).toEqual([20, 10]);
  expect(rotacionar(img, 0)).toBe(img);
});
```

`src/lib/imagem/filtro.test.ts`:

```ts
import { expect, it } from 'vitest';
import { filtroDocumento } from './filtro';
import { criarImagem, pixel } from './teste-ajuda';

it('papel vira branco, texto vira preto, tudo em cinza', () => {
  // 10x10: primeira linha é "texto" (30), o resto é "papel" (200, levemente amarelado)
  const img = criarImagem(10, 10, (_x, y) => (y === 0 ? [30, 30, 30] : [210, 200, 180]));
  const r = filtroDocumento(img);
  expect(pixel(r, 5, 5)).toEqual([255, 255, 255, 255]);
  expect(pixel(r, 5, 0)).toEqual([0, 0, 0, 255]);
});

it('página quase em branco não divide por zero', () => {
  const r = filtroDocumento(criarImagem(4, 4, () => [200, 200, 200]));
  expect(pixel(r, 0, 0)).toEqual([255, 255, 255, 255]);
});
```

`src/lib/imagem/processar.test.ts`:

```ts
import { expect, it } from 'vitest';
import { cantosDaImagem } from './cantos';
import { processarImagem } from './processar';
import { criarImagem, pixel } from './teste-ajuda';

it('recorta, gira e aplica filtro na ordem certa', () => {
  const img = criarImagem(40, 20, () => [200, 100, 50]);
  const cor = processarImagem(img, cantosDaImagem(img), 90, 'cor', 1600);
  expect([cor.width, cor.height]).toEqual([20, 40]);
  expect(pixel(cor, 0, 0).slice(0, 3)).toEqual([200, 100, 50]);
  const doc = processarImagem(img, cantosDaImagem(img), 0, 'documento', 1600);
  const [r, g, b] = pixel(doc, 0, 0);
  expect(r).toBe(g);
  expect(g).toBe(b);
});
```

`src/lib/imagem/estabilizador.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import type { Cantos } from './tipos';
import { Estabilizador } from './estabilizador';

const c = (d = 0): Cantos => [{ x: d, y: d }, { x: 100 + d, y: d }, { x: 100 + d, y: 100 + d }, { x: d, y: 100 + d }];

describe('Estabilizador', () => {
  it('só dispara após 1 s parado', () => {
    const e = new Estabilizador(5, 1000);
    expect(e.atualizar(c(), 0)).toBe(false);
    expect(e.atualizar(c(1), 500)).toBe(false);
    expect(e.atualizar(c(2), 1000)).toBe(true);
  });

  it('movimento grande reinicia a contagem; sem folha não dispara', () => {
    const e = new Estabilizador(5, 1000);
    e.atualizar(c(), 0);
    expect(e.atualizar(c(20), 900)).toBe(false);
    expect(e.atualizar(c(20), 1500)).toBe(false);
    expect(e.atualizar(c(20), 1900)).toBe(true);
    expect(e.atualizar(null, 2000)).toBe(false);
  });

  it('depois de capturar, só rearma quando a folha some ou muda de lugar', () => {
    const e = new Estabilizador(5, 1000);
    e.atualizar(c(), 0);
    expect(e.atualizar(c(), 1000)).toBe(true);
    e.reiniciar();
    expect(e.atualizar(c(), 5000)).toBe(false);
    e.atualizar(null, 6000);
    e.atualizar(c(), 6100);
    expect(e.atualizar(c(), 7100)).toBe(true);
    e.reiniciar();
    e.atualizar(c(50), 8000);
    expect(e.atualizar(c(50), 9000)).toBe(true);
  });
});
```

Run: `npm test -- imagem`
Expected: FAIL (módulos inexistentes).

- [ ] **Step 3: Implementar homografia e cantos**

`src/lib/imagem/homografia.ts`:

```ts
import type { Cantos, Ponto } from './tipos';

function resolver(A: number[][], b: number[]): number[] {
  const n = b.length;
  const M = A.map((linha, i) => [...linha, b[i]]);
  for (let c = 0; c < n; c++) {
    let piv = c;
    for (let l = c + 1; l < n; l++) if (Math.abs(M[l][c]) > Math.abs(M[piv][c])) piv = l;
    if (Math.abs(M[piv][c]) < 1e-10) throw new Error('Cantos inválidos');
    [M[c], M[piv]] = [M[piv], M[c]];
    for (let l = 0; l < n; l++) {
      if (l === c) continue;
      const f = M[l][c] / M[c][c];
      for (let k = c; k <= n; k++) M[l][k] -= f * M[c][k];
    }
  }
  return M.map((linha, i) => linha[n] / linha[i]);
}

/** Matriz 3×3 (em linha) que leva `de[i]` em `para[i]`. */
export function homografia(de: Cantos, para: Cantos): number[] {
  const A: number[][] = [];
  const b: number[] = [];
  for (let i = 0; i < 4; i++) {
    const { x, y } = de[i];
    const { x: u, y: v } = para[i];
    A.push([x, y, 1, 0, 0, 0, -u * x, -u * y]);
    b.push(u);
    A.push([0, 0, 0, x, y, 1, -v * x, -v * y]);
    b.push(v);
  }
  const h = resolver(A, b);
  if (h.some((v) => !Number.isFinite(v))) throw new Error('Cantos inválidos');
  return [...h, 1];
}

export function aplicarHomografia(h: number[], p: Ponto): Ponto {
  const w = h[6] * p.x + h[7] * p.y + h[8];
  return { x: (h[0] * p.x + h[1] * p.y + h[2]) / w, y: (h[3] * p.x + h[4] * p.y + h[5]) / w };
}
```

`src/lib/imagem/cantos.ts`:

```ts
import type { Cantos, Ponto } from './tipos';

export function cantosDaImagem(img: { width: number; height: number }): Cantos {
  return [
    { x: 0, y: 0 },
    { x: img.width, y: 0 },
    { x: img.width, y: img.height },
    { x: 0, y: img.height },
  ];
}

export function ordenarCantos(pts: Ponto[]): Cantos {
  if (pts.length !== 4) throw new Error('São necessários 4 pontos');
  const porSoma = [...pts].sort((a, b) => a.x + a.y - (b.x + b.y));
  const porDiferenca = [...pts].sort((a, b) => a.x - a.y - (b.x - b.y));
  return [porSoma[0], porDiferenca[3], porSoma[3], porDiferenca[0]];
}

export function escalarCantos(c: Cantos, fator: number): Cantos {
  return c.map((p) => ({ x: p.x * fator, y: p.y * fator })) as Cantos;
}

export function distanciaMaxima(a: Cantos, b: Cantos): number {
  return Math.max(...a.map((p, i) => Math.hypot(p.x - b[i].x, p.y - b[i].y)));
}
```

- [ ] **Step 4: Implementar retificar, rotação, filtro e processar**

`src/lib/imagem/retificar.ts`:

```ts
import { cantosDaImagem } from './cantos';
import { aplicarHomografia, homografia } from './homografia';
import type { Cantos, Imagem, Ponto } from './tipos';

const dist = (a: Ponto, b: Ponto) => Math.hypot(a.x - b.x, a.y - b.y);

export function tamanhoRetificado(c: Cantos, maxLado: number): { largura: number; altura: number } {
  const largura = Math.max(dist(c[0], c[1]), dist(c[3], c[2]));
  const altura = Math.max(dist(c[0], c[3]), dist(c[1], c[2]));
  const escala = Math.min(1, maxLado / Math.max(largura, altura));
  return {
    largura: Math.max(1, Math.round(largura * escala)),
    altura: Math.max(1, Math.round(altura * escala)),
  };
}

/** Recorta o quadrilátero `cantos` e o endireita num retângulo (lado maior ≤ maxLado). */
export function retificar(img: Imagem, cantos: Cantos, maxLado: number): Imagem {
  const [a, b, c, d] = cantos;
  if (Math.min(dist(a, b), dist(d, c), dist(a, d), dist(b, c)) < 1) throw new Error('Cantos inválidos');
  const { largura, altura } = tamanhoRetificado(cantos, maxLado);
  const h = homografia(cantosDaImagem({ width: largura, height: altura }), cantos);
  const { data, width: W, height: H } = img;
  const out = new Uint8ClampedArray(largura * altura * 4);

  for (let v = 0; v < altura; v++) {
    for (let u = 0; u < largura; u++) {
      const p = aplicarHomografia(h, { x: u + 0.5, y: v + 0.5 });
      const x = Math.min(Math.max(p.x - 0.5, 0), W - 1);
      const y = Math.min(Math.max(p.y - 0.5, 0), H - 1);
      const x0 = Math.floor(x);
      const y0 = Math.floor(y);
      const x1 = Math.min(x0 + 1, W - 1);
      const y1 = Math.min(y0 + 1, H - 1);
      const fx = x - x0;
      const fy = y - y0;
      const o = (v * largura + u) * 4;
      for (let c = 0; c < 4; c++) {
        const a = data[(y0 * W + x0) * 4 + c];
        const b = data[(y0 * W + x1) * 4 + c];
        const d = data[(y1 * W + x0) * 4 + c];
        const e = data[(y1 * W + x1) * 4 + c];
        out[o + c] = (a * (1 - fx) + b * fx) * (1 - fy) + (d * (1 - fx) + e * fx) * fy;
      }
    }
  }
  return { data: out, width: largura, height: altura };
}

export function redimensionar(img: Imagem, maxLado: number): Imagem {
  return retificar(img, cantosDaImagem(img), maxLado);
}
```

`src/lib/imagem/rotacao.ts`:

```ts
import type { Imagem, Rotacao } from './tipos';

function girar90({ data, width: W, height: H }: Imagem): Imagem {
  const out = new Uint8ClampedArray(data.length);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      const o = (x * H + (H - 1 - y)) * 4;
      out[o] = data[i];
      out[o + 1] = data[i + 1];
      out[o + 2] = data[i + 2];
      out[o + 3] = data[i + 3];
    }
  }
  return { data: out, width: H, height: W };
}

/** Gira no sentido horário. */
export function rotacionar(img: Imagem, graus: Rotacao): Imagem {
  let r = img;
  for (let i = 0; i < graus / 90; i++) r = girar90(r);
  return r;
}
```

`src/lib/imagem/filtro.ts`:

```ts
import type { Imagem } from './tipos';

/** Tons de cinza com contraste esticado: o papel (percentil 90) vira branco, a tinta (percentil 2) vira preto. */
export function filtroDocumento(img: Imagem): Imagem {
  const n = img.width * img.height;
  const cinza = new Uint8Array(n);
  const hist = new Uint32Array(256);
  for (let i = 0; i < n; i++) {
    const g = Math.round(0.299 * img.data[i * 4] + 0.587 * img.data[i * 4 + 1] + 0.114 * img.data[i * 4 + 2]);
    cinza[i] = g;
    hist[g]++;
  }
  const percentil = (p: number) => {
    const alvo = n * p;
    let acumulado = 0;
    for (let v = 0; v < 256; v++) {
      acumulado += hist[v];
      if (acumulado >= alvo) return v;
    }
    return 255;
  };
  const alto = percentil(0.9);
  let baixo = percentil(0.02);
  if (alto - baixo < 40) baixo = Math.max(0, alto - 40);
  const faixa = Math.max(1, alto - baixo);

  const out = new Uint8ClampedArray(n * 4);
  for (let i = 0; i < n; i++) {
    const v = ((cinza[i] - baixo) * 255) / faixa;
    out[i * 4] = v;
    out[i * 4 + 1] = v;
    out[i * 4 + 2] = v;
    out[i * 4 + 3] = 255;
  }
  return { data: out, width: img.width, height: img.height };
}
```

`src/lib/imagem/processar.ts`:

```ts
import { filtroDocumento } from './filtro';
import { retificar } from './retificar';
import { rotacionar } from './rotacao';
import type { Cantos, Filtro, Imagem, Rotacao } from './tipos';

export function processarImagem(
  img: Imagem,
  cantos: Cantos,
  rotacao: Rotacao,
  filtro: Filtro,
  maxLado: number,
): Imagem {
  const r = rotacionar(retificar(img, cantos, maxLado), rotacao);
  return filtro === 'documento' ? filtroDocumento(r) : r;
}
```

- [ ] **Step 5: Implementar o estabilizador**

`src/lib/imagem/estabilizador.ts`:

```ts
import { distanciaMaxima } from './cantos';
import type { Cantos } from './tipos';

/**
 * Decide quando auto-capturar: contorno parado por `duracaoMs`.
 * Depois de `reiniciar()` (uma captura), só volta a disparar quando a folha
 * some do quadro ou se move além da tolerância (folha trocada).
 */
export class Estabilizador {
  private ref: Cantos | null = null;
  private desde = 0;
  private armado = true;

  constructor(
    private readonly tolerancia: number,
    private readonly duracaoMs = 1000,
  ) {}

  atualizar(cantos: Cantos | null, agora: number): boolean {
    if (!cantos) {
      this.ref = null;
      this.armado = true;
      return false;
    }
    if (!this.ref || distanciaMaxima(this.ref, cantos) > this.tolerancia) {
      if (this.ref) this.armado = true;
      this.ref = cantos;
      this.desde = agora;
      return false;
    }
    return this.armado && agora - this.desde >= this.duracaoMs;
  }

  reiniciar(): void {
    this.armado = false;
  }
}
```

- [ ] **Step 6: Rodar e ver passar**

Run: `npm test -- imagem`
Expected: todos PASS.

- [ ] **Step 7: Commit**

```bash
git add src/lib/imagem
git commit -m "feat(imagem): homografia, recorte com perspectiva, rotação, filtro e estabilizador

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Montagem e validação de PDF

**Files:**
- Create: `src/lib/envio/erro.ts`, `src/lib/pdf/layout.ts`, `src/lib/pdf/montar.ts`, `src/lib/pdf/validar.ts`
- Test: `src/lib/pdf/layout.test.ts`, `src/lib/pdf/montar.test.ts`, `src/lib/pdf/validar.test.ts`

**Interfaces:**
- Produces:
  - `class ErroEnvio extends Error` (mensagem pronta para mostrar ao usuário)
  - `A4 = { largura: 595.28, altura: 841.89 }`; `layoutPagina(largura: number, altura: number): { larguraPagina: number; alturaPagina: number; x: number; y: number; largura: number; altura: number }`
  - `type PaginaJpeg = { jpeg: Uint8Array; largura: number; altura: number }`; `montarPdf(paginas: PaginaJpeg[]): Promise<Uint8Array>`
  - `LIMITE_PDF = 20 * 1024 * 1024`; `validarPdf(bytes: Uint8Array): Promise<{ paginas: number }>` (lança `ErroEnvio`)

- [ ] **Step 1: Escrever os testes (falhando)**

`src/lib/pdf/layout.test.ts`:

```ts
import { expect, it } from 'vitest';
import { A4, layoutPagina } from './layout';

it('imagem em pé ocupa a largura de um A4 retrato', () => {
  const l = layoutPagina(1000, 1414);
  expect([l.larguraPagina, l.alturaPagina]).toEqual([A4.largura, A4.altura]);
  expect(l.largura).toBeCloseTo(A4.largura, 1);
  expect(l.x).toBeCloseTo(0, 1);
});

it('imagem deitada vira A4 paisagem, centralizada na vertical', () => {
  const l = layoutPagina(2000, 1000);
  expect([l.larguraPagina, l.alturaPagina]).toEqual([A4.altura, A4.largura]);
  expect(l.largura).toBeCloseTo(A4.altura, 2);
  expect(l.altura).toBeCloseTo(A4.altura / 2, 2);
  expect(l.y).toBeCloseTo((A4.largura - A4.altura / 2) / 2, 2);
});
```

`src/lib/pdf/montar.test.ts`:

```ts
import jpeg from 'jpeg-js';
import { PDFDocument } from 'pdf-lib';
import { expect, it } from 'vitest';
import { A4 } from './layout';
import { montarPdf, type PaginaJpeg } from './montar';

function jpegDeTeste(largura: number, altura: number): PaginaJpeg {
  const data = Buffer.alloc(largura * altura * 4, 200);
  return { jpeg: new Uint8Array(jpeg.encode({ data, width: largura, height: altura }, 70).data), largura, altura };
}

it('gera uma página A4 por imagem, respeitando a orientação e a ordem', async () => {
  const bytes = await montarPdf([jpegDeTeste(30, 40), jpegDeTeste(40, 30)]);
  const doc = await PDFDocument.load(bytes);
  expect(doc.getPageCount()).toBe(2);
  const [p1, p2] = doc.getPages().map((p) => p.getSize());
  expect([p1.width, p1.height]).toEqual([A4.largura, A4.altura]);
  expect([p2.width, p2.height]).toEqual([A4.altura, A4.largura]);
});

it('recusa lista vazia', async () => {
  await expect(montarPdf([])).rejects.toThrow('Nenhuma página');
});
```

`src/lib/pdf/validar.test.ts`:

```ts
import { PDFDocument } from 'pdf-lib';
import { expect, it } from 'vitest';
import { ErroEnvio } from '../envio/erro';
import { LIMITE_PDF, validarPdf } from './validar';

it('conta as páginas de um PDF válido', async () => {
  const doc = await PDFDocument.create();
  doc.addPage();
  doc.addPage();
  doc.addPage();
  expect(await validarPdf(await doc.save())).toEqual({ paginas: 3 });
});

it('recusa algo que não é PDF com mensagem clara', async () => {
  const lixo = new TextEncoder().encode('isto não é um pdf');
  await expect(validarPdf(lixo)).rejects.toThrow(ErroEnvio);
  await expect(validarPdf(lixo)).rejects.toThrow('Não consegui ler este PDF. Ele pode estar corrompido.');
});

it('recusa PDF truncado', async () => {
  const doc = await PDFDocument.create();
  doc.addPage();
  const bytes = await doc.save();
  await expect(validarPdf(bytes.slice(0, 40))).rejects.toThrow(ErroEnvio);
});

it('recusa acima de 20 MB sem tentar ler', async () => {
  await expect(validarPdf(new Uint8Array(LIMITE_PDF + 1))).rejects.toThrow('PDF maior que 20 MB.');
});
```

Run: `npm test -- pdf`
Expected: FAIL (módulos inexistentes).

- [ ] **Step 2: Implementar**

`src/lib/envio/erro.ts`:

```ts
/** Erro com mensagem pronta para mostrar ao usuário. */
export class ErroEnvio extends Error {}
```

`src/lib/pdf/layout.ts`:

```ts
export const A4 = { largura: 595.28, altura: 841.89 };

export function layoutPagina(largura: number, altura: number) {
  const paisagem = largura > altura;
  const larguraPagina = paisagem ? A4.altura : A4.largura;
  const alturaPagina = paisagem ? A4.largura : A4.altura;
  const escala = Math.min(larguraPagina / largura, alturaPagina / altura);
  const w = largura * escala;
  const h = altura * escala;
  return { larguraPagina, alturaPagina, x: (larguraPagina - w) / 2, y: (alturaPagina - h) / 2, largura: w, altura: h };
}
```

`src/lib/pdf/montar.ts`:

```ts
import { PDFDocument } from 'pdf-lib';
import { layoutPagina } from './layout';

export type PaginaJpeg = { jpeg: Uint8Array; largura: number; altura: number };

export async function montarPdf(paginas: PaginaJpeg[]): Promise<Uint8Array> {
  if (!paginas.length) throw new Error('Nenhuma página');
  const doc = await PDFDocument.create();
  for (const p of paginas) {
    const imagem = await doc.embedJpg(p.jpeg);
    const l = layoutPagina(p.largura, p.altura);
    doc.addPage([l.larguraPagina, l.alturaPagina]).drawImage(imagem, { x: l.x, y: l.y, width: l.largura, height: l.altura });
  }
  return doc.save();
}
```

`src/lib/pdf/validar.ts`:

```ts
import { PDFDocument } from 'pdf-lib';
import { ErroEnvio } from '../envio/erro';

export const LIMITE_PDF = 20 * 1024 * 1024;

export async function validarPdf(bytes: Uint8Array): Promise<{ paginas: number }> {
  if (bytes.byteLength > LIMITE_PDF) throw new ErroEnvio('PDF maior que 20 MB.');
  let paginas = 0;
  try {
    const doc = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
    paginas = doc.getPageCount();
  } catch {
    paginas = 0;
  }
  if (paginas < 1) throw new ErroEnvio('Não consegui ler este PDF. Ele pode estar corrompido.');
  return { paginas };
}
```

- [ ] **Step 3: Rodar e ver passar**

Run: `npm test -- pdf`
Expected: todos PASS.

- [ ] **Step 4: Commit**

```bash
git add src/lib/pdf src/lib/envio
git commit -m "feat(pdf): montagem A4 a partir de JPEGs e validação de PDF enviado

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: Fila de envio resiliente

**Files:**
- Create: `src/lib/fila/fila.ts`, `src/lib/fila/processar.ts`, `src/lib/fila/enviar.ts`, `src/lib/fila/useFila.ts`, `src/components/fila/StatusFila.tsx`
- Modify: `src/app/(app)/layout.tsx` (inclui `<StatusFila />`)
- Test: `src/lib/fila/fila.test.ts`, `src/lib/fila/processar.test.ts`, `tests/integration/enviar.test.ts`

**Interfaces:**
- Consumes: `BUCKET`, `caminhoPdf`, `caminhoMiniatura` (Task 5), `clienteNavegador`, `Confirmar`.
- Produces:
  - `type Destino = { alunoId: string; atividadeId: string | null; titulo: string }`
  - `type ItemFila = Destino & { id: string; paginas: number; pdf: Uint8Array; miniatura: Uint8Array | null; criadoEm: number; tentativas: number; ultimoErro: string | null }`
  - `interface Fila { adicionar(item): Promise<void>; listar(): Promise<ItemFila[]>; remover(id): Promise<void>; registrarFalha(id, mensagem): Promise<void> }`
  - `abrirFila(nomeBanco?: string): Promise<Fila>`; `novoItem(destino: Destino, pdf: Uint8Array, miniatura: Uint8Array | null, paginas: number): ItemFila`
  - `type Enviar = (item: ItemFila) => Promise<void>`; `processarFila(fila: Fila, enviar: Enviar, aoMudar?: () => void): Promise<{ enviados: number; falhas: number }>`
  - `criarEnviar(sb: SupabaseClient): Enviar` (idempotente: reenviar o mesmo `id` não duplica)
  - Hook e funções de navegador: `useFila(): { itens: ItemFila[]; processar(): Promise<void>; descartar(id: string): Promise<void> }`; `enfileirar(item: ItemFila): Promise<void>`; `processarAgora(): Promise<void>`

- [ ] **Step 1: Testes da fila e do processamento (falhando)**

`src/lib/fila/fila.test.ts`:

```ts
import 'fake-indexeddb/auto';
import { expect, it } from 'vitest';
import { abrirFila, novoItem } from './fila';

const destino = { alunoId: 'al', atividadeId: null, titulo: 'T' };
const banco = () => `teste-${crypto.randomUUID()}`;

it('guarda e lista em ordem de criação, preservando os bytes', async () => {
  const fila = await abrirFila(banco());
  const a = { ...novoItem(destino, new Uint8Array([1, 2, 3]), null, 1), criadoEm: 2 };
  const b = { ...novoItem(destino, new Uint8Array([9]), new Uint8Array([7]), 2), criadoEm: 1 };
  await fila.adicionar(a);
  await fila.adicionar(b);
  const itens = await fila.listar();
  expect(itens.map((i) => i.id)).toEqual([b.id, a.id]);
  expect(Array.from(itens[1].pdf)).toEqual([1, 2, 3]);
  expect(Array.from(itens[0].miniatura!)).toEqual([7]);
});

it('registra falha e remove', async () => {
  const fila = await abrirFila(banco());
  const item = novoItem(destino, new Uint8Array([1]), null, 1);
  await fila.adicionar(item);
  await fila.registrarFalha(item.id, 'sem rede');
  expect((await fila.listar())[0]).toMatchObject({ tentativas: 1, ultimoErro: 'sem rede' });
  await fila.remover(item.id);
  expect(await fila.listar()).toEqual([]);
});

it('novoItem gera id único e começa sem tentativas', () => {
  const a = novoItem(destino, new Uint8Array(), null, 1);
  const b = novoItem(destino, new Uint8Array(), null, 1);
  expect(a.id).not.toBe(b.id);
  expect(a).toMatchObject({ ...destino, paginas: 1, tentativas: 0, ultimoErro: null });
});
```

`src/lib/fila/processar.test.ts`:

```ts
import 'fake-indexeddb/auto';
import { expect, it, vi } from 'vitest';
import { abrirFila, novoItem } from './fila';
import { processarFila } from './processar';

it('remove só o que foi enviado e mantém o que falhou com o erro', async () => {
  const fila = await abrirFila(`teste-${crypto.randomUUID()}`);
  const ok = { ...novoItem({ alunoId: 'a', atividadeId: null, titulo: 'ok' }, new Uint8Array([1]), null, 1), criadoEm: 1 };
  const ruim = { ...novoItem({ alunoId: 'b', atividadeId: null, titulo: 'ruim' }, new Uint8Array([2]), null, 1), criadoEm: 2 };
  await fila.adicionar(ok);
  await fila.adicionar(ruim);
  const aoMudar = vi.fn();

  const r = await processarFila(
    fila,
    async (item) => {
      if (item.titulo === 'ruim') throw new Error('Failed to fetch');
    },
    aoMudar,
  );

  expect(r).toEqual({ enviados: 1, falhas: 1 });
  const restantes = await fila.listar();
  expect(restantes.map((i) => i.titulo)).toEqual(['ruim']);
  expect(restantes[0]).toMatchObject({ tentativas: 1, ultimoErro: 'Failed to fetch' });
  expect(aoMudar).toHaveBeenCalledTimes(2);
});
```

Run: `npm test -- fila`
Expected: FAIL (módulos inexistentes).

- [ ] **Step 2: Implementar fila e processamento**

`src/lib/fila/fila.ts`:

```ts
import { openDB } from 'idb';

export type Destino = { alunoId: string; atividadeId: string | null; titulo: string };

export type ItemFila = Destino & {
  id: string;
  paginas: number;
  pdf: Uint8Array;
  miniatura: Uint8Array | null;
  criadoEm: number;
  tentativas: number;
  ultimoErro: string | null;
};

export interface Fila {
  adicionar(item: ItemFila): Promise<void>;
  listar(): Promise<ItemFila[]>;
  remover(id: string): Promise<void>;
  registrarFalha(id: string, mensagem: string): Promise<void>;
}

const STORE = 'fila';

export async function abrirFila(nomeBanco = 'organizador'): Promise<Fila> {
  const db = await openDB(nomeBanco, 1, {
    upgrade(d) {
      d.createObjectStore(STORE, { keyPath: 'id' });
    },
  });
  return {
    async adicionar(item) {
      await db.put(STORE, item);
    },
    async listar() {
      const itens = (await db.getAll(STORE)) as ItemFila[];
      return itens.sort((a, b) => a.criadoEm - b.criadoEm);
    },
    async remover(id) {
      await db.delete(STORE, id);
    },
    async registrarFalha(id, mensagem) {
      const tx = db.transaction(STORE, 'readwrite');
      const item = (await tx.store.get(id)) as ItemFila | undefined;
      if (item) await tx.store.put({ ...item, tentativas: item.tentativas + 1, ultimoErro: mensagem });
      await tx.done;
    },
  };
}

export function novoItem(destino: Destino, pdf: Uint8Array, miniatura: Uint8Array | null, paginas: number): ItemFila {
  return { ...destino, id: crypto.randomUUID(), paginas, pdf, miniatura, criadoEm: Date.now(), tentativas: 0, ultimoErro: null };
}
```

`src/lib/fila/processar.ts`:

```ts
import type { Fila, ItemFila } from './fila';

export type Enviar = (item: ItemFila) => Promise<void>;

/** Envia cada item; só remove da fila o que o servidor confirmou. */
export async function processarFila(fila: Fila, enviar: Enviar, aoMudar?: () => void) {
  let enviados = 0;
  let falhas = 0;
  for (const item of await fila.listar()) {
    try {
      await enviar(item);
      await fila.remover(item.id);
      enviados++;
    } catch (e) {
      await fila.registrarFalha(item.id, e instanceof Error ? e.message : String(e));
      falhas++;
    }
    aoMudar?.();
  }
  return { enviados, falhas };
}
```

Run: `npm test -- fila`
Expected: PASS.

- [ ] **Step 3: Teste de integração do envio (falhando)**

`tests/integration/enviar.test.ts`:

```ts
import type { SupabaseClient } from '@supabase/supabase-js';
import { beforeAll, beforeEach, expect, it } from 'vitest';
import { listarArquivosDoAluno } from '@/lib/dados/arquivos';
import { BUCKET } from '@/lib/dados/storage';
import { criarEnviar } from '@/lib/fila/enviar';
import { novoItem } from '@/lib/fila/fila';
import { clienteLogado, limparTudo, pdfDeTeste, semear } from '../compartilhado/supabase';

let sb: SupabaseClient;
beforeAll(async () => {
  sb = await clienteLogado();
});
beforeEach(async () => {
  await limparTudo();
});

it('envia PDF e miniatura e grava a linha', async () => {
  const s = await semear(sb);
  const pdf = await pdfDeTeste(2);
  const item = novoItem({ alunoId: s.alunos.maria, atividadeId: s.atividadeId, titulo: 'Prova 1' }, pdf, new Uint8Array([0xff, 0xd8, 0xff]), 2);
  await criarEnviar(sb)(item);
  const [arq] = await listarArquivosDoAluno(sb, s.alunos.maria);
  expect(arq).toMatchObject({
    id: item.id,
    titulo: 'Prova 1',
    atividade_id: s.atividadeId,
    paginas: 2,
    tem_miniatura: true,
    tamanho_bytes: pdf.byteLength + 3,
    storage_path: `${s.alunos.maria}/${item.id}.pdf`,
  });
  const baixado = await sb.storage.from(BUCKET).download(arq.storage_path);
  expect(baixado.error).toBeNull();
});

it('reenviar o mesmo item não duplica nem falha', async () => {
  const s = await semear(sb);
  const item = novoItem({ alunoId: s.alunos.maria, atividadeId: null, titulo: 'X' }, await pdfDeTeste(), null, 1);
  const enviar = criarEnviar(sb);
  await enviar(item);
  await enviar(item);
  expect(await listarArquivosDoAluno(sb, s.alunos.maria)).toHaveLength(1);
});

it('se o banco recusa, apaga o objeto enviado e lança erro', async () => {
  const fantasma = crypto.randomUUID();
  const item = novoItem({ alunoId: fantasma, atividadeId: null, titulo: 'X' }, await pdfDeTeste(), null, 1);
  await expect(criarEnviar(sb)(item)).rejects.toThrow();
  const baixado = await sb.storage.from(BUCKET).download(`${fantasma}/${item.id}.pdf`);
  expect(baixado.error).not.toBeNull();
});
```

Run: `npm run test:int -- enviar`
Expected: FAIL (módulo `@/lib/fila/enviar` inexistente).

- [ ] **Step 4: Implementar o envio**

`src/lib/fila/enviar.ts`:

```ts
import type { SupabaseClient } from '@supabase/supabase-js';
import { BUCKET, caminhoMiniatura, caminhoPdf } from '../dados/storage';
import type { ItemFila } from './fila';
import type { Enviar } from './processar';

/**
 * Idempotente: usa o id do item como id do arquivo, faz upsert no Storage
 * e trata "linha já existe" (23505) como sucesso.
 */
export function criarEnviar(sb: SupabaseClient): Enviar {
  return async (item: ItemFila) => {
    const bucket = sb.storage.from(BUCKET);
    const caminho = caminhoPdf(item.alunoId, item.id);
    const caminhos = [caminho];

    const pdf = await bucket.upload(caminho, item.pdf, { contentType: 'application/pdf', upsert: true });
    if (pdf.error) throw new Error(pdf.error.message);

    if (item.miniatura) {
      const thumb = caminhoMiniatura(caminho);
      const r = await bucket.upload(thumb, item.miniatura, { contentType: 'image/jpeg', upsert: true });
      if (r.error) throw new Error(r.error.message);
      caminhos.push(thumb);
    }

    const { error } = await sb.from('arquivos').insert({
      id: item.id,
      aluno_id: item.alunoId,
      atividade_id: item.atividadeId,
      titulo: item.titulo,
      storage_path: caminho,
      paginas: item.paginas,
      tamanho_bytes: item.pdf.byteLength + (item.miniatura?.byteLength ?? 0),
      tem_miniatura: !!item.miniatura,
    });
    if (!error || error.code === '23505') return;

    await bucket.remove(caminhos);
    throw new Error(error.code === '23503' ? 'O aluno ou a atividade foi apagado.' : error.message);
  };
}
```

Run: `npm run test:int -- enviar`
Expected: 3 PASS.

- [ ] **Step 5: Hook da fila e aviso de pendentes**

`src/lib/fila/useFila.ts`:

```ts
'use client';

import { useEffect, useState } from 'react';
import { clienteNavegador } from '../supabase/navegador';
import { criarEnviar } from './enviar';
import { abrirFila, type Fila, type ItemFila } from './fila';
import { processarFila } from './processar';

const EVENTO = 'fila-mudou';
let filaPromessa: Promise<Fila> | null = null;
let processando: Promise<void> | null = null;

function obterFila(): Promise<Fila> {
  filaPromessa ??= abrirFila();
  return filaPromessa;
}

function avisar() {
  window.dispatchEvent(new Event(EVENTO));
}

export function processarAgora(): Promise<void> {
  processando ??= (async () => {
    try {
      await processarFila(await obterFila(), criarEnviar(clienteNavegador()), avisar);
    } finally {
      processando = null;
      avisar();
    }
  })();
  return processando;
}

export async function enfileirar(item: ItemFila): Promise<void> {
  await (await obterFila()).adicionar(item);
  avisar();
  void processarAgora();
}

export function useFila() {
  const [itens, setItens] = useState<ItemFila[]>([]);

  useEffect(() => {
    let vivo = true;
    const atualizar = async () => {
      const lista = await (await obterFila()).listar();
      if (vivo) setItens(lista);
    };
    const online = () => void processarAgora();
    void atualizar();
    void processarAgora();
    window.addEventListener(EVENTO, atualizar);
    window.addEventListener('online', online);
    return () => {
      vivo = false;
      window.removeEventListener(EVENTO, atualizar);
      window.removeEventListener('online', online);
    };
  }, []);

  return {
    itens,
    processar: processarAgora,
    descartar: async (id: string) => {
      await (await obterFila()).remover(id);
      avisar();
    },
  };
}
```

`src/components/fila/StatusFila.tsx`:

```tsx
'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { Confirmar } from '@/components/ui/Confirmar';
import type { ItemFila } from '@/lib/fila/fila';
import { useFila } from '@/lib/fila/useFila';

export function StatusFila() {
  const router = useRouter();
  const { itens, processar, descartar } = useFila();
  const anterior = useRef(0);
  const [descartando, setDescartando] = useState<ItemFila | null>(null);

  // Quando algo termina de subir, recarrega os dados da página atual.
  useEffect(() => {
    if (itens.length < anterior.current) router.refresh();
    anterior.current = itens.length;
  }, [itens.length, router]);

  if (!itens.length) return null;

  return (
    <div role="status" className="border-b bg-amber-50 px-4 py-2 text-sm">
      <div className="flex items-center justify-between">
        <span>{itens.length} envio(s) pendente(s)</span>
        <button onClick={() => void processar()} className="text-blue-700">Tentar de novo</button>
      </div>
      <ul className="mt-1 space-y-1">
        {itens.map((i) => (
          <li key={i.id} className="flex justify-between gap-2">
            <span className="min-w-0 truncate">
              {i.titulo}
              {i.ultimoErro && <span className="text-red-600"> — {i.ultimoErro}</span>}
            </span>
            <button onClick={() => setDescartando(i)} className="text-red-600">Descartar</button>
          </li>
        ))}
      </ul>
      {descartando && (
        <Confirmar
          titulo="Descartar envio?"
          mensagem={`“${descartando.titulo}” ainda não foi enviado e será perdido.`}
          textoConfirmar="Descartar"
          onCancelar={() => setDescartando(null)}
          onConfirmar={async () => {
            await descartar(descartando.id);
            setDescartando(null);
          }}
        />
      )}
    </div>
  );
}
```

Em `src/app/(app)/layout.tsx`, importe `StatusFila` de `@/components/fila/StatusFila` e coloque `<StatusFila />` entre o `</header>` e o `<main>`.

- [ ] **Step 6: Rodar tudo**

Run: `npm test && npm run test:int && npm run build`
Expected: todos PASS; build sem erros.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(fila): fila no IndexedDB com envio idempotente e aviso de pendentes

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 11: Enviar arquivo pronto (PDF ou imagens)

**Files:**
- Create: `src/lib/imagem/navegador.ts`, `src/lib/pdf/miniatura.ts`, `src/lib/envio/classificar.ts`, `src/lib/envio/montar.ts`, `src/components/envio/EscolherDestino.tsx`, `src/components/envio/EnviarArquivos.tsx`, `src/app/(app)/alunos/[alunoId]/enviar/page.tsx`, `tests/e2e/envio.spec.ts`
- Test: `src/lib/envio/classificar.test.ts`

**Interfaces:**
- Consumes: `processarImagem`, `redimensionar`, `Pagina`, `Imagem`, `Filtro` (Task 8); `montarPdf`, `PaginaJpeg`, `validarPdf`, `ErroEnvio` (Task 9); `novoItem`, `Destino`, `ItemFila`, `enfileirar` (Task 10); `tituloPadrao`, `limparNome`.
- Produces:
  - `navegador.ts` (só no navegador): `blobParaImagem(blob: Blob, maxLado: number): Promise<Imagem>`; `imagemParaCanvas(img: Imagem): HTMLCanvasElement`; `imagemParaJpeg(img: Imagem, qualidade: number): Promise<Uint8Array>`; `processarPagina(p: Pagina, filtro: Filtro, maxLado: number): Promise<Imagem>`
  - `miniaturaDePdf(bytes: Uint8Array): Promise<Uint8Array | null>`
  - `type Classificacao = { tipo: 'pdf'; arquivo: File } | { tipo: 'imagens'; arquivos: File[] }`; `classificarArquivos(arquivos: File[]): Classificacao` (lança `ErroEnvio`)
  - `itemDeImagens(gerar: Array<() => Promise<Imagem>>, destino: Destino): Promise<ItemFila>`; `itemDePdf(bytes: Uint8Array, destino: Destino): Promise<ItemFila>`
  - `<EscolherDestino atividades textoBotao ocupado onConfirmar={(d: { atividadeId: string | null; titulo: string }) => void} />`
  - `<EnviarArquivos aluno={{ id, nome }} atividades arquivosIniciais? voltarPara aoEnfileirar?={() => Promise<void>} />`

- [ ] **Step 1: Teste da classificação (falhando)**

`src/lib/envio/classificar.test.ts`:

```ts
import { expect, it } from 'vitest';
import { classificarArquivos } from './classificar';

const arquivo = (nome: string, tipo: string) => new File([new Uint8Array([1])], nome, { type: tipo });

it('um PDF', () => {
  const pdf = arquivo('a.pdf', 'application/pdf');
  expect(classificarArquivos([pdf])).toEqual({ tipo: 'pdf', arquivo: pdf });
});

it('várias imagens, inclusive HEIC sem tipo', () => {
  const lista = [arquivo('1.jpg', 'image/jpeg'), arquivo('2.HEIC', '')];
  expect(classificarArquivos(lista)).toEqual({ tipo: 'imagens', arquivos: lista });
});

it('mensagens claras para combinações inválidas', () => {
  expect(() => classificarArquivos([])).toThrow('Escolha um arquivo.');
  expect(() => classificarArquivos([arquivo('a.pdf', 'application/pdf'), arquivo('b.jpg', 'image/jpeg')])).toThrow(
    'Envie 1 PDF por vez, ou só imagens.',
  );
  expect(() => classificarArquivos([arquivo('a.docx', 'application/msword')])).toThrow(
    'Tipo de arquivo não suportado. Use PDF ou imagens.',
  );
});
```

Run: `npm test -- classificar` → Expected: FAIL.

- [ ] **Step 2: Implementar classificação**

`src/lib/envio/classificar.ts`:

```ts
import { ErroEnvio } from './erro';

export type Classificacao = { tipo: 'pdf'; arquivo: File } | { tipo: 'imagens'; arquivos: File[] };

const ehPdf = (f: File) => f.type === 'application/pdf' || /\.pdf$/i.test(f.name);
const ehImagem = (f: File) => f.type.startsWith('image/') || /\.(jpe?g|png|webp|heic|heif)$/i.test(f.name);

export function classificarArquivos(arquivos: File[]): Classificacao {
  if (!arquivos.length) throw new ErroEnvio('Escolha um arquivo.');
  if (arquivos.some(ehPdf)) {
    if (arquivos.length > 1) throw new ErroEnvio('Envie 1 PDF por vez, ou só imagens.');
    return { tipo: 'pdf', arquivo: arquivos[0] };
  }
  if (arquivos.every(ehImagem)) return { tipo: 'imagens', arquivos };
  throw new ErroEnvio('Tipo de arquivo não suportado. Use PDF ou imagens.');
}
```

Run: `npm test -- classificar` → Expected: PASS.

- [ ] **Step 3: Helpers de navegador, miniatura de PDF e montagem do item**

`src/lib/imagem/navegador.ts`:

```ts
import { ErroEnvio } from '../envio/erro';
import { processarImagem } from './processar';
import type { Filtro, Imagem, Pagina } from './tipos';

/** Decodifica (inclui HEIC no Safari e respeita a orientação EXIF) e reduz para lado maior ≤ maxLado. */
export async function blobParaImagem(blob: Blob, maxLado: number): Promise<Imagem> {
  const url = URL.createObjectURL(blob);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const escala = Math.min(1, maxLado / Math.max(img.naturalWidth, img.naturalHeight));
    const w = Math.max(1, Math.round(img.naturalWidth * escala));
    const h = Math.max(1, Math.round(img.naturalHeight * escala));
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(img, 0, 0, w, h);
    return ctx.getImageData(0, 0, w, h);
  } catch {
    throw new ErroEnvio('Não consegui abrir esta imagem.');
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function imagemParaCanvas(img: Imagem): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  canvas.getContext('2d')!.putImageData(new ImageData(img.data as Uint8ClampedArray<ArrayBuffer>, img.width, img.height), 0, 0);
  return canvas;
}

export async function imagemParaJpeg(img: Imagem, qualidade: number): Promise<Uint8Array> {
  const blob = await new Promise<Blob | null>((r) => imagemParaCanvas(img).toBlob(r, 'image/jpeg', qualidade));
  if (!blob) throw new Error('Falha ao gerar JPEG');
  return new Uint8Array(await blob.arrayBuffer());
}

export async function processarPagina(p: Pagina, filtro: Filtro, maxLado: number): Promise<Imagem> {
  const img = await blobParaImagem(p.fonte, Infinity);
  return processarImagem(img, p.cantos, p.rotacao, filtro, maxLado);
}
```

`src/lib/pdf/miniatura.ts`:

```ts
/** Renderiza a 1ª página como JPEG de ~300 px. Devolve null se não conseguir (a UI mostra ícone genérico). */
export async function miniaturaDePdf(bytes: Uint8Array): Promise<Uint8Array | null> {
  try {
    const pdfjs = await import('pdfjs-dist');
    pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();
    const doc = await pdfjs.getDocument({ data: bytes.slice() }).promise;
    const pagina = await doc.getPage(1);
    const base = pagina.getViewport({ scale: 1 });
    const viewport = pagina.getViewport({ scale: 300 / Math.max(base.width, base.height) });
    const canvas = document.createElement('canvas');
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    await pagina.render({ canvas, canvasContext: canvas.getContext('2d')!, viewport }).promise;
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/jpeg', 0.7));
    await doc.destroy();
    return blob ? new Uint8Array(await blob.arrayBuffer()) : null;
  } catch {
    return null;
  }
}
```

`src/lib/envio/montar.ts`:

```ts
import { novoItem, type Destino, type ItemFila } from '../fila/fila';
import { imagemParaJpeg } from '../imagem/navegador';
import { redimensionar } from '../imagem/retificar';
import type { Imagem } from '../imagem/tipos';
import { miniaturaDePdf } from '../pdf/miniatura';
import { montarPdf, type PaginaJpeg } from '../pdf/montar';
import { validarPdf } from '../pdf/validar';

/** Gera uma página por vez (evita guardar todas as imagens grandes na memória). */
export async function itemDeImagens(gerar: Array<() => Promise<Imagem>>, destino: Destino): Promise<ItemFila> {
  const paginas: PaginaJpeg[] = [];
  let miniatura: Uint8Array | null = null;
  for (const [i, gerarPagina] of gerar.entries()) {
    const img = await gerarPagina();
    paginas.push({ jpeg: await imagemParaJpeg(img, 0.7), largura: img.width, altura: img.height });
    if (i === 0) miniatura = await imagemParaJpeg(redimensionar(img, 300), 0.7);
  }
  return novoItem(destino, await montarPdf(paginas), miniatura, paginas.length);
}

export async function itemDePdf(bytes: Uint8Array, destino: Destino): Promise<ItemFila> {
  const { paginas } = await validarPdf(bytes);
  return novoItem(destino, bytes, await miniaturaDePdf(bytes), paginas);
}
```

- [ ] **Step 4: Escrever o E2E (falhando)**

`tests/e2e/envio.spec.ts`:

```ts
import { expect, test } from '@playwright/test';
import jpeg from 'jpeg-js';
import { clienteLogado, limparTudo, pdfDeTeste, semear, type Semente } from '../compartilhado/supabase';
import { entrar } from './ajuda';

let s: Semente;
test.beforeEach(async ({ page }) => {
  await limparTudo();
  s = await semear(await clienteLogado());
  await entrar(page);
  await page.goto(`/alunos/${s.alunos.maria}`);
  await page.getByRole('link', { name: 'Enviar arquivo' }).click();
});

const imagemJpeg = (w: number, h: number) =>
  Buffer.from(jpeg.encode({ data: Buffer.alloc(w * h * 4, 220), width: w, height: h }, 80).data);

test('PDF vai para a atividade escolhida', async ({ page }) => {
  await page.getByLabel(/Arquivos/).setInputFiles({ name: 'prova.pdf', mimeType: 'application/pdf', buffer: Buffer.from(await pdfDeTeste(2)) });
  await page.getByLabel('Atividade').selectOption({ label: 'Prova 1' });
  await page.getByRole('button', { name: 'Enviar' }).click();
  await expect(page).toHaveURL(`/alunos/${s.alunos.maria}`);
  await expect(page.getByTestId('arquivo')).toContainText('2 página(s)', { timeout: 20_000 });
  await expect(page.getByRole('heading', { name: 'Prova 1' })).toBeVisible();
});

test('várias imagens viram um PDF com título livre', async ({ page }) => {
  await page.getByLabel(/Arquivos/).setInputFiles([
    { name: 'p1.jpg', mimeType: 'image/jpeg', buffer: imagemJpeg(60, 80) },
    { name: 'p2.jpg', mimeType: 'image/jpeg', buffer: imagemJpeg(80, 60) },
  ]);
  await page.getByLabel('Atividade').selectOption({ label: 'Sem atividade (título livre)' });
  await page.getByLabel('Título').fill('Desenho');
  await page.getByRole('button', { name: 'Enviar' }).click();
  await expect(page.getByTestId('arquivo')).toContainText('Desenho', { timeout: 20_000 });
  await expect(page.getByTestId('arquivo')).toContainText('2 página(s)');
  await expect(page.getByRole('heading', { name: 'Outros' })).toBeVisible();
});

test('PDF corrompido mostra erro e não entra na fila', async ({ page }) => {
  await page.getByLabel(/Arquivos/).setInputFiles({ name: 'quebrado.pdf', mimeType: 'application/pdf', buffer: Buffer.from('não sou pdf') });
  await page.getByRole('button', { name: 'Enviar' }).click();
  await expect(page.getByRole('alert')).toHaveText('Não consegui ler este PDF. Ele pode estar corrompido.');
  await expect(page.getByText(/envio\(s\) pendente/)).toHaveCount(0);
});
```

Run: `npm run test:e2e -- envio.spec.ts`
Expected: FAIL (link "Enviar arquivo" leva a 404).

- [ ] **Step 5: Componentes e página**

`src/components/envio/EscolherDestino.tsx`:

```tsx
'use client';

import { useState, type FormEvent } from 'react';
import { tituloPadrao } from '@/lib/dominio/formato';
import { limparNome } from '@/lib/dominio/nomes';
import type { Atividade } from '@/lib/tipos';

type Props = {
  atividades: Atividade[];
  textoBotao: string;
  ocupado: boolean;
  onConfirmar: (d: { atividadeId: string | null; titulo: string }) => void;
};

export function EscolherDestino({ atividades, textoBotao, ocupado, onConfirmar }: Props) {
  const [atividadeId, setAtividadeId] = useState(atividades[0]?.id ?? '');
  const [titulo, setTitulo] = useState(() => tituloPadrao(new Date()));

  function confirmar(e: FormEvent) {
    e.preventDefault();
    const atividade = atividades.find((a) => a.id === atividadeId);
    onConfirmar(
      atividade
        ? { atividadeId: atividade.id, titulo: atividade.nome }
        : { atividadeId: null, titulo: limparNome(titulo) || tituloPadrao(new Date()) },
    );
  }

  return (
    <form onSubmit={confirmar} className="space-y-3">
      <label className="block text-sm">
        Atividade
        <select value={atividadeId} onChange={(e) => setAtividadeId(e.target.value)} className="mt-1 w-full rounded border bg-white px-3 py-2">
          {atividades.map((a) => <option key={a.id} value={a.id}>{a.nome}</option>)}
          <option value="">Sem atividade (título livre)</option>
        </select>
      </label>
      {!atividadeId && (
        <label className="block text-sm">
          Título
          <input value={titulo} onChange={(e) => setTitulo(e.target.value)} className="mt-1 w-full rounded border px-3 py-2" />
        </label>
      )}
      <button disabled={ocupado} className="w-full rounded bg-blue-700 py-3 text-white disabled:opacity-50">
        {ocupado ? 'Preparando…' : textoBotao}
      </button>
    </form>
  );
}
```

`src/components/envio/EnviarArquivos.tsx`:

```tsx
'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { classificarArquivos } from '@/lib/envio/classificar';
import { ErroEnvio } from '@/lib/envio/erro';
import { itemDeImagens, itemDePdf } from '@/lib/envio/montar';
import { enfileirar } from '@/lib/fila/useFila';
import { blobParaImagem } from '@/lib/imagem/navegador';
import type { Atividade } from '@/lib/tipos';
import { EscolherDestino } from './EscolherDestino';

type Props = {
  aluno: { id: string; nome: string };
  atividades: Atividade[];
  arquivosIniciais?: File[];
  voltarPara: string;
  aoEnfileirar?: () => Promise<void>;
};

export function EnviarArquivos({ aluno, atividades, arquivosIniciais = [], voltarPara, aoEnfileirar }: Props) {
  const router = useRouter();
  const [arquivos, setArquivos] = useState<File[]>(arquivosIniciais);
  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  async function enviar(d: { atividadeId: string | null; titulo: string }) {
    setErro(null);
    setOcupado(true);
    try {
      const c = classificarArquivos(arquivos);
      const destino = { alunoId: aluno.id, ...d };
      const item =
        c.tipo === 'pdf'
          ? await itemDePdf(new Uint8Array(await c.arquivo.arrayBuffer()), destino)
          : await itemDeImagens(c.arquivos.map((f) => () => blobParaImagem(f, 1600)), destino);
      await enfileirar(item);
      await aoEnfileirar?.();
      router.push(voltarPara);
      router.refresh();
    } catch (e) {
      setErro(e instanceof ErroEnvio ? e.message : 'Erro inesperado ao preparar o envio.');
    } finally {
      setOcupado(false);
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Enviar arquivo para {aluno.nome}</h1>
      <label className="block text-sm">
        Arquivos (1 PDF ou várias imagens)
        <input
          type="file"
          multiple
          accept="application/pdf,image/*,.heic,.heif"
          onChange={(e) => {
            setArquivos(Array.from(e.target.files ?? []));
            setErro(null);
          }}
          className="mt-1 block w-full"
        />
      </label>
      {arquivos.length > 0 && (
        <ul className="text-sm text-gray-700">{arquivos.map((f, i) => <li key={i}>{f.name}</li>)}</ul>
      )}
      {erro && <p role="alert" className="text-sm text-red-600">{erro}</p>}
      <EscolherDestino atividades={atividades} textoBotao="Enviar" ocupado={ocupado} onConfirmar={enviar} />
    </div>
  );
}
```

`src/app/(app)/alunos/[alunoId]/enviar/page.tsx`:

```tsx
import Link from 'next/link';
import { EnviarArquivos } from '@/components/envio/EnviarArquivos';
import { obterAluno } from '@/lib/dados/alunos';
import { listarAtividades } from '@/lib/dados/atividades';
import { clienteServidor } from '@/lib/supabase/servidor';

export default async function PaginaEnviar({ params }: { params: Promise<{ alunoId: string }> }) {
  const { alunoId } = await params;
  const sb = await clienteServidor();
  const aluno = await obterAluno(sb, alunoId);
  const atividades = await listarAtividades(sb, aluno.turma_id);
  return (
    <div className="space-y-4">
      <nav className="text-sm"><Link href={`/alunos/${alunoId}`}>← {aluno.nome}</Link></nav>
      <EnviarArquivos aluno={{ id: aluno.id, nome: aluno.nome }} atividades={atividades} voltarPara={`/alunos/${alunoId}`} />
    </div>
  );
}
```

- [ ] **Step 6: Rodar e ver passar**

Run: `npm test && npm run test:e2e -- envio.spec.ts`
Expected: unitários PASS; 3 E2E passed.

Se a miniatura do PDF não aparecer no navegador (worker do pdf.js não carregou com o bundler), o card mostra "PDF" e o teste ainda passa. Nesse caso, verifique no console se aparece `Setting up fake worker` e confira se `pdfjs-dist/build/pdf.worker.min.mjs` existe na versão instalada.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(envio): enviar PDF ou imagens para a pasta do aluno pela fila

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 12: Scanner com câmera, recorte automático e modo lote

**Files:**
- Create: `public/opencv/opencv.js` (download), `src/lib/imagem/opencv.ts`, `src/components/scanner/Camera.tsx`, `src/components/scanner/EditorCantos.tsx`, `src/components/scanner/Revisao.tsx`, `src/components/scanner/SeletorAluno.tsx`, `src/components/scanner/Scanner.tsx`, `src/components/lote/EscolherLote.tsx`, `src/app/(app)/alunos/[alunoId]/escanear/page.tsx`, `src/app/(app)/lote/page.tsx`, `src/app/(app)/lote/[atividadeId]/page.tsx`, `tests/e2e/fixtures/gerarFolha.ts`, `tests/e2e/scanner.spec.ts`
- Modify: `playwright.config.ts` (câmera falsa), `tests/e2e/global-setup.ts` (gera o vídeo)

**Interfaces:**
- Consumes: `Pagina`, `Cantos`, `Filtro`, `Rotacao` (Task 8); `ordenarCantos`, `escalarCantos`, `cantosDaImagem`, `Estabilizador`; `processarPagina`, `imagemParaJpeg` (Task 11); `itemDeImagens`; `enfileirar`, `useFila`; `idsEntregues`, `normalizar`; `EscolherDestino`, `FormNome`; `listarTurmas`, `listarAtividades`, `criarAtividade`, `obterAtividade`, `listarAlunos`, `alunosComEntrega`, `obterAluno`, `listarAnos`; `hojeIso`.
- Produces:
  - `type OpenCV = any`; `carregarOpenCV(src?: string, timeoutMs?: number): Promise<{ cv: OpenCV } | null>`; `detectarCantos(cv: OpenCV, canvas: HTMLCanvasElement): Cantos | null`
  - `<Scanner modo="avulso" aluno atividades />` e `<Scanner modo="lote" atividade alunos entreguesNoBanco />`
  - Camada de teste: `<canvas data-detectado="sim|nao">` sobre o vídeo; botão com `aria-label="Capturar"`.

- [ ] **Step 1: Baixar o OpenCV.js**

```bash
mkdir -p public/opencv
curl -fL https://docs.opencv.org/4.10.0/opencv.js -o public/opencv/opencv.js
ls -lh public/opencv/opencv.js
```

Expected: arquivo de ~8–11 MB.

- [ ] **Step 2: Vídeo falso para a câmera nos testes**

`tests/e2e/fixtures/gerarFolha.ts`:

```ts
import { writeFileSync } from 'node:fs';

const W = 640;
const H = 480;
// Folha levemente inclinada (sup-esq, sup-dir, inf-dir, inf-esq), clara sobre fundo escuro.
const quad = [[180, 70], [470, 50], [500, 430], [150, 410]];

function dentro(x: number, y: number): boolean {
  for (let i = 0; i < 4; i++) {
    const [ax, ay] = quad[i];
    const [bx, by] = quad[(i + 1) % 4];
    if ((bx - ax) * (y - ay) - (by - ay) * (x - ax) < 0) return false;
  }
  return true;
}

/** Grava um quadro Y4M (YUV 4:2:0) que o Chromium usa como câmera falsa. */
export function gerarFolha(caminho: string): void {
  const y = Buffer.alloc(W * H);
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) y[j * W + i] = dentro(i, j) ? 235 : 40;
  const uv = Buffer.alloc((W / 2) * (H / 2), 128);
  writeFileSync(
    caminho,
    Buffer.concat([Buffer.from(`YUV4MPEG2 W${W} H${H} F30:1 Ip A1:1 C420jpeg\n`), Buffer.from('FRAME\n'), y, uv, uv]),
  );
}
```

Substitua `tests/e2e/global-setup.ts`:

```ts
import { config } from 'dotenv';
import { existsSync } from 'node:fs';
import { gerarFolha } from './fixtures/gerarFolha';

export const VIDEO_FALSO = 'tests/e2e/fixtures/folha.y4m';

export default async function globalSetup() {
  config({ path: '.env.local' });
  const { garantirUsuario } = await import('../compartilhado/supabase');
  await garantirUsuario();
  if (!existsSync(VIDEO_FALSO)) gerarFolha(VIDEO_FALSO);
}
```

Em `playwright.config.ts`, dentro de `use`, acrescente:

```ts
    permissions: ['camera'],
    launchOptions: {
      args: [
        '--use-fake-ui-for-media-stream',
        '--use-fake-device-for-media-stream',
        '--use-file-for-fake-video-capture=tests/e2e/fixtures/folha.y4m',
      ],
    },
```

O Chromium lê o arquivo ao abrir a câmera. Como o `globalSetup` roda antes, o arquivo já existe quando o primeiro teste começa.

- [ ] **Step 3: Escrever o E2E (falhando)**

`tests/e2e/scanner.spec.ts`:

```ts
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
```

Run: `npm run test:e2e -- scanner.spec.ts`
Expected: FAIL (`/lote` não existe).

- [ ] **Step 4: Carregar o OpenCV e detectar a folha**

`src/lib/imagem/opencv.ts`:

```ts
import { ordenarCantos } from './cantos';
import type { Cantos, Ponto } from './tipos';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type OpenCV = any;

let carregando: Promise<{ cv: OpenCV } | null> | null = null;

/**
 * Carrega /opencv/opencv.js uma vez. Devolve `{ cv }` (embrulhado: o módulo do
 * OpenCV tem `.then` e confundiria o Promise) ou null se falhar/demorar.
 */
export function carregarOpenCV(src = '/opencv/opencv.js', timeoutMs = 20_000): Promise<{ cv: OpenCV } | null> {
  carregando ??= new Promise((resolve) => {
    const w = window as unknown as { cv?: OpenCV };
    const pronto = (m: OpenCV) => resolve(m?.Mat ? { cv: m } : null);
    const timer = setTimeout(() => resolve(null), timeoutMs);
    const aoCarregar = () => {
      clearTimeout(timer);
      const g = w.cv;
      if (!g) return resolve(null);
      if (g.Mat) return pronto(g);
      if (g instanceof Promise) return void g.then(pronto, () => resolve(null));
      g.onRuntimeInitialized = () => pronto(w.cv);
    };
    if (w.cv) return aoCarregar();
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.onload = aoCarregar;
    script.onerror = () => {
      clearTimeout(timer);
      resolve(null);
    };
    document.head.appendChild(script);
  });
  return carregando;
}

/** Maior quadrilátero convexo com ≥ 20% da área do quadro, em coordenadas do canvas. */
export function detectarCantos(cv: OpenCV, canvas: HTMLCanvasElement): Cantos | null {
  const src = cv.imread(canvas);
  const cinza = new cv.Mat();
  const bordas = new cv.Mat();
  const nucleo = cv.Mat.ones(3, 3, cv.CV_8U);
  const contornos = new cv.MatVector();
  const hierarquia = new cv.Mat();
  try {
    cv.cvtColor(src, cinza, cv.COLOR_RGBA2GRAY);
    cv.GaussianBlur(cinza, cinza, new cv.Size(5, 5), 0);
    cv.Canny(cinza, bordas, 50, 150);
    cv.dilate(bordas, bordas, nucleo);
    cv.findContours(bordas, contornos, hierarquia, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

    const areaMinima = 0.2 * canvas.width * canvas.height;
    let melhor: Cantos | null = null;
    let melhorArea = 0;
    for (let i = 0; i < contornos.size(); i++) {
      const c = contornos.get(i);
      const area = cv.contourArea(c);
      if (area > areaMinima && area > melhorArea) {
        const aprox = new cv.Mat();
        cv.approxPolyDP(c, aprox, 0.02 * cv.arcLength(c, true), true);
        if (aprox.rows === 4 && cv.isContourConvex(aprox)) {
          const d = aprox.data32S as Int32Array;
          const pts: Ponto[] = [0, 1, 2, 3].map((k) => ({ x: d[k * 2], y: d[k * 2 + 1] }));
          melhor = ordenarCantos(pts);
          melhorArea = area;
        }
        aprox.delete();
      }
      c.delete();
    }
    return melhor;
  } finally {
    src.delete();
    cinza.delete();
    bordas.delete();
    nucleo.delete();
    contornos.delete();
    hierarquia.delete();
  }
}
```

- [ ] **Step 5: Componente da câmera**

`src/components/scanner/Camera.tsx`:

```tsx
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { cantosDaImagem, escalarCantos } from '@/lib/imagem/cantos';
import { Estabilizador } from '@/lib/imagem/estabilizador';
import { carregarOpenCV, detectarCantos, type OpenCV } from '@/lib/imagem/opencv';
import type { Cantos, Pagina } from '@/lib/imagem/tipos';

const LARGURA_DETECCAO = 480;
const MAX_FONTE = 2400;

type Props = { onCapturar: (p: Pagina) => void; onErro: (mensagem: string) => void };

function desenharContorno(canvas: HTMLCanvasElement | null, w: number, h: number, cantos: Cantos | null) {
  if (!canvas) return;
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, w, h);
  if (!cantos) return;
  ctx.beginPath();
  cantos.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.closePath();
  ctx.fillStyle = 'rgba(34,197,94,0.2)';
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#22c55e';
  ctx.stroke();
}

export function Camera({ onCapturar, onErro }: Props) {
  const video = useRef<HTMLVideoElement>(null);
  const overlay = useRef<HTMLCanvasElement>(null);
  const ultimos = useRef<Cantos | null>(null);
  const capturando = useRef(false);
  const autoRef = useRef(false);
  const [cv, setCv] = useState<OpenCV | null>(null);
  const [statusCv, setStatusCv] = useState<'carregando' | 'ok' | 'falhou'>('carregando');
  const [auto, setAuto] = useState(false);
  const [detectado, setDetectado] = useState(false);

  useEffect(() => {
    autoRef.current = auto;
  }, [auto]);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let cancelado = false;
    if (!navigator.mediaDevices?.getUserMedia) {
      onErro('Este navegador não dá acesso à câmera.');
      return;
    }
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'environment', width: { ideal: 3840 }, height: { ideal: 2160 } }, audio: false })
      .then((s) => {
        if (cancelado) return s.getTracks().forEach((t) => t.stop());
        stream = s;
        if (video.current) {
          video.current.srcObject = s;
          void video.current.play();
        }
      })
      .catch(() =>
        onErro('Não consegui abrir a câmera. Libere a permissão de câmera para este site nas configurações do navegador.'),
      );
    return () => {
      cancelado = true;
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [onErro]);

  useEffect(() => {
    let vivo = true;
    void carregarOpenCV().then((r) => {
      if (!vivo) return;
      if (r) {
        setCv(r.cv);
        setStatusCv('ok');
      } else setStatusCv('falhou');
    });
    return () => {
      vivo = false;
    };
  }, []);

  const capturar = useCallback(async () => {
    const v = video.current;
    if (!v?.videoWidth || capturando.current) return;
    capturando.current = true;
    try {
      const escala = Math.min(1, MAX_FONTE / Math.max(v.videoWidth, v.videoHeight));
      const w = Math.round(v.videoWidth * escala);
      const h = Math.round(v.videoHeight * escala);
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      canvas.getContext('2d')!.drawImage(v, 0, 0, w, h);
      const fonte = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/jpeg', 0.9));
      if (!fonte) return;
      const det = ultimos.current;
      onCapturar({
        id: crypto.randomUUID(),
        fonte,
        largura: w,
        altura: h,
        cantos: det ? escalarCantos(det, w / LARGURA_DETECCAO) : cantosDaImagem({ width: w, height: h }),
        rotacao: 0,
        detectado: !!det,
      });
    } finally {
      capturando.current = false;
    }
  }, [onCapturar]);

  useEffect(() => {
    const v = video.current;
    if (!cv || !v) return;
    const det = document.createElement('canvas');
    const estabilizador = new Estabilizador(LARGURA_DETECCAO * 0.02, 1000);
    const id = window.setInterval(() => {
      if (!v.videoWidth) return;
      det.width = LARGURA_DETECCAO;
      det.height = Math.round((LARGURA_DETECCAO * v.videoHeight) / v.videoWidth);
      det.getContext('2d', { willReadFrequently: true })!.drawImage(v, 0, 0, det.width, det.height);
      let cantos: Cantos | null = null;
      try {
        cantos = detectarCantos(cv, det);
      } catch {
        cantos = null;
      }
      ultimos.current = cantos;
      setDetectado(!!cantos);
      desenharContorno(overlay.current, det.width, det.height, cantos);
      if (autoRef.current && estabilizador.atualizar(cantos, performance.now())) {
        estabilizador.reiniciar();
        void capturar();
      }
    }, 200);
    return () => window.clearInterval(id);
  }, [cv, capturar]);

  return (
    <div className="relative h-full w-full bg-black">
      <video ref={video} playsInline muted className="absolute inset-0 h-full w-full object-contain" />
      <canvas
        ref={overlay}
        aria-hidden
        data-detectado={detectado ? 'sim' : 'nao'}
        className="pointer-events-none absolute inset-0 h-full w-full object-contain"
      />
      {statusCv === 'carregando' && (
        <p className="absolute inset-x-2 top-2 rounded bg-black/60 p-2 text-sm">Carregando detecção…</p>
      )}
      {statusCv === 'falhou' && (
        <p className="absolute inset-x-2 top-2 rounded bg-yellow-100 p-2 text-sm text-gray-900">
          Detecção automática indisponível. Ajuste os cantos depois da foto.
        </p>
      )}
      <div className="absolute inset-x-0 bottom-6 flex items-center justify-center gap-8">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={auto} onChange={(e) => setAuto(e.target.checked)} /> Auto
        </label>
        <button onClick={capturar} aria-label="Capturar" className="h-16 w-16 rounded-full border-4 border-white bg-white/30" />
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Editor de cantos e revisão das páginas**

`src/components/scanner/EditorCantos.tsx`:

```tsx
'use client';

import { useEffect, useRef, useState, type PointerEvent } from 'react';
import { cantosDaImagem } from '@/lib/imagem/cantos';
import type { Cantos, Pagina, Ponto } from '@/lib/imagem/tipos';

type Props = { pagina: Pagina; onSalvar: (c: Cantos) => void; onCancelar: () => void };

export function EditorCantos({ pagina, onSalvar, onCancelar }: Props) {
  const [cantos, setCantos] = useState<Cantos>(pagina.cantos);
  const [url, setUrl] = useState<string>();
  const svg = useRef<SVGSVGElement>(null);
  const arrastando = useRef<number | null>(null);

  useEffect(() => {
    const u = URL.createObjectURL(pagina.fonte);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [pagina.fonte]);

  function paraImagem(e: PointerEvent): Ponto {
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(svg.current!.getScreenCTM()!.inverse());
    return {
      x: Math.min(Math.max(p.x, 0), pagina.largura),
      y: Math.min(Math.max(p.y, 0), pagina.altura),
    };
  }

  const raio = Math.max(pagina.largura, pagina.altura) * 0.03;
  const soltar = () => (arrastando.current = null);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black text-white">
      <svg
        ref={svg}
        viewBox={`0 0 ${pagina.largura} ${pagina.altura}`}
        preserveAspectRatio="xMidYMid meet"
        className="min-h-0 flex-1 touch-none"
        onPointerMove={(e) => {
          const i = arrastando.current;
          if (i === null) return;
          const p = paraImagem(e);
          setCantos((c) => c.map((q, j) => (j === i ? p : q)) as Cantos);
        }}
        onPointerUp={soltar}
        onPointerCancel={soltar}
      >
        {url && <image href={url} width={pagina.largura} height={pagina.altura} />}
        <polygon
          points={cantos.map((p) => `${p.x},${p.y}`).join(' ')}
          fill="rgba(34,197,94,0.2)"
          stroke="#22c55e"
          strokeWidth={raio / 4}
        />
        {cantos.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={raio}
            fill="rgba(255,255,255,0.8)"
            stroke="#22c55e"
            strokeWidth={raio / 5}
            onPointerDown={(e) => {
              arrastando.current = i;
              (e.target as Element).setPointerCapture(e.pointerId);
            }}
          />
        ))}
      </svg>
      <div className="flex gap-2 p-3">
        <button onClick={onCancelar} className="flex-1 rounded border py-3">Cancelar</button>
        <button onClick={() => setCantos(cantosDaImagem({ width: pagina.largura, height: pagina.altura }))} className="flex-1 rounded border py-3">
          Página inteira
        </button>
        <button onClick={() => onSalvar(cantos)} className="flex-1 rounded bg-blue-600 py-3">Aplicar</button>
      </div>
    </div>
  );
}
```

`src/components/scanner/Revisao.tsx`:

```tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import { imagemParaJpeg, processarPagina } from '@/lib/imagem/navegador';
import type { Filtro, Pagina, Rotacao } from '@/lib/imagem/tipos';
import { EditorCantos } from './EditorCantos';

const ERRO = 'erro';

function chave(p: Pagina, filtro: Filtro) {
  return `${p.id}|${p.cantos.map((c) => `${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(';')}|${p.rotacao}|${filtro}`;
}

/** Gera prévias pequenas (400 px) uma de cada vez e guarda por chave. */
function usePrevias(paginas: Pagina[], filtro: Filtro): Record<string, string> {
  const cache = useRef(new Map<string, string>());
  const [, forcar] = useState(0);

  useEffect(() => {
    let vivo = true;
    void (async () => {
      for (const p of paginas) {
        const k = chave(p, filtro);
        if (cache.current.has(k)) continue;
        try {
          const bytes = await imagemParaJpeg(await processarPagina(p, filtro, 400), 0.8);
          cache.current.set(k, URL.createObjectURL(new Blob([bytes as BlobPart], { type: 'image/jpeg' })));
        } catch {
          cache.current.set(k, ERRO);
        }
        if (!vivo) return;
        forcar((n) => n + 1);
      }
    })();
    return () => {
      vivo = false;
    };
  }, [paginas, filtro]);

  useEffect(() => {
    const mapa = cache.current;
    return () => mapa.forEach((u) => u !== ERRO && URL.revokeObjectURL(u));
  }, []);

  return Object.fromEntries(paginas.map((p) => [p.id, cache.current.get(chave(p, filtro)) ?? '']));
}

type Props = {
  paginas: Pagina[];
  filtro: Filtro;
  onFiltro: (f: Filtro) => void;
  onAlterar: (paginas: Pagina[]) => void;
  onMaisPaginas: () => void;
  onContinuar: () => void;
};

export function Revisao({ paginas, filtro, onFiltro, onAlterar, onMaisPaginas, onContinuar }: Props) {
  const [editando, setEditando] = useState<Pagina | null>(null);
  const previas = usePrevias(paginas, filtro);

  const atualizar = (id: string, mudanca: Partial<Pagina>) =>
    onAlterar(paginas.map((p) => (p.id === id ? { ...p, ...mudanca } : p)));
  const trocar = (i: number, j: number) => {
    if (j < 0 || j >= paginas.length) return;
    const nova = [...paginas];
    [nova[i], nova[j]] = [nova[j], nova[i]];
    onAlterar(nova);
  };

  return (
    <div className="flex h-full flex-col bg-gray-900">
      <fieldset className="flex gap-4 p-3 text-sm">
        <legend className="sr-only">Filtro</legend>
        {(['documento', 'cor'] as const).map((f) => (
          <label key={f} className="flex items-center gap-1">
            <input type="radio" name="filtro" checked={filtro === f} onChange={() => onFiltro(f)} />
            {f === 'documento' ? 'Documento' : 'Cor'}
          </label>
        ))}
      </fieldset>
      <ol className="grid min-h-0 flex-1 grid-cols-2 content-start gap-3 overflow-y-auto p-3">
        {paginas.map((p, i) => (
          <li key={p.id} className="space-y-1 rounded bg-gray-800 p-2">
            {previas[p.id] === ERRO ? (
              <p className="text-xs text-red-300">Cantos inválidos — ajuste</p>
            ) : previas[p.id] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={previas[p.id]} alt={`Página ${i + 1}`} className="w-full rounded bg-white" />
            ) : (
              <div className="aspect-[3/4] animate-pulse rounded bg-gray-700" />
            )}
            {!p.detectado && <p className="text-xs text-amber-300">Cantos não detectados — confira</p>}
            <div className="flex flex-wrap gap-2 text-xs">
              <button onClick={() => setEditando(p)}>Ajustar cantos</button>
              <button onClick={() => atualizar(p.id, { rotacao: ((p.rotacao + 90) % 360) as Rotacao })}>Girar</button>
              <button aria-label={`Mover página ${i + 1} para trás`} onClick={() => trocar(i, i - 1)}>◀</button>
              <button aria-label={`Mover página ${i + 1} para frente`} onClick={() => trocar(i, i + 1)}>▶</button>
              <button onClick={() => onAlterar(paginas.filter((q) => q.id !== p.id))} className="text-red-300">Apagar</button>
            </div>
          </li>
        ))}
      </ol>
      <div className="flex gap-2 p-3">
        <button onClick={onMaisPaginas} className="flex-1 rounded border py-3">Adicionar página</button>
        <button onClick={onContinuar} disabled={!paginas.length} className="flex-1 rounded bg-blue-600 py-3 disabled:opacity-50">
          Continuar ({paginas.length})
        </button>
      </div>
      {editando && (
        <EditorCantos
          pagina={editando}
          onCancelar={() => setEditando(null)}
          onSalvar={(cantos) => {
            atualizar(editando.id, { cantos, detectado: true });
            setEditando(null);
          }}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 7: Seletor de aluno do lote e o Scanner**

`src/components/scanner/SeletorAluno.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { normalizar } from '@/lib/dominio/busca';
import type { Aluno } from '@/lib/tipos';

type Props = { alunos: Aluno[]; entregues: Set<string>; ocupado: boolean; onEscolher: (a: Aluno) => void };

export function SeletorAluno({ alunos, entregues, ocupado, onEscolher }: Props) {
  const [filtro, setFiltro] = useState('');
  const [todos, setTodos] = useState(false);
  const visiveis = alunos.filter(
    (a) => (todos || !entregues.has(a.id)) && normalizar(a.nome).includes(normalizar(filtro)),
  );

  return (
    <div className="space-y-3">
      <h2 className="font-semibold">De quem é este trabalho?</h2>
      <label className="block text-sm">
        Filtrar
        <input type="search" value={filtro} onChange={(e) => setFiltro(e.target.value)} className="mt-1 w-full rounded border px-3 py-2" />
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={todos} onChange={(e) => setTodos(e.target.checked)} /> Mostrar quem já entregou
      </label>
      {visiveis.length === 0 && (
        <p className="text-sm text-gray-600">{todos || filtro ? 'Nenhum aluno encontrado.' : 'Todos já entregaram.'}</p>
      )}
      <ul className="space-y-2">
        {visiveis.map((a) => (
          <li key={a.id}>
            <button disabled={ocupado} onClick={() => onEscolher(a)} className="w-full rounded border p-3 text-left disabled:opacity-50">
              {a.nome}
              {entregues.has(a.id) && <span className="ml-2 text-xs text-gray-500">(já entregou)</span>}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

`src/components/scanner/Scanner.tsx`:

```tsx
'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';
import { EscolherDestino } from '@/components/envio/EscolherDestino';
import { idsEntregues } from '@/lib/dominio/entregas';
import { itemDeImagens } from '@/lib/envio/montar';
import type { Destino } from '@/lib/fila/fila';
import { enfileirar, useFila } from '@/lib/fila/useFila';
import { processarPagina } from '@/lib/imagem/navegador';
import type { Filtro, Pagina } from '@/lib/imagem/tipos';
import type { Aluno, Atividade } from '@/lib/tipos';
import { Camera } from './Camera';
import { Revisao } from './Revisao';
import { SeletorAluno } from './SeletorAluno';

type Props =
  | { modo: 'avulso'; aluno: Aluno; atividades: Atividade[] }
  | { modo: 'lote'; atividade: Atividade; alunos: Aluno[]; entreguesNoBanco: string[] };

type Etapa = 'camera' | 'revisao' | 'destino';

export function Scanner(props: Props) {
  const router = useRouter();
  const { itens } = useFila();
  const [etapa, setEtapa] = useState<Etapa>('camera');
  const [paginas, setPaginas] = useState<Pagina[]>([]);
  const [filtro, setFiltro] = useState<Filtro>('documento');
  const [erroCamera, setErroCamera] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [salvosNoLote, setSalvosNoLote] = useState<string[]>([]);

  const capturar = useCallback((p: Pagina) => {
    setPaginas((ps) => [...ps, p]);
    setAviso(null);
  }, []);
  const aoErroCamera = useCallback((m: string) => setErroCamera(m), []);

  async function salvar(destino: Destino, nome: string) {
    setOcupado(true);
    setErro(null);
    try {
      const item = await itemDeImagens(paginas.map((p) => () => processarPagina(p, filtro, 1600)), destino);
      await enfileirar(item);
      setPaginas([]);
      setAviso(`Salvo para ${nome}. Enviando…`);
      if (props.modo === 'avulso') {
        router.push(`/alunos/${props.aluno.id}`);
        router.refresh();
      } else {
        setSalvosNoLote((s) => [...s, destino.alunoId]);
        setEtapa('camera');
      }
    } catch {
      setErro('Não consegui gerar o PDF. Confira os cantos das páginas e tente de novo.');
    } finally {
      setOcupado(false);
    }
  }

  const voltar = props.modo === 'avulso' ? `/alunos/${props.aluno.id}` : '/lote';
  const titulo = props.modo === 'avulso' ? props.aluno.nome : props.atividade.nome;
  const entregues =
    props.modo === 'lote'
      ? new Set([...idsEntregues(props.entreguesNoBanco, itens, props.atividade.id), ...salvosNoLote])
      : new Set<string>();

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-black text-white">
      <header className="flex items-center justify-between gap-2 p-3">
        <Link href={voltar} className="text-sm">Fechar</Link>
        <span className="truncate font-medium">{titulo}</span>
        <span className="text-sm">{paginas.length} pág.</span>
      </header>
      {aviso && <p role="status" className="bg-green-700 px-3 py-2 text-sm">{aviso}</p>}
      {erro && <p role="alert" className="bg-red-700 px-3 py-2 text-sm">{erro}</p>}
      <div className="relative min-h-0 flex-1">
        {etapa === 'camera' &&
          (erroCamera ? (
            <div className="space-y-3 p-4">
              <p>{erroCamera}</p>
              {props.modo === 'avulso' && (
                <Link href={`/alunos/${props.aluno.id}/enviar`} className="underline">Enviar arquivo em vez disso</Link>
              )}
            </div>
          ) : (
            <>
              <Camera onCapturar={capturar} onErro={aoErroCamera} />
              {paginas.length > 0 && (
                <button onClick={() => setEtapa('revisao')} className="absolute right-3 top-14 rounded bg-blue-600 px-3 py-2 text-sm">
                  Revisar ({paginas.length})
                </button>
              )}
            </>
          ))}
        {etapa === 'revisao' && (
          <Revisao
            paginas={paginas}
            filtro={filtro}
            onFiltro={setFiltro}
            onAlterar={setPaginas}
            onMaisPaginas={() => setEtapa('camera')}
            onContinuar={() => setEtapa('destino')}
          />
        )}
        {etapa === 'destino' && (
          <div className="h-full overflow-y-auto bg-white p-4 text-gray-900">
            <button onClick={() => setEtapa('revisao')} className="mb-3 text-sm text-blue-700">← Voltar para as páginas</button>
            {props.modo === 'avulso' ? (
              <EscolherDestino
                atividades={props.atividades}
                textoBotao="Salvar"
                ocupado={ocupado}
                onConfirmar={(d) => salvar({ alunoId: props.aluno.id, ...d }, props.aluno.nome)}
              />
            ) : (
              <SeletorAluno
                alunos={props.alunos}
                entregues={entregues}
                ocupado={ocupado}
                onEscolher={(a) =>
                  salvar({ alunoId: a.id, atividadeId: props.atividade.id, titulo: props.atividade.nome }, a.nome)
                }
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 8: Páginas do scanner e escolha do lote**

`src/app/(app)/alunos/[alunoId]/escanear/page.tsx`:

```tsx
import { Scanner } from '@/components/scanner/Scanner';
import { obterAluno } from '@/lib/dados/alunos';
import { listarAtividades } from '@/lib/dados/atividades';
import { clienteServidor } from '@/lib/supabase/servidor';

export default async function PaginaEscanear({ params }: { params: Promise<{ alunoId: string }> }) {
  const { alunoId } = await params;
  const sb = await clienteServidor();
  const aluno = await obterAluno(sb, alunoId);
  const atividades = await listarAtividades(sb, aluno.turma_id);
  return <Scanner modo="avulso" aluno={{ id: aluno.id, turma_id: aluno.turma_id, nome: aluno.nome }} atividades={atividades} />;
}
```

`src/components/lote/EscolherLote.tsx`:

```tsx
'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { FormNome } from '@/components/ui/FormNome';
import { criarAtividade, listarAtividades } from '@/lib/dados/atividades';
import { listarTurmas } from '@/lib/dados/turmas';
import { hojeIso } from '@/lib/dominio/formato';
import { clienteNavegador } from '@/lib/supabase/navegador';
import type { AnoLetivo, Atividade, Turma } from '@/lib/tipos';

type Opcao = { valor: string; rotulo: string };

function Campo({ rotulo, valor, opcoes, vazio, onMudar }: { rotulo: string; valor: string; opcoes: Opcao[]; vazio?: string; onMudar: (v: string) => void }) {
  return (
    <label className="block text-sm">
      {rotulo}
      <select value={valor} onChange={(e) => onMudar(e.target.value)} className="mt-1 w-full rounded border bg-white px-3 py-2">
        {vazio && <option value="">{vazio}</option>}
        {opcoes.map((o) => <option key={o.valor} value={o.valor}>{o.rotulo}</option>)}
      </select>
    </label>
  );
}

export function EscolherLote({ anos }: { anos: AnoLetivo[] }) {
  const router = useRouter();
  const sb = clienteNavegador();
  const [anoId, setAnoId] = useState(anos[0]?.id ?? '');
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [turmaId, setTurmaId] = useState('');
  const [atividades, setAtividades] = useState<Atividade[]>([]);
  const [atividadeId, setAtividadeId] = useState('');

  useEffect(() => {
    if (!anoId) return;
    let vivo = true;
    void listarTurmas(sb, anoId).then((t) => vivo && setTurmas(t));
    return () => {
      vivo = false;
    };
  }, [anoId, sb]);

  useEffect(() => {
    if (!turmaId) return;
    let vivo = true;
    void listarAtividades(sb, turmaId).then((a) => vivo && setAtividades(a));
    return () => {
      vivo = false;
    };
  }, [turmaId, sb]);

  if (!anos.length) {
    return (
      <p className="text-sm">
        Crie um ano letivo e uma turma primeiro. <Link href="/" className="text-blue-700">Voltar ao início</Link>
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <Campo
        rotulo="Ano letivo"
        valor={anoId}
        opcoes={anos.map((a) => ({ valor: a.id, rotulo: String(a.ano) }))}
        onMudar={(v) => {
          setAnoId(v);
          setTurmas([]);
          setTurmaId('');
          setAtividades([]);
          setAtividadeId('');
        }}
      />
      <Campo
        rotulo="Turma"
        valor={turmaId}
        vazio="Escolha a turma"
        opcoes={turmas.map((t) => ({ valor: t.id, rotulo: t.nome }))}
        onMudar={(v) => {
          setTurmaId(v);
          setAtividades([]);
          setAtividadeId('');
        }}
      />
      {turmaId && (
        <>
          <Campo
            rotulo="Atividade"
            valor={atividadeId}
            vazio="Escolha a atividade"
            opcoes={atividades.map((a) => ({ valor: a.id, rotulo: a.nome }))}
            onMudar={setAtividadeId}
          />
          <FormNome
            rotulo="Ou crie uma atividade"
            textoBotao="Criar"
            onSalvar={async (nome) => {
              const nova = await criarAtividade(sb, turmaId, nome, hojeIso());
              setAtividades((l) => [nova, ...l]);
              setAtividadeId(nova.id);
            }}
          />
        </>
      )}
      <button
        disabled={!atividadeId}
        onClick={() => router.push(`/lote/${atividadeId}`)}
        className="w-full rounded bg-blue-700 py-3 text-white disabled:opacity-50"
      >
        Começar
      </button>
    </div>
  );
}
```

`src/app/(app)/lote/page.tsx`:

```tsx
import Link from 'next/link';
import { EscolherLote } from '@/components/lote/EscolherLote';
import { listarAnos } from '@/lib/dados/anos';
import { clienteServidor } from '@/lib/supabase/servidor';

export default async function PaginaLote() {
  const anos = (await listarAnos(await clienteServidor())).filter((a) => !a.arquivado);
  return (
    <div className="space-y-4">
      <nav className="text-sm"><Link href="/">← Início</Link></nav>
      <h1 className="text-xl font-semibold">Escanear lote</h1>
      <EscolherLote anos={anos} />
    </div>
  );
}
```

`src/app/(app)/lote/[atividadeId]/page.tsx`:

```tsx
import { Scanner } from '@/components/scanner/Scanner';
import { listarAlunos } from '@/lib/dados/alunos';
import { alunosComEntrega, obterAtividade } from '@/lib/dados/atividades';
import { clienteServidor } from '@/lib/supabase/servidor';

export default async function PaginaLoteScanner({ params }: { params: Promise<{ atividadeId: string }> }) {
  const { atividadeId } = await params;
  const sb = await clienteServidor();
  const atividade = await obterAtividade(sb, atividadeId);
  const [alunos, entregues] = await Promise.all([listarAlunos(sb, atividade.turma_id), alunosComEntrega(sb, atividadeId)]);
  return (
    <Scanner
      modo="lote"
      atividade={{ id: atividade.id, turma_id: atividade.turma_id, nome: atividade.nome, data: atividade.data }}
      alunos={alunos.map(({ id, turma_id, nome }) => ({ id, turma_id, nome }))}
      entreguesNoBanco={entregues}
    />
  );
}
```

- [ ] **Step 9: Rodar e ver passar**

Run: `npm run test:e2e -- scanner.spec.ts`
Expected: 2 passed.

Se `canvas[data-detectado="sim"]` não aparecer: abra o trace (`npx playwright show-trace test-results/**/trace.zip`) e confira (a) se o vídeo falso está tocando (a folha clara deve aparecer); (b) se há erro de carregamento de `/opencv/opencv.js` no console. Não afrouxe o teste: a detecção é o requisito.

- [ ] **Step 10: Rodar a suíte inteira**

Run: `npm test && npm run test:int && npm run test:db && npm run test:e2e`
Expected: tudo PASS.

- [ ] **Step 11: Commit**

```bash
git add -A
git commit -m "feat(scanner): câmera com detecção OpenCV, revisão, avulso e lote

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 13: PWA — instalação e "Compartilhar" para o app

**Files:**
- Create: `scripts/gerar-icones.mjs`, `public/icons/*.png` (gerados), `src/app/manifest.ts`, `public/sw.js`, `src/components/RegistrarSW.tsx`, `src/lib/compartilhar.ts`, `src/app/(app)/compartilhar/page.tsx`, `tests/e2e/pwa.spec.ts`
- Modify: `src/app/layout.tsx` (inclui `<RegistrarSW />`), `next.config.ts` (cabeçalho do `sw.js`)
- Test: `src/lib/compartilhar.test.ts`

**Interfaces:**
- Consumes: `BuscarAluno`, `EnviarArquivos`, `listarAtividades`, `clienteNavegador`, `ResultadoBusca`, `Atividade`.
- Produces: `guardarCompartilhados(itens: { nome: string; tipo: string; dados: ArrayBuffer }[], banco?: string): Promise<void>`; `lerCompartilhados(banco?: string): Promise<File[]>`; `limparCompartilhados(banco?: string): Promise<void>`. Banco IndexedDB `organizador-compartilhados`, store `arquivos`, gravado pelo service worker com o mesmo formato.

- [ ] **Step 1: Teste do armazenamento de compartilhados (falhando)**

`src/lib/compartilhar.test.ts`:

```ts
import 'fake-indexeddb/auto';
import { expect, it } from 'vitest';
import { guardarCompartilhados, lerCompartilhados, limparCompartilhados } from './compartilhar';

it('guarda, lê como File e limpa', async () => {
  const banco = `teste-${crypto.randomUUID()}`;
  await guardarCompartilhados(
    [
      { nome: 'a.pdf', tipo: 'application/pdf', dados: new Uint8Array([1, 2]).buffer },
      { nome: 'b.jpg', tipo: 'image/jpeg', dados: new Uint8Array([3]).buffer },
    ],
    banco,
  );
  const arquivos = await lerCompartilhados(banco);
  expect(arquivos.map((f) => [f.name, f.type, f.size])).toEqual([['a.pdf', 'application/pdf', 2], ['b.jpg', 'image/jpeg', 1]]);
  await limparCompartilhados(banco);
  expect(await lerCompartilhados(banco)).toEqual([]);
});
```

Run: `npm test -- compartilhar` → Expected: FAIL.

- [ ] **Step 2: Implementar**

`src/lib/compartilhar.ts`:

```ts
import { openDB } from 'idb';

const BANCO = 'organizador-compartilhados';
const STORE = 'arquivos';

type Guardado = { nome: string; tipo: string; dados: ArrayBuffer };

function abrir(banco: string) {
  return openDB(banco, 1, {
    upgrade(db) {
      db.createObjectStore(STORE, { autoIncrement: true });
    },
  });
}

/** Mesmo formato que o public/sw.js grava. */
export async function guardarCompartilhados(itens: Guardado[], banco = BANCO): Promise<void> {
  const db = await abrir(banco);
  const tx = db.transaction(STORE, 'readwrite');
  await tx.store.clear();
  for (const item of itens) await tx.store.add(item);
  await tx.done;
  db.close();
}

export async function lerCompartilhados(banco = BANCO): Promise<File[]> {
  const db = await abrir(banco);
  const itens = (await db.getAll(STORE)) as Guardado[];
  db.close();
  return itens.map((i) => new File([i.dados], i.nome, { type: i.tipo }));
}

export async function limparCompartilhados(banco = BANCO): Promise<void> {
  const db = await abrir(banco);
  await db.clear(STORE);
  db.close();
}
```

Run: `npm test -- compartilhar` → Expected: PASS.

- [ ] **Step 3: Ícones**

`scripts/gerar-icones.mjs`:

```js
import { mkdir } from 'node:fs/promises';
import sharp from 'sharp';

const svg = (margem) =>
  Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#1d4ed8"/>
  <g transform="translate(${margem} ${margem}) scale(${(512 - 2 * margem) / 512})">
    <path d="M64 144h144l40 40h200v232H64z" fill="#fff"/>
    <rect x="120" y="250" width="272" height="20" rx="10" fill="#1d4ed8"/>
    <rect x="120" y="310" width="200" height="20" rx="10" fill="#1d4ed8"/>
  </g>
</svg>`);

await mkdir('public/icons', { recursive: true });
await sharp(svg(32)).resize(192).png().toFile('public/icons/icon-192.png');
await sharp(svg(32)).resize(512).png().toFile('public/icons/icon-512.png');
await sharp(svg(96)).resize(512).png().toFile('public/icons/icon-512-maskable.png');
console.log('Ícones gerados em public/icons');
```

Run: `node scripts/gerar-icones.mjs && ls public/icons`
Expected: `icon-192.png icon-512-maskable.png icon-512.png`.

- [ ] **Step 4: Manifesto, service worker e registro**

`src/app/manifest.ts`:

```ts
import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Organizador de Trabalhos',
    short_name: 'Trabalhos',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#1d4ed8',
    lang: 'pt-BR',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icons/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    share_target: {
      action: '/compartilhar',
      method: 'POST',
      enctype: 'multipart/form-data',
      params: { files: [{ name: 'arquivos', accept: ['application/pdf', 'image/*'] }] },
    },
  } as MetadataRoute.Manifest;
}
```

`public/sw.js`:

```js
const CACHE = 'organizador-v1';
const BANCO = 'organizador-compartilhados';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

function abrirBanco() {
  return new Promise((resolve, reject) => {
    const r = indexedDB.open(BANCO, 1);
    r.onupgradeneeded = () => r.result.createObjectStore('arquivos', { autoIncrement: true });
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}

async function guardar(itens) {
  const db = await abrirBanco();
  await new Promise((resolve, reject) => {
    const tx = db.transaction('arquivos', 'readwrite');
    const store = tx.objectStore('arquivos');
    store.clear();
    for (const item of itens) store.add(item);
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // "Compartilhar" do Android: guarda os arquivos e abre a tela de escolha do aluno.
  if (event.request.method === 'POST' && url.pathname === '/compartilhar') {
    event.respondWith(
      (async () => {
        const form = await event.request.formData();
        const arquivos = form.getAll('arquivos').filter((f) => typeof f !== 'string');
        const itens = await Promise.all(
          arquivos.map(async (f) => ({ nome: f.name, tipo: f.type, dados: await f.arrayBuffer() })),
        );
        await guardar(itens);
        return Response.redirect('/compartilhar', 303);
      })(),
    );
    return;
  }

  // OpenCV (~10 MB): baixa uma vez e guarda.
  if (event.request.method === 'GET' && url.pathname === '/opencv/opencv.js') {
    event.respondWith(
      caches.open(CACHE).then(async (cache) => {
        const salvo = await cache.match(event.request);
        if (salvo) return salvo;
        const resposta = await fetch(event.request);
        if (resposta.ok) await cache.put(event.request, resposta.clone());
        return resposta;
      }),
    );
  }
});
```

`src/components/RegistrarSW.tsx`:

```tsx
'use client';

import { useEffect } from 'react';

export function RegistrarSW() {
  useEffect(() => {
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
  }, []);
  return null;
}
```

Em `src/app/layout.tsx`, importe `RegistrarSW` de `@/components/RegistrarSW` e coloque `<RegistrarSW />` antes de `{children}` dentro do `<body>`.

`next.config.ts` (mantenha o que existir e acrescente `headers`):

```ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/sw.js',
        headers: [
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
          { key: 'Content-Type', value: 'application/javascript; charset=utf-8' },
        ],
      },
    ];
  },
};

export default nextConfig;
```

- [ ] **Step 5: Tela que recebe os arquivos compartilhados**

`src/app/(app)/compartilhar/page.tsx`:

```tsx
'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { EnviarArquivos } from '@/components/envio/EnviarArquivos';
import { BuscarAluno } from '@/components/ui/BuscarAluno';
import { listarAtividades } from '@/lib/dados/atividades';
import { lerCompartilhados, limparCompartilhados } from '@/lib/compartilhar';
import { clienteNavegador } from '@/lib/supabase/navegador';
import type { Atividade, ResultadoBusca } from '@/lib/tipos';

export default function PaginaCompartilhar() {
  const [arquivos, setArquivos] = useState<File[] | null>(null);
  const [aluno, setAluno] = useState<ResultadoBusca | null>(null);
  const [atividades, setAtividades] = useState<Atividade[] | null>(null);

  useEffect(() => {
    lerCompartilhados().then(setArquivos, () => setArquivos([]));
  }, []);

  useEffect(() => {
    if (!aluno) return;
    let vivo = true;
    void listarAtividades(clienteNavegador(), aluno.turma.id).then((a) => vivo && setAtividades(a));
    return () => {
      vivo = false;
    };
  }, [aluno]);

  if (arquivos === null) return <p>Carregando…</p>;
  if (!arquivos.length) {
    return (
      <p>
        Nada recebido. <Link href="/" className="text-blue-700">Voltar ao início</Link>
      </p>
    );
  }
  if (!aluno) {
    return (
      <div className="space-y-3">
        <h1 className="text-xl font-semibold">Recebido: {arquivos.length} arquivo(s)</h1>
        <BuscarAluno rotulo="Para qual aluno?" onEscolher={setAluno} />
      </div>
    );
  }
  if (!atividades) return <p>Carregando…</p>;
  return (
    <EnviarArquivos
      aluno={{ id: aluno.id, nome: aluno.nome }}
      atividades={atividades}
      arquivosIniciais={arquivos}
      voltarPara={`/alunos/${aluno.id}`}
      aoEnfileirar={() => limparCompartilhados()}
    />
  );
}
```

- [ ] **Step 6: E2E do PWA**

`tests/e2e/pwa.spec.ts`:

```ts
import { expect, test } from '@playwright/test';

test('manifesto declara instalação e share target', async ({ request }) => {
  const r = await request.get('/manifest.webmanifest');
  expect(r.ok()).toBe(true);
  const m = await r.json();
  expect(m.display).toBe('standalone');
  expect(m.share_target).toMatchObject({ action: '/compartilhar', method: 'POST' });
  expect(m.icons.map((i: { sizes: string }) => i.sizes)).toContain('512x512');
});

test('service worker e OpenCV são públicos', async ({ request }) => {
  expect((await request.get('/sw.js')).status()).toBe(200);
  expect((await request.get('/opencv/opencv.js', { maxRedirects: 0 })).status()).toBe(200);
});
```

Run: `npm test && npm run test:e2e -- pwa.spec.ts`
Expected: unitários PASS; 2 E2E passed.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(pwa): manifesto, ícones, service worker e receber arquivos pelo Compartilhar

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 14: README, deploy e teste em aparelho real

**Files:**
- Create: `README.md` (substitui o gerado)

**Interfaces:**
- Consumes: scripts `db:start`, `usuario`, `test*` (Tasks 1–3); migração (Task 2).
- Produces: documentação de setup local e de produção.

- [ ] **Step 1: Escrever o README**

`README.md`:

````markdown
# Organizador de Trabalhos

Pastas de trabalhos escaneados por aluno (ano letivo → turma → aluno), com scanner pelo celular.

## Rodar localmente

Pré-requisitos: Node 22+, Docker.

```bash
npm install
npm run db:start                       # sobe o Supabase local e gera .env.local
npm run usuario -- voce@email.com SuaSenha
npm run dev                            # http://localhost:3000
```

## Testes

```bash
npm test          # unitários
npm run test:int  # integração (Supabase local)
npm run test:db   # RLS (pgTAP)
npm run test:e2e  # Playwright (câmera falsa)
```

## Produção (Supabase + Vercel)

1. Crie um projeto em supabase.com.
2. Aplique o banco:
   ```bash
   npx supabase login
   npx supabase link --project-ref <ref-do-projeto>
   npx supabase db push
   ```
3. No painel do Supabase:
   - **Authentication → Sign In / Providers:** desligue "Allow new users to sign up".
   - **Authentication → Users → Add user:** crie sua conta com "Auto Confirm User".
4. Na Vercel:
   ```bash
   vercel link
   vercel env add NEXT_PUBLIC_SUPABASE_URL production
   vercel env add NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY production
   vercel deploy --prod
   ```
   `SUPABASE_SECRET_KEY` **não** vai para a Vercel; o app não usa.
5. No celular, abra o site e use "Adicionar à tela inicial". No Android, o app passa a aparecer no menu "Compartilhar".

## Limites

- Plano grátis do Supabase: ~1 GB de arquivos. O início mostra o uso e avisa a partir de 80%.
- PDF enviado pronto: até 20 MB.
````

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: setup local, testes e deploy

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [ ] **Step 3: Deploy (precisa das contas da professora: pergunte antes de executar)**

Siga a seção "Produção" do README. Esses comandos criam recursos externos; **confirme com o usuário antes de cada um** e peça que ele faça os logins (`! npx supabase login`, `! vercel login`).

- [ ] **Step 4: Checklist manual em aparelho real**

Faça em um iPhone (Safari) e um Android (Chrome) e anote o resultado:

- [ ] Login funciona; recarregar a página mantém a sessão.
- [ ] Scanner abre a câmera traseira; o contorno verde aparece sobre a folha.
- [ ] Auto-captura dispara uma vez por folha e não repete com a mesma folha parada.
- [ ] Ajustar cantos com o dedo funciona; girar e reordenar funcionam.
- [ ] PDF final tem as páginas retas, fundo branco no filtro "Documento", ~200–400 KB por página.
- [ ] Modo lote: depois de salvar, a aluna some da lista; com o modo avião ligado, o envio fica pendente e sobe sozinho quando a rede volta.
- [ ] "Adicionar à tela inicial" instala o app com ícone.
- [ ] (Android) Compartilhar um PDF do CamScanner/Drive para "Trabalhos" abre a escolha de aluno e salva.
- [ ] Foto HEIC enviada pelo iPhone vira PDF corretamente.
