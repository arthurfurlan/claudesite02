import { createTransport } from "nodemailer";

/**
 * O MTA do próprio servidor (exim4, escutando em 127.0.0.1:25) — sem
 * autenticação e sem credencial em lugar nenhum: quem entrega é ele.
 *
 * Isto só alcança o MTA porque o container roda com `network_mode: host` em
 * produção (veja docker-compose.cloudez.yml). Numa rede isolada do Docker,
 * `localhost` seria o próprio container e não haveria nada escutando.
 */
const SMTP_HOST = process.env.SMTP_HOST ?? "localhost";
const SMTP_PORT = Number(process.env.SMTP_PORT ?? 25);

/** O envelope precisa de um domínio que exista, ou o MTA recusa de saída. */
const REMETENTE = process.env.EMAIL_REMETENTE ?? "nao-responda@claudesite02.afurlan.org";

declare global {
  var __smtp: ReturnType<typeof createTransport> | undefined;
}

function transporte() {
  globalThis.__smtp ??= createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    // MTA local não faz TLS nem pede login; exigir qualquer um dos dois aqui
    // quebraria a entrega sem trazer segurança — o tráfego não sai da máquina.
    secure: false,
    ignoreTLS: true,
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
  });
  return globalThis.__smtp;
}

export async function enviar(para: string[], assunto: string, texto: string) {
  const info = await transporte().sendMail({
    from: REMETENTE,
    to: para.join(", "),
    subject: assunto,
    text: texto,
  });

  // `accepted`/`rejected` são por destinatário: o MTA pode aceitar a mensagem e
  // recusar um dos endereços, e aí um `sendMail` sem erro esconderia a falha.
  return {
    messageId: info.messageId,
    aceitos: (info.accepted ?? []).map(String),
    recusados: (info.rejected ?? []).map(String),
  };
}
