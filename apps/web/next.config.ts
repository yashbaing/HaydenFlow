import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@nexora/shared', '@nexora/sdk'],
  serverExternalPackages: ['@coinbase/cdp-sdk', '@base-org/account'],
  turbopack: {},
  experimental: {
    optimizePackageImports: ['lucide-react', 'framer-motion'],
  },
};

export default nextConfig;
