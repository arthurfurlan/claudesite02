import { revalidatePath } from "next/cache";
import { usuarioAtual } from "@/lib/auth";
import { COTA_BYTES, espacoUsado, pastaAcessivel, registrarArquivo } from "@/lib/drive";
import { LimiteExcedido, TAMANHO_MAXIMO, apagarBlob, gravarStream } from "@/lib/storage";

function erro(mensagem: string, status: number) {
  return Response.json({ erro: mensagem }, { status });
}

export async function POST(request: Request) {
  const usuario = await usuarioAtual();
  if (!usuario) return erro("Não autenticado.", 401);

  // Nome vai em header codificado: header HTTP não carrega UTF-8 cru, e o corpo
  // inteiro é o arquivo — sem multipart, o upload flui direto para o disco.
  const nomeBruto = request.headers.get("x-arquivo-nome");
  if (!nomeBruto) return erro("Nome do arquivo ausente.", 400);

  let nome: string;
  try {
    nome = decodeURIComponent(nomeBruto).trim();
  } catch {
    return erro("Nome do arquivo inválido.", 400);
  }
  if (!nome || nome.length > 255) return erro("Nome do arquivo inválido.", 400);

  const tipo = request.headers.get("x-arquivo-tipo") || "application/octet-stream";
  const pastaId = request.headers.get("x-pasta-id") || null;

  if (!(await pastaAcessivel(usuario.id, pastaId))) {
    return erro("Pasta não encontrada.", 404);
  }

  const usado = await espacoUsado(usuario.id);
  const disponivel = COTA_BYTES - usado;
  if (disponivel <= 0) return erro("Sua cota de 1 GB está cheia.", 413);

  if (!request.body) return erro("Corpo vazio.", 400);

  // O menor entre o teto por arquivo e o que ainda cabe na cota.
  const limite = Math.min(TAMANHO_MAXIMO, disponivel);

  let gravado;
  try {
    gravado = await gravarStream(request.body, limite);
  } catch (e) {
    if (e instanceof LimiteExcedido) {
      return erro(
        disponivel < TAMANHO_MAXIMO
          ? "O arquivo não cabe no espaço restante da sua cota."
          : "Arquivo maior que o limite de 50 MB.",
        413,
      );
    }
    return erro("Falha ao gravar o arquivo.", 500);
  }

  if (gravado.tamanho === 0) {
    await apagarBlob(gravado.blobId);
    return erro("Arquivo vazio.", 400);
  }

  try {
    await registrarArquivo({
      usuarioId: usuario.id,
      pastaId,
      nome,
      tamanho: gravado.tamanho,
      tipo,
      blobId: gravado.blobId,
    });
  } catch {
    // Sem a linha no banco o blob é inalcançável: remover evita lixo no volume.
    await apagarBlob(gravado.blobId);
    return erro("Falha ao registrar o arquivo.", 500);
  }

  revalidatePath("/drive", "layout");
  return Response.json({ ok: true, nome, tamanho: gravado.tamanho });
}
