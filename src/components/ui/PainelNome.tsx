'use client';

import { FormNome } from './FormNome';
import { MenuInferior } from './MenuInferior';

type Props = {
  titulo: string;
  rotulo: string;
  textoBotao: string;
  inicial?: string;
  onSalvar: (nome: string) => Promise<void>;
  onFechar: () => void;
};

/** Menu inferior com um campo de nome; fecha sozinho depois de salvar. */
export function PainelNome({ titulo, rotulo, textoBotao, inicial, onSalvar, onFechar }: Props) {
  return (
    <MenuInferior aberto titulo={titulo} onFechar={onFechar}>
      <FormNome
        rotulo={rotulo}
        textoBotao={textoBotao}
        inicial={inicial}
        autoFocus
        onSalvar={async (nome) => {
          await onSalvar(nome);
          onFechar();
        }}
      />
    </MenuInferior>
  );
}
