"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import type { EstadoAuth } from "@/app/auth-actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Props = {
  modo: "entrar" | "cadastrar";
  acao: (anterior: EstadoAuth, formData: FormData) => Promise<EstadoAuth>;
};

const TEXTO = {
  entrar: {
    titulo: "Entrar",
    subtitulo: "Acesse seu drive.",
    botao: "Entrar",
    dica: "Ainda não tem conta?",
    linkTexto: "Criar conta",
    href: "/cadastrar",
  },
  cadastrar: {
    titulo: "Criar conta",
    subtitulo: "Crie sua conta e comece a subir arquivos.",
    botao: "Criar conta",
    dica: "Já tem conta?",
    linkTexto: "Entrar",
    href: "/entrar",
  },
} as const;

export function FormAuth({ modo, acao }: Props) {
  const [estado, enviar, pendente] = useActionState(acao, {} as EstadoAuth);
  const t = TEXTO[modo];

  return (
    <div className="mx-auto flex w-full max-w-sm flex-col gap-6 px-4 py-16">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">{t.titulo}</h1>
        <p className="text-muted-foreground text-sm">{t.subtitulo}</p>
      </div>

      <Card>
        <CardContent>
          <form action={enviar} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="voce@exemplo.com"
                required
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="senha">Senha</Label>
              <Input
                id="senha"
                name="senha"
                type="password"
                autoComplete={modo === "entrar" ? "current-password" : "new-password"}
                minLength={8}
                required
              />
              {modo === "cadastrar" ? (
                <p className="text-muted-foreground text-xs">Mínimo de 8 caracteres.</p>
              ) : null}
            </div>

            {estado.erro ? (
              <p
                role="alert"
                className="text-destructive bg-destructive/10 rounded-md px-3 py-2 text-sm"
              >
                {estado.erro}
              </p>
            ) : null}

            <Button type="submit" disabled={pendente} className="w-full">
              {pendente ? <Loader2 className="size-4 animate-spin" /> : null}
              {t.botao}
            </Button>
          </form>
        </CardContent>
      </Card>

      <p className="text-muted-foreground text-center text-sm">
        {t.dica}{" "}
        <Link href={t.href} className="text-foreground underline underline-offset-4">
          {t.linkTexto}
        </Link>
      </p>
    </div>
  );
}
