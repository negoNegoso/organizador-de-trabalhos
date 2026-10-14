import { ESTILO_COR, type CorTurma } from '@/lib/ui/cores';

export function EtiquetaTurma({ cor, texto }: { cor: CorTurma; texto: string }) {
  const e = ESTILO_COR[cor];
  return <span className={`inline-block max-w-full truncate rounded-full px-2.5 py-0.5 text-xs font-medium ${e.suave} ${e.texto}`}>{texto}</span>;
}
