/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@check-grammar/engine", "@check-grammar/protocol"],
  webpack: (config, { dev }) => {
    if (dev) {
      config.watchOptions = {
        ignored: ["**/node_modules/**", "**/.git/**", "**/.next/**"],
      };
    }
    return config;
  },
};
export default nextConfig;
