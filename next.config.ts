import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    // Skip type checking during build
    ignoreBuildErrors: true,
  },
  eslint: {
    // Skip ESLint during build
    ignoreDuringBuilds: true,
  },
  // Skip static generation for API routes during build
  output: 'standalone',
  // Skip prerendering entirely during build
  generateBuildId: async () => {
    return 'build-' + Date.now()
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Suppress Sequelize dynamic require warnings
      config.externals.push({
        'pg-hstore': 'commonjs pg-hstore',
      });
      config.ignoreWarnings = [
        { module: /node_modules\/sequelize/ },
      ];
    }
    return config;
  },
};

export default nextConfig;
