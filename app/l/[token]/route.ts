import { arquivoPorLink } from "@/lib/drive";
import { tokensIguais } from "@/lib/auth";
import { respostaArquivo } from "@/lib/download";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  if (!/^[A-Za-z0-9_-]{16,64}$/.test(token)) {
    return new Response("Não encontrado", { status: 404 });
  }

  const arquivo = await arquivoPorLink(token);
  if (!arquivo || !tokensIguais(arquivo.link_token, token)) {
    return new Response("Não encontrado", { status: 404 });
  }

  return respostaArquivo(arquivo.nome, arquivo.blob_id);
}
