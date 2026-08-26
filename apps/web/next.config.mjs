/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: [
    "@check-grammar/engine",
    "@check-grammar/protocol",
    "@check-grammar/corpus",
  ],
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
