"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  Download,
  File as IconeArquivo,
  Folder,
  Link2,
  Link2Off,
  MoreHorizontal,
  Pencil,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { alternarLink, excluirItem, renomearItem } from "@/app/drive/actions";
import type { Arquivo, Pasta } from "@/lib/drive";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatarData, formatarTamanho } from "@/lib/formato";

type Props = { pastas: Pasta[]; arquivos: Arquivo[] };

export function ListaItens({ pastas, arquivos }: Props) {
  const router = useRouter();
  const [processando, iniciar] = useTransition();
  const [renomeando, setRenomeando] = useState<string | null>(null);

  function executar(promessa: Promise<{ ok: boolean; erro?: string }>, sucesso?: string) {
    iniciar(async () => {
      const r = await promessa;
      if (r.ok) {
        if (sucesso) toast.success(sucesso);
        router.refresh();
      } else {
        toast.error(r.erro ?? "Não deu certo.");
      }
    });
  }

  function pedirNome(atual: string, tipo: "arquivo" | "pasta", id: string) {
    const nome = window.prompt("Novo nome:", atual);
    if (nome === null || nome === atual) return;
    setRenomeando(id);
    executar(renomearItem(tipo, id, nome).finally(() => setRenomeando(null)), "Renomeado.");
  }

  function confirmarExclusao(nome: string, tipo: "arquivo" | "pasta", id: string) {
    const aviso =
      tipo === "pasta"
        ? `Excluir a pasta "${nome}" e todo o conteúdo dela? Isso não tem volta.`
        : `Excluir "${nome}"? Isso não tem volta.`;
    if (!window.confirm(aviso)) return;
    executar(excluirItem(tipo, id), "Excluído.");
  }

  async function copiarLink(arquivoId: string, jaTem: boolean) {
    if (jaTem) {
      executar(alternarLink(arquivoId, false), "Link revogado.");
      return;
    }
    iniciar(async () => {
      const r = await alternarLink(arquivoId, true);
      if (!r.ok || !r.link) {
        toast.error(r.erro ?? "Não deu certo.");
        return;
      }
      const url = `${window.location.origin}${r.link}`;
      try {
        await navigator.clipboard.writeText(url);
        toast.success("Link copiado para a área de transferência.");
      } catch {
        // clipboard exige contexto seguro e permissão; sem ela, mostra a URL.
        toast.success(`Link criado: ${url}`);
      }
      router.refresh();
    });
  }

  if (pastas.length === 0 && arquivos.length === 0) {
    return (
      <div className="text-muted-foreground flex flex-col items-center gap-3 rounded-xl border border-dashed py-16 text-center">
        <IconeArquivo className="size-8" />
        <div>
          <p className="text-sm">Esta pasta está vazia.</p>
          <p className="mt-1 text-xs">Arraste arquivos para qualquer lugar da tela.</p>
        </div>
      </div>
    );
  }

  return (
    <ul className="divide-border bg-card divide-y rounded-xl border" data-processando={processando}>
      {pastas.map((pasta) => (
        <li key={pasta.id} className="flex items-center gap-3 px-4 py-3">
          <Folder className="text-muted-foreground size-5 shrink-0" />
          <Link
            href={`/drive/${pasta.id}`}
            className="min-w-0 flex-1 truncate font-medium hover:underline"
          >
            {pasta.nome}
          </Link>
          <span className="text-muted-foreground hidden text-xs sm:block">
            {formatarData.format(new Date(pasta.criado_em))}
          </span>
          <MenuItem
            desabilitado={processando || renomeando === pasta.id}
            aoRenomear={() => pedirNome(pasta.nome, "pasta", pasta.id)}
            aoExcluir={() => confirmarExclusao(pasta.nome, "pasta", pasta.id)}
          />
        </li>
      ))}

      {arquivos.map((arquivo) => (
        <li key={arquivo.id} className="flex items-center gap-3 px-4 py-3">
          <IconeArquivo className="text-muted-foreground size-5 shrink-0" />
          <a
            href={`/api/arquivo/${arquivo.id}`}
            className="min-w-0 flex-1 truncate font-medium hover:underline"
          >
            {arquivo.nome}
          </a>
          {arquivo.link_token ? (
            <span
              title="Tem link público"
              className="text-muted-foreground shrink-0"
            >
              <Link2 className="size-4" />
            </span>
          ) : null}
          <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
            {formatarTamanho(Number(arquivo.tamanho))}
          </span>
          <span className="text-muted-foreground hidden text-xs sm:block">
            {formatarData.format(new Date(arquivo.criado_em))}
          </span>
          <MenuItem
            desabilitado={processando}
            aoRenomear={() => pedirNome(arquivo.nome, "arquivo", arquivo.id)}
            aoExcluir={() => confirmarExclusao(arquivo.nome, "arquivo", arquivo.id)}
            aoBaixar={`/api/arquivo/${arquivo.id}`}
            temLink={Boolean(arquivo.link_token)}
            aoAlternarLink={() => copiarLink(arquivo.id, Boolean(arquivo.link_token))}
          />
        </li>
      ))}
    </ul>
  );
}

function MenuItem({
  desabilitado,
  aoRenomear,
  aoExcluir,
  aoBaixar,
  temLink,
  aoAlternarLink,
}: {
  desabilitado: boolean;
  aoRenomear: () => void;
  aoExcluir: () => void;
  aoBaixar?: string;
  temLink?: boolean;
  aoAlternarLink?: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="size-8 shrink-0" disabled={desabilitado}>
          <MoreHorizontal className="size-4" />
          <span className="sr-only">Ações</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {aoBaixar ? (
          <DropdownMenuItem asChild>
            <a href={aoBaixar}>
              <Download className="size-4" />
              Baixar
            </a>
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuItem onSelect={aoRenomear}>
          <Pencil className="size-4" />
          Renomear
        </DropdownMenuItem>
        {aoAlternarLink ? (
          <DropdownMenuItem onSelect={aoAlternarLink}>
            {temLink ? <Link2Off className="size-4" /> : <Link2 className="size-4" />}
            {temLink ? "Revogar link" : "Criar link público"}
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onSelect={aoExcluir}>
          <Trash2 className="size-4" />
          Excluir
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
