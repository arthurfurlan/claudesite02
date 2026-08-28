"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  MAX_ASSUNTO,
  MAX_CORPO,
  MAX_DESTINATARIOS,
  PADRAO,
  separarDestinatarios,
} from "@/lib/teste-email";

type Resultado = { ok: boolean; texto: string };

export function FormTesteEmail() {
  const [destinatarios, setDestinatarios] = useState(PADRAO.destinatarios);
  const [assunto, setAssunto] = useState(PADRAO.assunto);
  const [corpo, setCorpo] = useState(PADRAO.corpo);
  const [pendente, setPendente] = useState(false);
  const [resultado, setResultado] = useState<Resultado | null>(null);

  // Só para a contagem na tela. Quem decide o que é válido é a rota: validação
  // no cliente é conveniência, e qualquer um pode chamar a API direto.
  const quantos = separarDestinatarios(destinatarios).length;
  const demais = quantos > MAX_DESTINATARIOS;

  async function enviar(evento: React.FormEvent) {
    evento.preventDefault();
    setPendente(true);
    setResultado(null);
    try {
      const r = await fetch("/api/teste-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ destinatarios, assunto, corpo }),
      });
      const dados = await r.json();
      if (!r.ok) {
        setResultado({ ok: false, texto: dados.erro ?? "Falha no envio." });
      } else if (dados.recusados?.length) {
        // Envio parcial não é sucesso: o MTA aceita a mensagem e recusa
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
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <h2 className="text-sm font-medium">Teste de Email</h2>
        <p className="text-muted-foreground text-xs">
          Já vem preenchido. Ajuste o que quiser antes de enviar.
        </p>
      </div>

      <Card>
        <CardContent>
          <form onSubmit={enviar} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="destinatarios">Destinatários</Label>
              <Textarea
                id="destinatarios"
                value={destinatarios}
                onChange={(e) => setDestinatarios(e.target.value)}
                rows={2}
                aria-invalid={demais}
                required
              />
              <p
                className={
                  demais
                    ? "text-destructive text-xs"
                    : "text-muted-foreground text-xs"
                }
              >
                {quantos} de no máximo {MAX_DESTINATARIOS}. Separe por vírgula ou
                quebra de linha.
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="assunto">Assunto</Label>
              <Input
                id="assunto"
                value={assunto}
                onChange={(e) => setAssunto(e.target.value)}
                maxLength={MAX_ASSUNTO}
                required
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="corpo">Corpo</Label>
              <Textarea
                id="corpo"
                value={corpo}
                onChange={(e) => setCorpo(e.target.value)}
                maxLength={MAX_CORPO}
                rows={5}
                required
              />
            </div>

            {resultado ? (
              <p
                role="status"
                className={
                  resultado.ok
                    ? "text-muted-foreground rounded-md px-3 py-2 text-sm"
                    : "text-destructive bg-destructive/10 rounded-md px-3 py-2 text-sm"
                }
              >
                {resultado.texto}
              </p>
            ) : null}

            <Button
              type="submit"
              variant="outline"
              disabled={pendente || demais}
              className="w-full"
            >
              {pendente ? <Loader2 className="size-4 animate-spin" /> : null}
              Enviar teste
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
