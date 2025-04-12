import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Configuração para lidar com arquivos de fonte do Playwright
  webpack: (config) => {
    // Adicionar regra para arquivos de fonte
    config.module.rules.push({
      test: /\.(woff|woff2|eot|ttf|otf)$/i,
      type: 'asset/resource',
    });

    return config;
  },
};

export default nextConfig;
