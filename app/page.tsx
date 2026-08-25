import { redirect } from "next/navigation";
import { usuarioAtual } from "@/lib/auth";

// A index não renderiza nada: decide o destino e desvia. `force-dynamic` porque
// a decisão depende do cookie de sessão, que não existe em tempo de build.
export const dynamic = "force-dynamic";

export default async function Home() {
  redirect((await usuarioAtual()) ? "/drive" : "/entrar");
}
