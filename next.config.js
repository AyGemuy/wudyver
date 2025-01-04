const nextConfig = {
  reactStrictMode: true,
  env: {
    MONGODB_URI: "mongodb+srv://Wudysoft:wudysoft@wudysoft.2hm26ic.mongodb.net/Api?retryWrites=true&w=majority&appName=Wudysoft",
    JWT_SECRET: "JWT_SECRET",
    DOMAIN_URL: "api.malik-jmk.web.id"
  },
  images: {
    domains: ["api.malik-jmk.web.id", "cdn.weatherapi.com", "tile.openstreetmap.org", "www.chess.com", "deckofcardsapi.com"]
  }
};
module.exports = nextConfig;