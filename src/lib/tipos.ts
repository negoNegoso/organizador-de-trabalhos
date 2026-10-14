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
