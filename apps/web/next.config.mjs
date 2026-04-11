import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'export',
  webpack(config) {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@watchllm/types': path.resolve(__dirname, '../../packages/types/src/index.ts'),
    };
    return config;
  },
};

export default nextConfig;
