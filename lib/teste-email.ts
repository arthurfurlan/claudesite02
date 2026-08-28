/**
 * Módulo próprio, e não parte do route.ts nem do lib/email.ts, por dois
 * motivos: o Next só aceita métodos HTTP e config de segmento como export de um
 * route.ts, e o formulário é componente de cliente — importar do lib/email.ts
 * puxaria o nodemailer para o bundle do navegador.
 */

/** O que a tela já mostra preenchido. */
export const PADRAO = {
  destinatarios: [
    "afurlan@configr.com",
    "arthur@umbler.com",
    "arthur.furlan@gmail.com",
  ].join(", "),
  assunto: "Teste de e-mail — claudesite02",
  corpo: [
    "Este é um e-mail de teste disparado pela tela de login.",
    "",
    "Origem: claudesite02.afurlan.org, via MTA local do servidor.",
  ].join("\n"),
};

/**
 * Tetos, e não conveniência de UI: a rota é pública e aceita destinatário do
 * cliente, então ela entrega e-mail a quem o chamador quiser. Isto reduz o
 * quanto um disparo rende a quem abusar; não substitui proteger a rota.
 */
export const MAX_DESTINATARIOS = 5;
export const MAX_ASSUNTO = 200;
export const MAX_CORPO = 5_000;

/** Deliberadamente simples: quem valida endereço de verdade é o MTA. */
export const EMAIL = /^[^\s@,]+@[^\s@,.]+(\.[^\s@,.]+)+$/;

/** Vírgula, ponto-e-vírgula ou quebra de linha — o que sair do textarea. */
export function separarDestinatarios(bruto: string) {
  return bruto
    .split(/[,\n;]/)
    .map((e) => e.trim())
    .filter(Boolean);
}
