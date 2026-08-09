import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Workspace-пакет отдаётся как TypeScript-исходники, его нужно транспилировать.
  transpilePackages: ['@expence-tracker/database'],
  typedRoutes: true,
};

export default nextConfig;
