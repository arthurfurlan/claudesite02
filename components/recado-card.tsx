import Image from "next/image";
import type { Recado } from "@/lib/db";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";

const formatador = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
});

function iniciais(nome: string) {
  return nome
    .split(/\s+/)
    .slice(0, 2)
    .map((parte) => parte[0]?.toUpperCase() ?? "")
    .join("");
}

export function RecadoCard({ recado }: { recado: Recado }) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <Avatar className="size-9">
            <AvatarFallback>{iniciais(recado.autor)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate font-medium">{recado.autor}</p>
            <time
              dateTime={recado.criado_em.toISOString()}
              className="text-muted-foreground text-xs"
            >
              {formatador.format(recado.criado_em)}
            </time>
          </div>
        </div>

        <p className="text-sm leading-relaxed whitespace-pre-wrap">
          {recado.mensagem}
        </p>

        {recado.foto_id && recado.foto_largura && recado.foto_altura ? (
          <Image
            src={`/api/media/${recado.foto_id}`}
            alt={`Foto anexada por ${recado.autor}`}
            width={recado.foto_largura}
            height={recado.foto_altura}
            sizes="(max-width: 640px) 100vw, 600px"
            className="h-auto w-full rounded-lg border"
          />
        ) : null}
      </CardContent>
    </Card>
  );
}
