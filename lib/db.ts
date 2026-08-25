import { readFileSync } from "node:fs";
import { Pool } from "pg";

declare global {
  var __pgPool: Pool | undefined;
  var __pgReady: Promise<void> | undefined;
}

function createPool() {
  const comuns = {
    max: Number(process.env.DATABASE_POOL_MAX ?? 10),
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  };

  // Em dev, a URL inteira vem do .env.local — inclusive a senha, que ali é
  // descartável.
  const connectionString = process.env.DATABASE_URL;
  if (connectionString) return new Pool({ connectionString, ...comuns });

  /**
   * Em produção a senha não está em variável de ambiente nem no compose: ela
   * mora num arquivo fora do diretório da release, montado só-leitura no
   * container. Variável de ambiente aparece em `docker inspect` e nos logs de
   * quem der um `env`; arquivo com modo 600 não.
   */
  const arquivoSenha = process.env.PGPASSWORD_FILE;
  const password = arquivoSenha
    ? readFileSync(/*turbopackIgnore: true*/ arquivoSenha, "utf8").trim()
    : undefined;

  // Sem connectionString, o pg lê PGHOST/PGUSER/PGDATABASE do ambiente sozinho.
  if (!process.env.PGHOST) {
    throw new Error("Sem DATABASE_URL nem PGHOST. Veja .env.example.");
  }
  return new Pool({ password, ...comuns });
}

/**
 * Preguiçoso de propósito: `next build` importa este módulo para compilar as
 * rotas, e ali DATABASE_URL não existe. Conectar só na primeira query.
 */
export function pool() {
  globalThis.__pgPool ??= createPool();
  return globalThis.__pgPool;
}

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS usuarios (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    email      text NOT NULL UNIQUE,
    senha_hash text NOT NULL,
    criado_em  timestamptz NOT NULL DEFAULT now()
  );

  CREATE TABLE IF NOT EXISTS sessoes (
    token_hash text PRIMARY KEY,
    usuario_id uuid NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    expira_em  timestamptz NOT NULL,
    criado_em  timestamptz NOT NULL DEFAULT now()
  );
  CREATE INDEX IF NOT EXISTS sessoes_usuario_idx ON sessoes (usuario_id);

  CREATE TABLE IF NOT EXISTS pastas (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id uuid NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    pai_id     uuid REFERENCES pastas(id) ON DELETE CASCADE,
    nome       text NOT NULL,
    criado_em  timestamptz NOT NULL DEFAULT now()
  );

  /* Nome único dentro da mesma pasta. Em UNIQUE, NULLs nunca colidem entre si,
     então a raiz (pai_id IS NULL) precisa do seu próprio índice parcial. */
  CREATE UNIQUE INDEX IF NOT EXISTS pastas_nome_raiz_idx
    ON pastas (usuario_id, lower(nome)) WHERE pai_id IS NULL;
  CREATE UNIQUE INDEX IF NOT EXISTS pastas_nome_idx
    ON pastas (usuario_id, pai_id, lower(nome)) WHERE pai_id IS NOT NULL;

  CREATE TABLE IF NOT EXISTS arquivos (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id uuid NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    pasta_id   uuid REFERENCES pastas(id) ON DELETE CASCADE,
    nome       text NOT NULL,
    tamanho    bigint NOT NULL,
    tipo       text NOT NULL,
    blob_id    text NOT NULL UNIQUE,
    link_token text UNIQUE,
    criado_em  timestamptz NOT NULL DEFAULT now()
  );
  CREATE INDEX IF NOT EXISTS arquivos_pasta_idx
    ON arquivos (usuario_id, pasta_id, criado_em DESC);
`;

/** Migração idempotente rodada na primeira query. */
export function ready() {
  globalThis.__pgReady ??= pool()
    .query(SCHEMA)
    .then(() => undefined);
  return globalThis.__pgReady;
}

export async function consulta<T extends object>(
  sql: string,
  valores: unknown[] = [],
) {
  await ready();
  const { rows } = await pool().query<T>(sql, valores);
  return rows;
}
