import type { NextConfig } from 'next'

const isProd = process.env.NODE_ENV === 'production'

const nextConfig: NextConfig = {
  output: 'export',
  basePath: isProd ? '/CoranBuilding' : '',
  assetPrefix: isProd ? '/CoranBuilding/' : '',
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  // Variable accessible dans tous les composants client via process.env.NEXT_PUBLIC_BASE_PATH
  env: {
    NEXT_PUBLIC_BASE_PATH: isProd ? '/CoranBuilding' : '',
  },
  webpack: (config) => {
    // Required for @huggingface/transformers to run in the browser
    config.resolve.alias = {
      ...config.resolve.alias,
      'sharp$': false,
      'onnxruntime-node$': false,
    }
    return config
  },
}

export default nextConfig
