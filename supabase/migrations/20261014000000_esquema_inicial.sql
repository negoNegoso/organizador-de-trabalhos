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
