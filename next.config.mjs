/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Exclude kam-nexus directory from build
  webpack: (config, { isServer }) => {
    config.module.rules.push({
      test: /kam-nexus/,
      loader: 'ignore-loader'
    });
    return config;
  },
}

export default nextConfig
