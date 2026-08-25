import "server-only";
import { Readable } from "node:stream";
import { lerBlob } from "@/lib/storage";

/** RFC 5987: nome com acento ou espaço quebra um filename="" cru. */
function disposicao(nome: string) {
  const ascii = nome.replace(/[^\x20-\x7E]/g, "_").replace(/["\\]/g, "_");
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(nome)}`;
}

/**
 * Sempre `attachment`, nunca inline, e sempre octet-stream — mesmo sabendo o
 * tipo real. Um drive guarda os bytes como vieram: servir um .html enviado por
 * alguém de volta no próprio domínio faria o script dele rodar com acesso ao
 * cookie de sessão de quem abrisse. Forçar download tira a página do ar de origem.
 */
export async function respostaArquivo(nome: string, blobId: string) {
  const blob = await lerBlob(blobId);
  if (!blob) return new Response("Não encontrado", { status: 404 });

  const corpo = Readable.toWeb(blob.stream) as ReadableStream<Uint8Array>;

  return new Response(corpo, {
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Length": String(blob.tamanho),
      "Content-Disposition": disposicao(nome),
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; sandbox",
      "Cache-Control": "private, no-store",
    },
  });
}
