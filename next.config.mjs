import { withPayload } from '@payloadcms/next/withPayload'
import path from 'path'
import { fileURLToPath } from 'url'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@payload-config': path.resolve(dirname, './src/payload.config.ts'),
    }
    return config
  },
}


const withPWA = (await import("@ducanh2912/next-pwa")).default({
  dest: "public",

});

export default withPayload(withPWA(nextConfig))

