import { usuarioAtual } from "@/lib/auth";
import { enviar } from "@/lib/email";
import {
  EMAIL,
  MAX_ASSUNTO,
  MAX_CORPO,
  MAX_DESTINATARIOS,
  separarDestinatarios,
} from "@/lib/teste-email";

/**
 * A rota fica antes do login. Sem um intervalo mínimo, um laço manda o teto de
 * destinatários por requisição, indefinidamente.
 *
 * Em memória, então vale por processo e zera no deploy. Isso basta para o que
 * ela é: um botão de teste, não uma defesa de verdade.
 */
const INTERVALO_MS = 60_000;
declare global {
  var __ultimoTesteEmail: number | undefined;
}

function erro(mensagem: string, status: number) {
  return Response.json({ erro: mensagem }, { status });
}

export async function POST(request: Request) {
  // A rota aceita destinatário, assunto e corpo do cliente: sem sessão ela é um
  // relay aberto, e o SPF do domínio faria a mensagem passar como legítima.
  if (!(await usuarioAtual())) return erro("Não autenticado.", 401);

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return erro("Corpo da requisição inválido.", 400);
  }

  const { destinatarios, assunto, corpo } = (payload ?? {}) as Record<
    string,
    unknown
  >;

  if (typeof assunto !== "string" || typeof corpo !== "string") {
    return erro("Assunto e corpo são obrigatórios.", 400);
  }
  if (!assunto.trim() || assunto.length > MAX_ASSUNTO) {
    return erro(`Assunto vazio ou acima de ${MAX_ASSUNTO} caracteres.`, 400);
  }
  if (!corpo.trim() || corpo.length > MAX_CORPO) {
    return erro(`Corpo vazio ou acima de ${MAX_CORPO} caracteres.`, 400);
  }

  const lista = separarDestinatarios(
    typeof destinatarios === "string" ? destinatarios : "",
  );
  if (!lista.length) return erro("Informe ao menos um destinatário.", 400);
  if (lista.length > MAX_DESTINATARIOS) {
    return erro(`No máximo ${MAX_DESTINATARIOS} destinatários por envio.`, 400);
  }
  const invalidos = lista.filter((e) => !EMAIL.test(e));
  if (invalidos.length) {
    return erro(`Endereço inválido: ${invalidos.join(", ")}`, 400);
  }

  const agora = Date.now();
  const ultimo = globalThis.__ultimoTesteEmail ?? 0;
  const faltam = INTERVALO_MS - (agora - ultimo);
  if (faltam > 0) {
    return erro(`Aguarde ${Math.ceil(faltam / 1000)}s antes de enviar de novo.`, 429);
  }
  globalThis.__ultimoTesteEmail = agora;

  try {
    const r = await enviar(lista, assunto, corpo);
    return Response.json({ ok: true, ...r });
  } catch (e) {
    // O motivo real importa: "conexão recusada" (sem MTA, caso do dev local) e
    // "relay negado" pedem correções completamente diferentes.
    const motivo = e instanceof Error ? e.message : String(e);
    // Libera o próximo envio: a tentativa falhou, e obrigar a esperar um minuto
    // para tentar de novo o consertado atrapalharia justamente quem depura.
    globalThis.__ultimoTesteEmail = ultimo;
    return erro(`Falha no envio: ${motivo}`, 500);
  }
}
