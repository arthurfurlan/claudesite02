import { Readable } from "node:stream";
import { lerFoto } from "@/lib/storage";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const foto = await lerFoto(id);

  if (!foto) {
    return new Response("Não encontrado", { status: 404 });
  }

  // undici não aceita stream do Node direto; converte para o stream web.
  const corpo = Readable.toWeb(foto.stream) as ReadableStream<Uint8Array>;

  return new Response(corpo, {
    headers: {
      "Content-Type": "image/webp",
      "Content-Length": String(foto.tamanho),
      // O id é imutável: o arquivo nunca muda depois de gravado.
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
