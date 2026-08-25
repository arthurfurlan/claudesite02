"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { exigirUsuario } from "@/lib/auth";
import {
  criarPasta,
  definirLink,
  excluirArquivo,
  excluirPasta,
  pastaAcessivel,
  renomear,
} from "@/lib/drive";

export type Resultado = { ok: boolean; erro?: string; link?: string };

/** Barra separador de caminho e nomes especiais que confundiriam a navegação. */
const nomeValido = z
  .string()
  .trim()
  .min(1, "Escreva um nome.")
  .max(255, "Nome muito longo.")
  .refine((n) => !/[\/\\]/.test(n), "O nome não pode ter barras.")
  .refine((n) => n !== "." && n !== "..", "Nome inválido.");

export async function novaPasta(
  paiId: string | null,
  nome: string,
): Promise<Resultado> {
  const usuario = await exigirUsuario();

  const analise = nomeValido.safeParse(nome);
  if (!analise.success) return { ok: false, erro: analise.error.issues[0].message };

  if (!(await pastaAcessivel(usuario.id, paiId))) {
    return { ok: false, erro: "Pasta não encontrada." };
  }

  try {
    await criarPasta(usuario.id, paiId, analise.data);
  } catch (e) {
    // 23505 = unique_violation, o índice de nome único dentro da pasta.
    if (typeof e === "object" && e && "code" in e && e.code === "23505") {
      return { ok: false, erro: "Já existe uma pasta com esse nome aqui." };
    }
    throw e;
  }

  revalidatePath("/drive", "layout");
  return { ok: true };
}

export async function excluirItem(
  tipo: "arquivo" | "pasta",
  id: string,
): Promise<Resultado> {
  const usuario = await exigirUsuario();

  const removeu =
    tipo === "arquivo"
      ? await excluirArquivo(usuario.id, id)
      : await excluirPasta(usuario.id, id);

  if (!removeu) return { ok: false, erro: "Item não encontrado." };

  revalidatePath("/drive", "layout");
  return { ok: true };
}

export async function renomearItem(
  tipo: "arquivo" | "pasta",
  id: string,
  nome: string,
): Promise<Resultado> {
  const usuario = await exigirUsuario();

  const analise = nomeValido.safeParse(nome);
  if (!analise.success) return { ok: false, erro: analise.error.issues[0].message };

  try {
    const ok = await renomear(usuario.id, tipo, id, analise.data);
    if (!ok) return { ok: false, erro: "Item não encontrado." };
  } catch (e) {
    if (typeof e === "object" && e && "code" in e && e.code === "23505") {
      return { ok: false, erro: "Já existe um item com esse nome aqui." };
    }
    throw e;
  }

  revalidatePath("/drive", "layout");
  return { ok: true };
}

export async function alternarLink(
  arquivoId: string,
  ativar: boolean,
): Promise<Resultado> {
  const usuario = await exigirUsuario();

  // 24 bytes = 192 bits de entropia. O link é a única credencial de acesso, e
  // ninguém adivinha isso por força bruta.
  const token = ativar ? randomBytes(24).toString("base64url") : null;
  const gravado = await definirLink(usuario.id, arquivoId, token);

  if (ativar && !gravado) return { ok: false, erro: "Arquivo não encontrado." };

  revalidatePath("/drive", "layout");
  return { ok: true, link: gravado ? `/l/${gravado}` : undefined };
}
