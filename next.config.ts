/**
 * Next configuration: transpiles the workspace UI kit, which ships
 * TypeScript source rather than built output.
 */
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@jumbo/ui"],
};

export default nextConfig;
