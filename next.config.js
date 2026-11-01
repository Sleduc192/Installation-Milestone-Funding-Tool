/** @type {import('next').NextConfig} */
// NEXT_PUBLIC_BASE_PATH=/funding mounts this app under the Seamless Home Hub.
// Next prefixes pages and /_next assets with that path, so the hub rewrite of
// /funding and /funding/:path* reaches this deployment without asset collisions.
// Leave it unset to keep the standalone site at the domain root.
const basePath = (process.env.NEXT_PUBLIC_BASE_PATH || "").replace(/\/$/, "");

const nextConfig = {
  ...(basePath ? { basePath } : {}),
  productionBrowserSourceMaps: false,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  images: { unoptimized: true },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.output.filename = 'static/chunks/[name]-[contenthash:8].js';
      config.output.chunkFilename = 'static/chunks/[contenthash:16].js';
    }
    return config;
  },
};

module.exports = nextConfig;
