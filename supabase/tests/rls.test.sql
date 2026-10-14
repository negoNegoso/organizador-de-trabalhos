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
