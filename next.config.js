/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    MONGODB_URI: 'mongodb+srv://Wudysoft:wudysoft@wudysoft.2hm26ic.mongodb.net/Api?retryWrites=true&w=majority&appName=Wudysoft',
    JWT_SECRET: 'JWT_SECRET',
  },
  images: {
    domains: ['malik-jmk.us.kg', 'cdn.weatherapi.com', 'tile.openstreetmap.org', 'www.chess.com'],
  },
}

module.exports = nextConfig
