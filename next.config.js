const {
  createSecureHeaders
} = require("next-secure-headers");
const securityHeaders = createSecureHeaders({
  frameGuard: "sameorigin",
  xssProtection: "block-rendering",
  referrerPolicy: "no-referrer-when-downgrade"
}).concat([{
  key: "Content-Security-Policy",
  value: "upgrade-insecure-requests"
}, {
  key: "Permissions-Policy",
  value: "camera=(), microphone=(), geolocation=(), browsing-topics=()"
}]);
const nextConfig = {
  reactStrictMode: true,
  env: {
    MONGODB_URI: "mongodb+srv://Wudysoft:wudysoft@wudysoft.2hm26ic.mongodb.net/Api?retryWrites=true&w=majority&appName=Wudysoft",
    JWT_SECRET: "JWT_SECRET",
    DOMAIN_URL: "api.malik-jmk.web.id",
    ANALYZE: "true"
  },
  images: {
    domains: ["api.malik-jmk.web.id", "cdn.weatherapi.com", "tile.openstreetmap.org", "www.chess.com", "deckofcardsapi.com"]
  },
  async headers() {
    return [{
      source: "/(.*)",
      headers: securityHeaders
    }];
  }
};
module.exports = nextConfig;