import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

// O preset do shadcn consome `--font-sans`; o create-next-app expunha
// `--font-geist-sans`, e a fonte acabava ignorada em favor do serif padrão.
const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

/**
 * Função e não objeto estático: assim o nome é lido a cada requisição, e não
 * congelado no build. É o que permite a mesma imagem servir claudesite01 e
 * claudesite02 mudando só a variável no compose.
 */
export function generateMetadata(): Metadata {
  const site = process.env.SITE_NOME ?? "claudesite01";
  return {
    title: {
      default: `Meu drive · ${site}`,
      template: `%s · ${site}`,
    },
    description: "Seu drive virtual: envie arquivos arrastando para a tela.",
  };
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="bg-background min-h-full flex flex-col">
        {children}
        <Toaster position="top-center" />
      </body>
    </html>
  );
}
