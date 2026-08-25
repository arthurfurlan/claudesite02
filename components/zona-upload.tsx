"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CloudUpload, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";
import { formatarTamanho } from "@/lib/formato";

type EmEnvio = { nome: string; enviado: number; total: number };

export function ZonaUpload({
  pastaId,
  children,
}: {
  pastaId: string | null;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [arrastando, setArrastando] = useState(false);
  const [fila, setFila] = useState<EmEnvio[]>([]);
  const [atual, setAtual] = useState<EmEnvio | null>(null);
  // dragenter/dragleave disparam ao cruzar cada elemento filho; sem contador, o
  // overlay pisca ao passar o cursor sobre a lista.
  const profundidade = useRef(0);

  const enviarUm = useCallback(
    (arquivo: File) =>
      new Promise<void>((resolve) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", "/api/upload");
        xhr.setRequestHeader("x-arquivo-nome", encodeURIComponent(arquivo.name));
        xhr.setRequestHeader(
          "x-arquivo-tipo",
          arquivo.type || "application/octet-stream",
        );
        if (pastaId) xhr.setRequestHeader("x-pasta-id", pastaId);

        // XHR e não fetch: só ele expõe progresso de upload.
        xhr.upload.onprogress = (e) => {
          setAtual({ nome: arquivo.name, enviado: e.loaded, total: e.total });
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            toast.success(`${arquivo.name} enviado`);
          } else {
            let mensagem = "Falha no envio.";
            try {
              mensagem = JSON.parse(xhr.responseText).erro ?? mensagem;
            } catch {}
            toast.error(`${arquivo.name}: ${mensagem}`);
          }
          resolve();
        };
        xhr.onerror = () => {
          toast.error(`${arquivo.name}: falha de rede.`);
          resolve();
        };

        xhr.send(arquivo);
      }),
    [pastaId],
  );

  const enviar = useCallback(
    async (arquivos: File[]) => {
      if (arquivos.length === 0) return;
      setFila(arquivos.map((a) => ({ nome: a.name, enviado: 0, total: a.size })));

      // Um de cada vez: o servidor tem 1 vCPU, e enviar tudo em paralelo só
      // divide a mesma banda em barras que andam todas devagar.
      for (const arquivo of arquivos) {
        await enviarUm(arquivo);
      }

      setFila([]);
      setAtual(null);
      router.refresh();
    },
    [enviarUm, router],
  );

  useEffect(() => {
    const temArquivos = (e: DragEvent) =>
      Array.from(e.dataTransfer?.types ?? []).includes("Files");

    const aoEntrar = (e: DragEvent) => {
      if (!temArquivos(e)) return;
      profundidade.current += 1;
      setArrastando(true);
    };
    const aoSobrepor = (e: DragEvent) => {
      if (temArquivos(e)) e.preventDefault(); // sem isso o browser abre o arquivo
    };
    const aoSair = () => {
      profundidade.current = Math.max(0, profundidade.current - 1);
      if (profundidade.current === 0) setArrastando(false);
    };
    const aoSoltar = (e: DragEvent) => {
      if (!temArquivos(e)) return;
      e.preventDefault();
      profundidade.current = 0;
      setArrastando(false);
      enviar(Array.from(e.dataTransfer?.files ?? []));
    };

    window.addEventListener("dragenter", aoEntrar);
    window.addEventListener("dragover", aoSobrepor);
    window.addEventListener("dragleave", aoSair);
    window.addEventListener("drop", aoSoltar);
    return () => {
      window.removeEventListener("dragenter", aoEntrar);
      window.removeEventListener("dragover", aoSobrepor);
      window.removeEventListener("dragleave", aoSair);
      window.removeEventListener("drop", aoSoltar);
    };
  }, [enviar]);

  const enviando = fila.length > 0;

  return (
    <>
      {children}

      {arrastando ? (
        <div className="bg-background/80 pointer-events-none fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm">
          <div className="border-primary text-primary flex flex-col items-center gap-3 rounded-xl border-2 border-dashed px-12 py-10">
            <CloudUpload className="size-10" />
            <p className="font-medium">Solte para enviar</p>
          </div>
        </div>
      ) : null}

      {enviando ? (
        <div
          role="status"
          aria-live="polite"
          className="bg-card fixed right-4 bottom-4 z-40 w-80 rounded-xl border p-4 shadow-lg"
        >
          <div className="flex items-center gap-2">
            <Loader2 className="size-4 shrink-0 animate-spin" />
            <p className="truncate text-sm font-medium">
              {atual?.nome ?? fila[0]?.nome}
            </p>
          </div>
          <Progress
            className="mt-3"
            value={atual && atual.total > 0 ? (atual.enviado / atual.total) * 100 : 0}
          />
          <p className="text-muted-foreground mt-2 text-xs tabular-nums">
            {atual
              ? `${formatarTamanho(atual.enviado)} de ${formatarTamanho(atual.total)}`
              : "Preparando…"}
            {fila.length > 1 ? ` · ${fila.length} arquivos` : ""}
          </p>
        </div>
      ) : null}
    </>
  );
}
