"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { FolderPlus } from "lucide-react";
import { toast } from "sonner";
import { novaPasta } from "@/app/drive/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function NovaPasta({ paiId }: { paiId: string | null }) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [nome, setNome] = useState("");
  const [salvando, iniciar] = useTransition();

  function salvar(evento: React.FormEvent) {
    evento.preventDefault();
    iniciar(async () => {
      const r = await novaPasta(paiId, nome);
      if (r.ok) {
        toast.success("Pasta criada.");
        setNome("");
        setAberto(false);
        router.refresh();
      } else {
        toast.error(r.erro ?? "Não deu certo.");
      }
    });
  }

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <FolderPlus className="size-4" />
          Nova pasta
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={salvar} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>Nova pasta</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Label htmlFor="nome-pasta">Nome</Label>
            <Input
              id="nome-pasta"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              maxLength={255}
              autoFocus
              required
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={salvando || nome.trim() === ""}>
              Criar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
