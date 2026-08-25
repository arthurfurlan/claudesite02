"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { publicarRecado, type EstadoForm } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { TAMANHO_MAXIMO, TIPOS_ACEITOS } from "@/lib/constantes";

const LIMITE_MENSAGEM = 500;
const inicial: EstadoForm = { ok: false };

export function RecadoForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const inputFotoRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [mensagem, setMensagem] = useState("");

  // O pós-processamento fica aqui, e não num efeito sobre `estado`: reagir ao
  // resultado com setState dentro de useEffect dispara renders em cascata.
  const [estado, acao, pendente] = useActionState(
    async (anterior: EstadoForm, formData: FormData) => {
      const resultado = await publicarRecado(anterior, formData);
      if (resultado.ok) {
        formRef.current?.reset();
        setMensagem("");
        limparFoto();
        toast.success("Recado publicado!");
      } else if (resultado.erro) {
        toast.error(resultado.erro);
      }
      return resultado;
    },
    inicial,
  );

  // Revoga a object URL anterior para não vazar memória a cada troca de foto.
  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  function aoEscolherFoto(evento: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = evento.target.files?.[0];
    if (!arquivo) return;

    if (!TIPOS_ACEITOS.includes(arquivo.type as (typeof TIPOS_ACEITOS)[number])) {
      toast.error("Formato aceito: JPEG, PNG, WebP ou GIF.");
      evento.target.value = "";
      return;
    }
    if (arquivo.size > TAMANHO_MAXIMO) {
      toast.error("A foto passa de 5 MB.");
      evento.target.value = "";
      return;
    }

    setPreview(URL.createObjectURL(arquivo));
  }

  function limparFoto() {
    setPreview(null);
    if (inputFotoRef.current) inputFotoRef.current.value = "";
  }

  return (
    <Card>
      <CardContent>
        <form ref={formRef} action={acao} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="autor">Seu nome</Label>
            <Input
              id="autor"
              name="autor"
              placeholder="Como você quer aparecer no mural"
              maxLength={40}
              required
              aria-invalid={estado.campo === "autor"}
            />
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-baseline justify-between">
              <Label htmlFor="mensagem">Recado</Label>
              <span className="text-muted-foreground text-xs tabular-nums">
                {mensagem.length}/{LIMITE_MENSAGEM}
              </span>
            </div>
            <Textarea
              id="mensagem"
              name="mensagem"
              placeholder="Escreva alguma coisa…"
              rows={4}
              maxLength={LIMITE_MENSAGEM}
              required
              value={mensagem}
              onChange={(e) => setMensagem(e.target.value)}
              aria-invalid={estado.campo === "mensagem"}
              className="resize-none"
            />
          </div>

          <input
            ref={inputFotoRef}
            id="foto"
            name="foto"
            type="file"
            accept={TIPOS_ACEITOS.join(",")}
            onChange={aoEscolherFoto}
            className="sr-only"
          />

          {preview ? (
            <div className="relative w-fit">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={preview}
                alt="Pré-visualização da foto anexada"
                className="max-h-48 rounded-lg border object-cover"
              />
              <Button
                type="button"
                variant="secondary"
                size="icon"
                onClick={limparFoto}
                className="absolute top-2 right-2 size-7 rounded-full shadow-sm"
                aria-label="Remover foto"
              >
                <X className="size-4" />
              </Button>
            </div>
          ) : null}

          <div className="flex items-center justify-between gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => inputFotoRef.current?.click()}
            >
              <ImagePlus className="size-4" />
              {preview ? "Trocar foto" : "Anexar foto"}
            </Button>

            <Button type="submit" disabled={pendente}>
              {pendente ? <Loader2 className="size-4 animate-spin" /> : null}
              {pendente ? "Publicando…" : "Publicar"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
