import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,

  // Enable standalone output for Docker
  output: 'standalone',

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },

  // Turbopack configuration for canvas stub
  turbopack: {
    resolveAlias: {
      canvas: './canvas-stub.js',
    },
  },
};

export default nextConfig;
