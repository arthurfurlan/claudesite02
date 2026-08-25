"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { consulta } from "@/lib/db";
import {
  conferirSenha,
  criarSessao,
  encerrarSessao,
  gerarHash,
  normalizarEmail,
} from "@/lib/auth";

export type EstadoAuth = { erro?: string };

const esquema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email("E-mail inválido.")),
  senha: z.string().min(8, "A senha precisa de pelo menos 8 caracteres."),
});

export async function cadastrar(
  _anterior: EstadoAuth,
  formData: FormData,
): Promise<EstadoAuth> {
  const analise = esquema.safeParse({
    email: formData.get("email"),
    senha: formData.get("senha"),
  });
  if (!analise.success) return { erro: analise.error.issues[0].message };

  const email = normalizarEmail(analise.data.email);
  const senhaHash = await gerarHash(analise.data.senha);

  // ON CONFLICT em vez de SELECT-depois-INSERT: entre a checagem e a escrita
  // cabe outro cadastro com o mesmo e-mail.
  const linhas = await consulta<{ id: string }>(
    `INSERT INTO usuarios (email, senha_hash) VALUES ($1, $2)
     ON CONFLICT (email) DO NOTHING
     RETURNING id`,
    [email, senhaHash],
  );

  if (linhas.length === 0) return { erro: "Esse e-mail já tem conta." };

  await criarSessao(linhas[0].id);
  redirect("/drive");
}

export async function entrar(
  _anterior: EstadoAuth,
  formData: FormData,
): Promise<EstadoAuth> {
  const analise = esquema.safeParse({
    email: formData.get("email"),
    senha: formData.get("senha"),
  });
  if (!analise.success) return { erro: "E-mail ou senha incorretos." };

  const email = normalizarEmail(analise.data.email);
  const linhas = await consulta<{ id: string; senha_hash: string }>(
    `SELECT id, senha_hash FROM usuarios WHERE email = $1`,
    [email],
  );

  const usuario = linhas[0];
  // Mensagem única para e-mail inexistente e senha errada: distingui-las
  // transforma o formulário num verificador de quem tem conta aqui.
  if (!usuario || !(await conferirSenha(usuario.senha_hash, analise.data.senha))) {
    return { erro: "E-mail ou senha incorretos." };
  }

  await criarSessao(usuario.id);
  redirect("/drive");
}

export async function sair() {
  await encerrarSessao();
  redirect("/");
}
