import { MessageSquareDashed } from "lucide-react";
import { listarRecados } from "@/lib/db";
import { RecadoCard } from "@/components/recado-card";
import { RecadoForm } from "@/components/recado-form";
import { Separator } from "@/components/ui/separator";

// O mural precisa refletir o último recado publicado, então nada de cache estático.
export const dynamic = "force-dynamic";

export default async function Home() {
  const recados = await listarRecados();

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-4 py-10 sm:py-16">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Mural de recados</h1>
        <p className="text-muted-foreground text-sm">
          Deixe uma mensagem — e uma foto, se quiser.
        </p>
      </header>

      <RecadoForm />

      <div className="flex items-center gap-4">
        <Separator className="flex-1" />
        <span className="text-muted-foreground text-xs whitespace-nowrap">
          {recados.length === 0
            ? "Nenhum recado ainda"
            : `${recados.length} ${recados.length === 1 ? "recado" : "recados"}`}
        </span>
        <Separator className="flex-1" />
      </div>

      {recados.length === 0 ? (
        <div className="text-muted-foreground flex flex-col items-center gap-3 py-12 text-center">
          <MessageSquareDashed className="size-8" />
          <p className="text-sm">O mural está vazio. Seja o primeiro a escrever.</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-4">
          {recados.map((recado) => (
            <li key={recado.id}>
              <RecadoCard recado={recado} />
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
