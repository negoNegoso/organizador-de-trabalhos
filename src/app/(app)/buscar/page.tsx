import { Cabecalho } from '@/components/ui/Cabecalho';
import { BuscarAluno } from '@/components/ui/BuscarAluno';

export default function PaginaBuscar() {
  return (
    <div className="space-y-4">
      <Cabecalho titulo="Buscar" />
      <BuscarAluno autoFocus />
    </div>
  );
}
