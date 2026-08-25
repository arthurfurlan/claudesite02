import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Gera um bundle enxuto com só as deps usadas — a imagem Docker fica pequena.
  output: "standalone",
};

export default nextConfig;
