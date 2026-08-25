import { redirect } from "next/navigation";
import { usuarioAtual } from "@/lib/auth";
import { cadastrar } from "@/app/auth-actions";
import { FormAuth } from "@/components/form-auth";

export const dynamic = "force-dynamic";

export default async function Cadastrar() {
  if (await usuarioAtual()) redirect("/drive");
  return <FormAuth modo="cadastrar" acao={cadastrar} />;
}
