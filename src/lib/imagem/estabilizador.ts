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
