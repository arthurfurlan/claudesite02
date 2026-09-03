import { redirect } from "next/navigation";
import { usuarioAtual } from "@/lib/auth";
import { entrar } from "@/app/auth-actions";
import { FormAuth } from "@/components/form-auth";

export const dynamic = "force-dynamic";

export default async function Entrar() {
  if (await usuarioAtual()) redirect("/drive");
  // O fundo é só desta página: o token --background continua valendo no resto.
  // `flex-1` porque o body é `min-h-full flex flex-col` — sem ele a cor iria só
  // até onde o formulário termina.
  return (
    <div className="flex flex-1 flex-col bg-purple-200 dark:bg-purple-950">
      <FormAuth modo="entrar" acao={entrar} />
    </div>
  );
}
