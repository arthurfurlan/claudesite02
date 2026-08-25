import { usuarioAtual } from "@/lib/auth";
import { arquivoDoUsuario } from "@/lib/drive";
import { respostaArquivo } from "@/lib/download";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const usuario = await usuarioAtual();
  if (!usuario) return new Response("Não autenticado", { status: 401 });

  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) {
    return new Response("Não encontrado", { status: 404 });
  }

  // A consulta filtra por usuario_id: arquivo de outra pessoa devolve 404, e não
  // 403 — responder diferente confirmaria que aquele id existe.
  const arquivo = await arquivoDoUsuario(usuario.id, id);
  if (!arquivo) return new Response("Não encontrado", { status: 404 });

  return respostaArquivo(arquivo.nome, arquivo.blob_id);
}
