/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  outputFileTracingRoot: process.cwd() + '/../../',
  // Compile the workspace packages from their TypeScript sources.
  transpilePackages: ['@mr-pdf/pdf-core', '@mr-pdf/ui'],
  webpack: (config) => {
    // pdf.js ships a worker that should not be parsed by Node polyfills.
    config.resolve.fallback = { ...config.resolve.fallback, canvas: false, fs: false };
    return config;
  },
  async rewrites() {
    const apiBase = process.env.API_PROXY_TARGET;
    if (!apiBase) return [];
    // Optionally proxy /api/jobs/* to the backend during local dev.
    return [{ source: '/api/backend/:path*', destination: `${apiBase}/:path*` }];
  },
};

export default nextConfig;
