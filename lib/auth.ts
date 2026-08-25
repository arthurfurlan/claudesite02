import "server-only";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { hash, verify } from "@node-rs/argon2";
import { consulta } from "@/lib/db";

const COOKIE = "sessao";
const DURACAO_DIAS = 30;

export type Usuario = { id: string; email: string; criado_em: Date };

export function normalizarEmail(email: string) {
  return email.trim().toLowerCase();
}

/**
 * Sem passar `algorithm`: o default da lib já é argon2id (conferido — o hash sai
 * com prefixo $argon2id$). Nomear o enum aqui não compila, porque ele é `const
 * enum` e o projeto usa isolatedModules.
 */
export function gerarHash(senha: string) {
  return hash(senha);
}

export async function conferirSenha(senhaHash: string, senha: string) {
  try {
    return await verify(senhaHash, senha);
  } catch {
    return false;
  }
}

/**
 * O cookie leva o token cru; o banco guarda só o SHA-256 dele. Um vazamento de
 * leitura no banco não entrega sessões utilizáveis. SHA-256 sem KDF basta aqui
 * porque o token já é 256 bits aleatórios — não há o que forçar por dicionário.
 */
function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function criarSessao(usuarioId: string) {
  const token = randomBytes(32).toString("base64url");
  const expira = new Date(Date.now() + DURACAO_DIAS * 24 * 60 * 60 * 1000);

  await consulta(
    `INSERT INTO sessoes (token_hash, usuario_id, expira_em) VALUES ($1, $2, $3)`,
    [hashToken(token), usuarioId, expira],
  );

  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expira,
  });
}

export async function encerrarSessao() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) {
    await consulta(`DELETE FROM sessoes WHERE token_hash = $1`, [
      hashToken(token),
    ]);
  }
  jar.delete(COOKIE);
}

export async function usuarioAtual(): Promise<Usuario | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;

  const linhas = await consulta<Usuario>(
    `SELECT u.id, u.email, u.criado_em
       FROM sessoes s
       JOIN usuarios u ON u.id = s.usuario_id
      WHERE s.token_hash = $1 AND s.expira_em > now()`,
    [hashToken(token)],
  );
  return linhas[0] ?? null;
}

/** Para rotas que não existem sem usuário. Lança em vez de devolver null. */
export async function exigirUsuario() {
  const usuario = await usuarioAtual();
  if (!usuario) throw new Error("não autenticado");
  return usuario;
}

/**
 * Compara em tempo constante. Usado no link público: comparar token com === faz
 * o tempo de resposta variar com o prefixo acertado.
 */
export function tokensIguais(a: string, b: string) {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}
