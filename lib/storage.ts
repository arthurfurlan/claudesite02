import { createReadStream } from "node:fs";
import { mkdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import sharp from "sharp";

const LARGURA_MAXIMA = 1600;

/**
 * O destino é um volume montado fora do projeto, então o caminho é dinâmico
 * por definição. As chamadas de fs abaixo levam `turbopackIgnore` porque, sem
 * ele, o tracing do build desiste e empacota o projeto inteiro no standalone.
 */
function uploadDir() {
  return process.env.UPLOAD_DIR ?? path.join(process.cwd(), ".uploads");
}

/** Só aceita o id que nós mesmos geramos — barra path traversal na leitura. */
export function idValido(id: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.webp$/.test(
    id,
  );
}

export type FotoSalva = { id: string; largura: number; altura: number };

/**
 * Reprocessa a imagem com sharp em vez de gravar o upload cru: normaliza para
 * webp, limita a dimensão e descarta os metadados (inclusive GPS do EXIF).
 * Também neutraliza arquivo que finge ser imagem — o decode falha antes de gravar.
 */
export async function salvarFoto(arquivo: File): Promise<FotoSalva> {
  const entrada = Buffer.from(await arquivo.arrayBuffer());

  const processada = sharp(entrada, { animated: true })
    .rotate() // aplica a orientação do EXIF antes de descartá-lo
    .resize({
      width: LARGURA_MAXIMA,
      withoutEnlargement: true,
      fit: "inside",
    })
    .webp({ quality: 82 });

  const { data, info } = await processada.toBuffer({ resolveWithObject: true });

  const id = `${randomUUID()}.webp`;
  const destino = uploadDir();
  await mkdir(/*turbopackIgnore: true*/ destino, { recursive: true });
  await writeFile(/*turbopackIgnore: true*/ path.join(destino, id), data);

  return { id, largura: info.width, altura: info.height };
}

export async function lerFoto(id: string) {
  if (!idValido(id)) return null;
  const caminho = path.join(/*turbopackIgnore: true*/ uploadDir(), id);
  try {
    const info = await stat(/*turbopackIgnore: true*/ caminho);
    if (!info.isFile()) return null;
    return {
      stream: createReadStream(/*turbopackIgnore: true*/ caminho),
      tamanho: info.size,
    };
  } catch {
    return null;
  }
}
