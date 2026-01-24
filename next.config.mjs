/** @type {import('next').NextConfig} */
import { spawnSync } from "node:child_process";
import withSerwistInit from "@serwist/next";

const nextConfig = {
  // Add any custom config here
  // Required for Next.js 16+ with PWA plugins
  turbopack: {},
}

// Get git revision for cache busting
const revision = spawnSync("git", ["rev-parse", "HEAD"], { encoding: "utf-8" }).stdout?.trim() ?? crypto.randomUUID();

const withSerwist = withSerwistInit({
  additionalPrecacheEntries: [{ url: "/~offline", revision }],
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  // Disable in development
  disable: process.env.NODE_ENV === "development",
});

export default withSerwist(nextConfig);
