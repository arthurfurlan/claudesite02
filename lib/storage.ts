import "server-only";
import { createReadStream, createWriteStream } from "node:fs";
import { mkdir, stat, unlink } from "node:fs/promises";
import { pipeline } from "node:stream/promises";
import { Readable, Transform } from "node:stream";
import path from "node:path";
import { randomUUID } from "node:crypto";

/** Teto do nginx da Cloudez (upload_maxsize). Acima disso a requisição nem chega. */
export const TAMANHO_MAXIMO = 50 * 1024 * 1024;

/**
 * O destino é um volume montado fora do projeto, então o caminho é dinâmico por
 * definição. As chamadas de fs abaixo levam `turbopackIgnore` porque, sem ele, o
 * tracing do build desiste e empacota o projeto inteiro no standalone.
 */
function baseDir() {
  return process.env.UPLOAD_DIR ?? path.join(process.cwd(), ".uploads");
}

/** Só o id que nós mesmos geramos — nada vindo do usuário entra num caminho. */
export function blobValido(id: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(id);
}

function caminho(blobId: string) {
  return path.join(/*turbopackIgnore: true*/ baseDir(), blobId);
}

export class LimiteExcedido extends Error {}

/**
 * Grava em streaming, contando os bytes no caminho. Bufferizar o upload inteiro
 * para depois conferir o tamanho gastaria a memória que se quer limitar — e a
 * máquina tem 1 vCPU e 2 GB. Estourou o limite, aborta e remove o parcial.
 */
export async function gravarStream(
  corpo: ReadableStream<Uint8Array>,
  limiteBytes: number,
): Promise<{ blobId: string; tamanho: number }> {
  const blobId = randomUUID();
  await mkdir(/*turbopackIgnore: true*/ baseDir(), { recursive: true });

  const destino = caminho(blobId);
  let tamanho = 0;

  const contador = new Transform({
    transform(pedaco, _codificacao, callback) {
      tamanho += pedaco.length;
      if (tamanho > limiteBytes) {
        callback(new LimiteExcedido("limite excedido"));
        return;
      }
      callback(null, pedaco);
    },
  });

  try {
    await pipeline(
      Readable.fromWeb(corpo as never),
      contador,
      createWriteStream(/*turbopackIgnore: true*/ destino, { mode: 0o640 }),
    );
  } catch (erro) {
    // Não deixa meio arquivo no volume se o envio cair ou estourar o limite.
    await unlink(/*turbopackIgnore: true*/ destino).catch(() => {});
    throw erro;
  }

  return { blobId, tamanho };
}

export async function lerBlob(blobId: string) {
  if (!blobValido(blobId)) return null;
  const destino = caminho(blobId);
  try {
    const info = await stat(/*turbopackIgnore: true*/ destino);
    if (!info.isFile()) return null;
    return {
      stream: createReadStream(/*turbopackIgnore: true*/ destino),
      tamanho: info.size,
    };
  } catch {
    return null;
  }
}

export async function apagarBlob(blobId: string) {
  if (!blobValido(blobId)) return;
  await unlink(/*turbopackIgnore: true*/ caminho(blobId)).catch(() => {});
}
