// @ts-check
import createJiti from "jiti";
import { fileURLToPath } from "node:url";
const jiti = createJiti(fileURLToPath(import.meta.url));

jiti("./env");

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'react.dev',
        port: '',
        pathname: '/**',
        search: '',
      },
    ],
  },
}
 
export default nextConfig;