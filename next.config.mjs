/** @type {import('next').NextConfig} */
const nextConfig = {
  // Add any custom config here
}

const withPWA = (await import("@ducanh2912/next-pwa")).default({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  // Import the custom service worker for push notification handling
  // This injects importScripts('/custom-sw.js') into the generated sw.js
  extendDefaultRuntimeCaching: true,
  workboxOptions: {
    importScripts: ['/custom-sw.js'],
  },
});

export default withPWA(nextConfig)
