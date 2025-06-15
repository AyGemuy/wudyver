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
  experimental: {
    appDir: true
  },
  images: {
    domains: ["wudysoft.xyz", "cdn.weatherapi.com", "tile.openstreetmap.org", "www.chess.com", "deckofcardsapi.com"]
  },
  async headers() {
    return [{
      source: "/(.*)",
      headers: securityHeaders
    }];
  },
  webpack: (config, {
    buildId,
    dev,
    isServer,
    defaultLoaders,
    webpack
  }) => {
    config.externals.push({
      "utf-8-validate": "commonjs utf-8-validate",
      bufferutil: "commonjs bufferutil"
    });
    return config;
  }
};
module.exports = nextConfig;