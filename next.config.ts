import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["officeparser", "xlsx", "better-sqlite3"],
};

export default nextConfig;
