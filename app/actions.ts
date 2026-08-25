"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";
import { criarRecado } from "@/lib/db";
import { salvarFoto } from "@/lib/storage";
import { TAMANHO_MAXIMO, TIPOS_ACEITOS } from "@/lib/constantes";

export type EstadoForm = {
  ok: boolean;
  erro?: string;
  campo?: "autor" | "mensagem" | "foto";
};

const esquema = z.object({
  autor: z
    .string()
    .trim()
    .min(2, "Escreva seu nome (mínimo 2 caracteres).")
    .max(40, "Nome muito longo (máximo 40 caracteres)."),
  mensagem: z
    .string()
    .trim()
    .min(1, "Escreva um recado.")
    .max(500, "Recado muito longo (máximo 500 caracteres)."),
});

/**
 * Throttle em memória: some no restart e não é compartilhado entre réplicas.
 * Segura spam casual num mural aberto; não substitui um rate limit no proxy
 * se o site pegar tráfego hostil de verdade.
 */
const ultimoPost = new Map<string, number>();
const INTERVALO_MINIMO = 10_000;

async function identificarCliente() {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || h.get("x-real-ip") || "desconhecido";
}

export async function publicarRecado(
  _anterior: EstadoForm,
  formData: FormData,
): Promise<EstadoForm> {
  const analise = esquema.safeParse({
    autor: formData.get("autor"),
    mensagem: formData.get("mensagem"),
  });

  if (!analise.success) {
    const problema = analise.error.issues[0];
    return {
      ok: false,
      erro: problema.message,
      campo: problema.path[0] as EstadoForm["campo"],
    };
  }

  const cliente = await identificarCliente();
  const agora = Date.now();
  const anterior = ultimoPost.get(cliente);
  if (anterior && agora - anterior < INTERVALO_MINIMO) {
    const espera = Math.ceil((INTERVALO_MINIMO - (agora - anterior)) / 1000);
    return { ok: false, erro: `Aguarde ${espera}s para publicar de novo.` };
  }

  const foto = formData.get("foto");
  let salva = null;

  if (foto instanceof File && foto.size > 0) {
    if (!TIPOS_ACEITOS.includes(foto.type as (typeof TIPOS_ACEITOS)[number])) {
      return { ok: false, erro: "Formato aceito: JPEG, PNG, WebP ou GIF.", campo: "foto" };
    }
    if (foto.size > TAMANHO_MAXIMO) {
      return { ok: false, erro: "A foto passa de 5 MB.", campo: "foto" };
    }
    try {
      salva = await salvarFoto(foto);
    } catch {
      return { ok: false, erro: "Não consegui processar essa imagem.", campo: "foto" };
    }
  }

  await criarRecado({
    autor: analise.data.autor,
    mensagem: analise.data.mensagem,
    fotoId: salva?.id ?? null,
    fotoLargura: salva?.largura ?? null,
    fotoAltura: salva?.altura ?? null,
  });

  ultimoPost.set(cliente, agora);
  revalidatePath("/");
  return { ok: true };
}
