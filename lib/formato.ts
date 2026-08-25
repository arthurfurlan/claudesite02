const UNIDADES = ["B", "KB", "MB", "GB", "TB"];

export function formatarTamanho(bytes: number) {
  if (bytes === 0) return "0 B";
  const i = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    UNIDADES.length - 1,
  );
  const valor = bytes / Math.pow(1024, i);
  return `${valor.toFixed(i === 0 ? 0 : 1)} ${UNIDADES[i]}`;
}

export const formatarData = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
});
