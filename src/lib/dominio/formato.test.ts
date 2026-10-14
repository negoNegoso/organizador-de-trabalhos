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
