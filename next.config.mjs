/** @type {import('next').NextConfig} */
const nextConfig = {
  // Add any custom config here
}

const withPWA = (await import("@ducanh2912/next-pwa")).default({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  customWorkerSrc: "public",
  customWorkerDest: "public",
  customWorkerPrefix: "custom-sw",
});

export default withPWA(nextConfig)

