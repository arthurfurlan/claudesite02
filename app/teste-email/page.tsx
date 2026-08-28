import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { usuarioAtual } from "@/lib/auth";
import { FormTesteEmail } from "@/components/form-teste-email";

export const dynamic = "force-dynamic";

/**
 * Atrás do login, e não na tela de entrar como era antes: a rota passou a
 * aceitar destinatário, assunto e corpo do cliente, e uma página pública que
 * faz isso é um relay aberto — qualquer um manda o e-mail que quiser pelo
 * servidor, com o SPF do domínio validando a mensagem.
 */
export default async function TesteEmail() {
  const usuario = await usuarioAtual();
  if (!usuario) redirect("/entrar");

  return (
    <main className="mx-auto flex w-full max-w-sm flex-col gap-6 px-4 py-8">
      <Link
        href="/drive"
        className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-sm"
      >
        <ChevronLeft className="size-4" />
        Voltar ao drive
      </Link>
      <FormTesteEmail />
    </main>
  );
}
