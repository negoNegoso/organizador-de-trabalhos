alter table public.turmas
  add column cor text not null default 'azul'
  check (cor in ('azul', 'verde', 'laranja', 'roxo', 'rosa', 'ciano', 'ambar', 'vermelho'));

-- Turmas existentes: cor pela ordem de criação dentro de cada ano, ciclando a paleta.
with ordenadas as (
  select id, (row_number() over (partition by ano_letivo_id order by criado_em, id) - 1) % 8 as i
  from public.turmas
)
update public.turmas t
set cor = (array['azul', 'verde', 'laranja', 'roxo', 'rosa', 'ciano', 'ambar', 'vermelho'])[o.i + 1]
from ordenadas o
where o.id = t.id;
