"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type Resultado = { ok: true; texto: string } | { ok: false; texto: string };

export function BotaoTesteEmail() {
  const [pendente, setPendente] = useState(false);
  const [resultado, setResultado] = useState<Resultado | null>(null);

  async function testar() {
    setPendente(true);
    setResultado(null);
    try {
      const r = await fetch("/api/teste-email", { method: "POST" });
      const dados = await r.json();
      if (!r.ok) {
        setResultado({ ok: false, texto: dados.erro ?? "Falha no envio." });
      } else if (dados.recusados?.length) {
        // Envio parcial não é sucesso: o MTA aceitou a mensagem e recusou
        // endereços, e sem isto a tela diria "enviado" para quem não recebeu.
        setResultado({
          ok: false,
          texto: `Recusados: ${dados.recusados.join(", ")}`,
        });
      } else {
        setResultado({
          ok: true,
          texto: `Enviado para ${dados.aceitos.length} destinatário(s).`,
        });
      }
    } catch {
      setResultado({ ok: false, texto: "Não foi possível falar com o servidor." });
    } finally {
      setPendente(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <Button
        type="button"
        variant="outline"
        onClick={testar}
        disabled={pendente}
        className="w-full"
      >
        {pendente ? <Loader2 className="size-4 animate-spin" /> : null}
        Teste de Email
      </Button>

      {resultado ? (
        <p
          role="status"
          className={
            resultado.ok
              ? "text-muted-foreground text-center text-xs"
              : "text-destructive text-center text-xs"
          }
        >
          {resultado.texto}
        </p>
      ) : null}
    </div>
  );
}
