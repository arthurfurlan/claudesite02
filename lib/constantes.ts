/**
 * Limites compartilhados entre cliente e servidor. Ficam separados de
 * lib/storage.ts porque aquele módulo importa sharp e node:fs — o bundle
 * do cliente não pode puxar nada disso.
 */
export const TIPOS_ACEITOS = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

export const TAMANHO_MAXIMO = 5 * 1024 * 1024; // 5 MB
