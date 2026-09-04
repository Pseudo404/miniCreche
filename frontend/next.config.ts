import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  images: {
    unoptimized: true, // Requis pour l'export statique
  },
};

export default nextConfig;
