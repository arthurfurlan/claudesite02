import Link from "next/link";
import { redirect } from "next/navigation";
import { CloudUpload, FolderTree, Link2 } from "lucide-react";
import { usuarioAtual } from "@/lib/auth";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

const RECURSOS = [
  { Icone: CloudUpload, titulo: "Arraste e solte", texto: "Solte arquivos em qualquer lugar da tela para enviar." },
  { Icone: FolderTree, titulo: "Pastas", texto: "Organize em pastas dentro de pastas, como você quiser." },
  { Icone: Link2, titulo: "Link público", texto: "Gere um link secreto por arquivo e revogue quando quiser." },
];

export default async function Home() {
  if (await usuarioAtual()) redirect("/drive");

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-10 px-4 py-16 sm:py-24">
      <header className="flex flex-col gap-3">
        <h1 className="text-3xl font-semibold tracking-tight">Seu drive virtual</h1>
        <p className="text-muted-foreground">
          Crie uma conta e comece a subir arquivos na hora. 1 GB de espaço, sem
          configurar nada.
        </p>
        <div className="mt-2 flex gap-3">
          <Button asChild>
            <Link href="/cadastrar">Criar conta</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/entrar">Entrar</Link>
          </Button>
        </div>
      </header>

      <ul className="flex flex-col gap-4 sm:flex-row">
        {RECURSOS.map(({ Icone, titulo, texto }) => (
          <li key={titulo} className="bg-card flex-1 rounded-xl border p-4">
            <Icone className="text-muted-foreground size-5" />
            <p className="mt-3 font-medium">{titulo}</p>
            <p className="text-muted-foreground mt-1 text-sm">{texto}</p>
          </li>
        ))}
      </ul>
    </main>
  );
}
