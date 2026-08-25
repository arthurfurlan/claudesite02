import "server-only";
import { consulta } from "@/lib/db";
import { apagarBlob } from "@/lib/storage";

/** Cota por usuário. O disco do servidor é finito e o cadastro é aberto. */
export const COTA_BYTES = 1024 * 1024 * 1024;

export type Pasta = { id: string; nome: string; criado_em: Date };
export type Arquivo = {
  id: string;
  nome: string;
  tamanho: string; // bigint chega como string no pg
  tipo: string;
  link_token: string | null;
  criado_em: Date;
};

/** Confirma que a pasta existe E é do usuário. Null = raiz, sempre válida. */
export async function pastaAcessivel(usuarioId: string, pastaId: string | null) {
  if (pastaId === null) return true;
  const linhas = await consulta(
    `SELECT 1 FROM pastas WHERE id = $1 AND usuario_id = $2`,
    [pastaId, usuarioId],
  );
  return linhas.length > 0;
}

export function listarPastas(usuarioId: string, pastaId: string | null) {
  return consulta<Pasta>(
    `SELECT id, nome, criado_em
       FROM pastas
      WHERE usuario_id = $1
        AND pai_id IS NOT DISTINCT FROM $2
      ORDER BY lower(nome)`,
    [usuarioId, pastaId],
  );
}

export function listarArquivos(usuarioId: string, pastaId: string | null) {
  return consulta<Arquivo>(
    `SELECT id, nome, tamanho, tipo, link_token, criado_em
       FROM arquivos
      WHERE usuario_id = $1
        AND pasta_id IS NOT DISTINCT FROM $2
      ORDER BY lower(nome)`,
    [usuarioId, pastaId],
  );
}

/** Trilha da raiz até a pasta atual, para o breadcrumb. */
export async function trilha(usuarioId: string, pastaId: string | null) {
  if (pastaId === null) return [] as Pasta[];
  const linhas = await consulta<Pasta & { profundidade: number }>(
    `WITH RECURSIVE subida AS (
       SELECT id, nome, pai_id, criado_em, 0 AS profundidade
         FROM pastas WHERE id = $1 AND usuario_id = $2
       UNION ALL
       SELECT p.id, p.nome, p.pai_id, p.criado_em, s.profundidade + 1
         FROM pastas p JOIN subida s ON p.id = s.pai_id
        WHERE p.usuario_id = $2
     )
     SELECT id, nome, criado_em, profundidade FROM subida ORDER BY profundidade DESC`,
    [pastaId, usuarioId],
  );
  return linhas;
}

export async function espacoUsado(usuarioId: string) {
  const linhas = await consulta<{ total: string }>(
    `SELECT COALESCE(SUM(tamanho), 0)::text AS total
       FROM arquivos WHERE usuario_id = $1`,
    [usuarioId],
  );
  return Number(linhas[0]?.total ?? 0);
}

export async function criarPasta(
  usuarioId: string,
  paiId: string | null,
  nome: string,
) {
  const linhas = await consulta<{ id: string }>(
    `INSERT INTO pastas (usuario_id, pai_id, nome) VALUES ($1, $2, $3)
     RETURNING id`,
    [usuarioId, paiId, nome],
  );
  return linhas[0].id;
}

export async function registrarArquivo(dados: {
  usuarioId: string;
  pastaId: string | null;
  nome: string;
  tamanho: number;
  tipo: string;
  blobId: string;
}) {
  await consulta(
    `INSERT INTO arquivos (usuario_id, pasta_id, nome, tamanho, tipo, blob_id)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      dados.usuarioId,
      dados.pastaId,
      dados.nome,
      dados.tamanho,
      dados.tipo,
      dados.blobId,
    ],
  );
}

export async function arquivoDoUsuario(usuarioId: string, arquivoId: string) {
  const linhas = await consulta<{ id: string; nome: string; tipo: string; blob_id: string }>(
    `SELECT id, nome, tipo, blob_id FROM arquivos
      WHERE id = $1 AND usuario_id = $2`,
    [arquivoId, usuarioId],
  );
  return linhas[0] ?? null;
}

export async function excluirArquivo(usuarioId: string, arquivoId: string) {
  const linhas = await consulta<{ blob_id: string }>(
    `DELETE FROM arquivos WHERE id = $1 AND usuario_id = $2 RETURNING blob_id`,
    [arquivoId, usuarioId],
  );
  if (linhas[0]) await apagarBlob(linhas[0].blob_id);
  return linhas.length > 0;
}

/**
 * ON DELETE CASCADE limpa as linhas dos descendentes, mas não os bytes no
 * volume. Junta os blobs da subárvore antes de apagar a pasta.
 */
export async function excluirPasta(usuarioId: string, pastaId: string) {
  const blobs = await consulta<{ blob_id: string }>(
    `WITH RECURSIVE descida AS (
       SELECT id FROM pastas WHERE id = $1 AND usuario_id = $2
       UNION ALL
       SELECT p.id FROM pastas p JOIN descida d ON p.pai_id = d.id
     )
     SELECT a.blob_id FROM arquivos a
      WHERE a.usuario_id = $2 AND a.pasta_id IN (SELECT id FROM descida)`,
    [pastaId, usuarioId],
  );

  const apagadas = await consulta<{ id: string }>(
    `DELETE FROM pastas WHERE id = $1 AND usuario_id = $2 RETURNING id`,
    [pastaId, usuarioId],
  );
  if (apagadas.length === 0) return false;

  await Promise.all(blobs.map((b) => apagarBlob(b.blob_id)));
  return true;
}

export async function definirLink(
  usuarioId: string,
  arquivoId: string,
  token: string | null,
) {
  const linhas = await consulta<{ link_token: string | null }>(
    `UPDATE arquivos SET link_token = $3
      WHERE id = $1 AND usuario_id = $2
      RETURNING link_token`,
    [arquivoId, usuarioId, token],
  );
  return linhas[0]?.link_token ?? null;
}

export async function arquivoPorLink(token: string) {
  const linhas = await consulta<{
    nome: string;
    tipo: string;
    blob_id: string;
    link_token: string;
  }>(
    `SELECT nome, tipo, blob_id, link_token FROM arquivos WHERE link_token = $1`,
    [token],
  );
  return linhas[0] ?? null;
}

export async function renomear(
  usuarioId: string,
  tipo: "arquivo" | "pasta",
  id: string,
  nome: string,
) {
  const tabela = tipo === "arquivo" ? "arquivos" : "pastas";
  const linhas = await consulta<{ id: string }>(
    `UPDATE ${tabela} SET nome = $3 WHERE id = $1 AND usuario_id = $2 RETURNING id`,
    [id, usuarioId, nome],
  );
  return linhas.length > 0;
}
