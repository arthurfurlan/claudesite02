import { enviar } from "@/lib/email";

/** Fixos de propósito: a rota não recebe destinatário, para não virar relay. */
const DESTINATARIOS = [
  "afurlan@configr.com",
  "arthur@umbler.com",
  "arthur.furlan@gmail.com",
];

/**
 * A rota é pública — fica na tela de login, antes de haver sessão. Sem um
 * intervalo mínimo, qualquer visitante dispara três e-mails por clique num
 * laço, e a reputação de envio do servidor é que paga.
 *
 * Em memória, então vale por processo e zera no deploy. Isso basta para o que
 * ela é: um botão de teste, não uma defesa de verdade.
 */
const INTERVALO_MS = 60_000;
declare global {
  var __ultimoTesteEmail: number | undefined;
}

export async function POST() {
  const agora = Date.now();
  const ultimo = globalThis.__ultimoTesteEmail ?? 0;
  const faltam = INTERVALO_MS - (agora - ultimo);
  if (faltam > 0) {
    return Response.json(
      { erro: `Aguarde ${Math.ceil(faltam / 1000)}s antes de testar de novo.` },
      { status: 429 },
    );
  }
  globalThis.__ultimoTesteEmail = agora;

  const quando = new Date().toISOString();
  try {
    const r = await enviar(
      DESTINATARIOS,
      "Teste de e-mail — claudesite02",
      [
        "Este é um e-mail de teste disparado pelo botão da tela de login.",
        "",
        `Enviado em: ${quando}`,
        "Origem: claudesite02.afurlan.org, via MTA local do servidor.",
      ].join("\n"),
    );
    return Response.json({ ok: true, ...r });
  } catch (e) {
    // O motivo real importa aqui: "conexão recusada" (sem MTA, caso do dev
    // local) e "relay negado" pedem correções completamente diferentes.
    const motivo = e instanceof Error ? e.message : String(e);
    // Libera o próximo teste: a tentativa falhou, e obrigar a esperar um minuto
    // para tentar de novo o consertado atrapalharia justamente quem depura.
    globalThis.__ultimoTesteEmail = ultimo;
    return Response.json({ erro: `Falha no envio: ${motivo}` }, { status: 500 });
  }
}
