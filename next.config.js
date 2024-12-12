const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  experimental: {
    outputStandalone: true,
  },
  env: {
    MONGODB_URI: 'mongodb+srv://Wudysoft:wudysoft@wudysoft.2hm26ic.mongodb.net/Api?retryWrites=true&w=majority&appName=Wudysoft',
  },
  headers: async () => [
    {
      source: '/api/:path*',
      headers: [
        { key: 'Access-Control-Allow-Origin', value: '*' },
        { key: 'Access-Control-Allow-Methods', value: 'POST, GET, PUT, DELETE, OPTIONS' },
        { key: 'Access-Control-Allow-Credentials', value: 'false' },
        { key: 'Access-Control-Max-Age', value: '86400' },
        { key: 'Access-Control-Allow-Headers', value: 'X-Requested-With, X-HTTP-Method-Override, Content-Type, Accept' },
      ],
    },
  ],
  images: {
    domains: ['malik-jmk.us.kg', 'cdn.weatherapi.com', 'tile.openstreetmap.org'],
    deviceSizes: [320, 420, 768, 1024, 1200],
    imageSizes: [16, 32, 48, 64, 96],
  },
  rewrites: async () => [
    {
      source: '/api/:slug*',
      destination: 'https://malik-jmk.us.kg/api/:slug*',
    },
  ],
};

module.exports = nextConfig;
