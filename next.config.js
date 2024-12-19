const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  experimental: {
    scrollRestoration: true,
  },
  env: {
    MONGODB_URI: 'mongodb+srv://Wudysoft:wudysoft@wudysoft.2hm26ic.mongodb.net/Api?retryWrites=true&w=majority&appName=Wudysoft',
    JWT_SECRET: 'JWT_SECRET',
  },
  images: {
    domains: ['malik-jmk.us.kg', 'cdn.weatherapi.com', 'tile.openstreetmap.org'],
    deviceSizes: [640, 750, 1080, 1920],
    formats: ['image/avif', 'image/webp'],
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = { fs: false, net: false, tls: false };
    }
    return config;
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'https://malik-jmk.us.kg/:path*',
      },
    ];
  },
  i18n: {
    locales: ['en', 'id'],
    defaultLocale: 'id',
  },
  compress: true,
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
