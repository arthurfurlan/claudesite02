import { Pool } from "pg";

declare global {
  // Reaproveita o pool entre hot-reloads do dev, senão cada reload abre um novo.
  var __pgPool: Pool | undefined;
  var __pgReady: Promise<void> | undefined;
}

function createPool() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL não definida. Veja .env.example.");
  }
  return new Pool({
    connectionString,
    max: Number(process.env.DATABASE_POOL_MAX ?? 10),
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  });
}

/**
 * Preguiçoso de propósito: `next build` importa este módulo para compilar as
 * rotas, e ali DATABASE_URL não existe. Conectar só na primeira query.
 */
function pool() {
  globalThis.__pgPool ??= createPool();
  return globalThis.__pgPool;
}

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS recados (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    autor        text NOT NULL,
    mensagem     text NOT NULL,
    foto_id      text,
    foto_largura integer,
    foto_altura  integer,
    criado_em    timestamptz NOT NULL DEFAULT now()
  );
  CREATE INDEX IF NOT EXISTS recados_criado_em_idx ON recados (criado_em DESC);
`;

/**
 * Migração idempotente rodada na primeira query. Um init script em
 * docker-entrypoint-initdb.d só roda com o volume vazio, o que quebraria
 * em qualquer deploy subsequente.
 */
async function migrate() {
  await pool().query(SCHEMA);
}

export function ready() {
  globalThis.__pgReady ??= migrate();
  return globalThis.__pgReady;
}

export type Recado = {
  id: string;
  autor: string;
  mensagem: string;
  foto_id: string | null;
  foto_largura: number | null;
  foto_altura: number | null;
  criado_em: Date;
};

export async function listarRecados(limite = 100): Promise<Recado[]> {
  await ready();
  const { rows } = await pool().query<Recado>(
    `SELECT id, autor, mensagem, foto_id, foto_largura, foto_altura, criado_em
       FROM recados
      ORDER BY criado_em DESC
      LIMIT $1`,
    [limite],
  );
  return rows;
}

export async function criarRecado(dados: {
  autor: string;
  mensagem: string;
  fotoId: string | null;
  fotoLargura: number | null;
  fotoAltura: number | null;
}) {
  await ready();
  await pool().query(
    `INSERT INTO recados (autor, mensagem, foto_id, foto_largura, foto_altura)
     VALUES ($1, $2, $3, $4, $5)`,
    [
      dados.autor,
      dados.mensagem,
      dados.fotoId,
      dados.fotoLargura,
      dados.fotoAltura,
    ],
  );
}
