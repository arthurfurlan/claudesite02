import { redirect } from "next/navigation";
import { usuarioAtual } from "@/lib/auth";
import { entrar } from "@/app/auth-actions";
import { FormAuth } from "@/components/form-auth";
import { BotaoTesteEmail } from "@/components/botao-teste-email";

export const dynamic = "force-dynamic";

export default async function Entrar() {
  if (await usuarioAtual()) redirect("/drive");
  return (
    <>
      <FormAuth modo="entrar" acao={entrar} />
      <div className="mx-auto w-full max-w-sm px-4 pb-16">
        <BotaoTesteEmail />
      </div>
    </>
  );
}
