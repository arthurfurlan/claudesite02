import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronRight, HardDrive, LogOut } from "lucide-react";
import { usuarioAtual } from "@/lib/auth";
import { sair } from "@/app/auth-actions";
import {
  COTA_BYTES,
  espacoUsado,
  listarArquivos,
  listarPastas,
  pastaAcessivel,
  trilha,
} from "@/lib/drive";
import { TAMANHO_MAXIMO } from "@/lib/storage";
import { ListaItens } from "@/components/lista-itens";
import { NovaPasta } from "@/components/nova-pasta";
import { ZonaUpload } from "@/components/zona-upload";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { formatarTamanho } from "@/lib/formato";

export const dynamic = "force-dynamic";

export default async function Drive({
  params,
}: {
  params: Promise<{ pasta?: string[] }>;
}) {
  const usuario = await usuarioAtual();
  if (!usuario) redirect("/entrar");

  const { pasta } = await params;
  const pastaId = pasta?.[0] ?? null;

  // Sem esta checagem, um id de pasta de outra pessoa listaria o conteúdo dela.
  if (!(await pastaAcessivel(usuario.id, pastaId))) notFound();

  const [caminho, pastas, arquivos, usado] = await Promise.all([
    trilha(usuario.id, pastaId),
    listarPastas(usuario.id, pastaId),
    listarArquivos(usuario.id, pastaId),
    espacoUsado(usuario.id),
  ]);

  return (
    <ZonaUpload pastaId={pastaId}>
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8">
        <header className="flex items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-2">
            <HardDrive className="size-5 shrink-0" />
            <span className="truncate font-semibold">Meu drive</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-muted-foreground hidden truncate text-sm sm:block">
              {usuario.email}
            </span>
            <form action={sair}>
              <Button type="submit" variant="ghost" size="sm">
                <LogOut className="size-4" />
                Sair
              </Button>
            </form>
          </div>
        </header>

        <nav aria-label="Caminho" className="flex flex-wrap items-center gap-1 text-sm">
          <Link
            href="/drive"
            className={
              caminho.length === 0
                ? "font-medium"
                : "text-muted-foreground hover:text-foreground"
            }
          >
            Início
          </Link>
          {caminho.map((p, i) => (
            <span key={p.id} className="flex items-center gap-1">
              <ChevronRight className="text-muted-foreground size-3.5" />
              <Link
                href={`/drive/${p.id}`}
                className={
                  i === caminho.length - 1
                    ? "font-medium"
                    : "text-muted-foreground hover:text-foreground"
                }
              >
                {p.nome}
              </Link>
            </span>
          ))}
        </nav>

        <div className="flex items-center justify-between gap-4">
          <NovaPasta paiId={pastaId} />
          <p className="text-muted-foreground text-xs">
            Até {formatarTamanho(TAMANHO_MAXIMO)} por arquivo
          </p>
        </div>

        <ListaItens pastas={pastas} arquivos={arquivos} />

        <div className="flex flex-col gap-2">
          <Progress value={(usado / COTA_BYTES) * 100} />
          <p className="text-muted-foreground text-xs tabular-nums">
            {formatarTamanho(usado)} de {formatarTamanho(COTA_BYTES)} usados
          </p>
        </div>
      </main>
    </ZonaUpload>
  );
}
