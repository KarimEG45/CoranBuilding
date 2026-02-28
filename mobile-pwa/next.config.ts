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
