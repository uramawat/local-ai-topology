import { resolve } from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep Next's workspace boundary at this repository when a parent directory
  // happens to contain another lockfile (as it does on local developer Macs).
  turbopack: { root: resolve(process.cwd()) },
};

export default nextConfig;
