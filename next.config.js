const withPWA = require("@ducanh2912/next-pwa").default({
  dest: "public",
  register: true,
  skipWaiting: true,
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  swcMinify: true,
  disable: false,
  workboxOptions: {
    disableDevLogs: true,
    exclude: [/\/api\//, /\/_next\/data\//],
    runtimeCaching: [
      {
        urlPattern: /\/api\//,
        handler: "NetworkOnly",
        options: {
          cacheName: "api-no-cache",
        },
      },
      {
        urlPattern: /^https?.*/,
        handler: "NetworkFirst",
        options: {
          cacheName: "offlineCache",
          expiration: {
            maxEntries: 200,
          },
          matchOptions: {
            ignoreSearch: true,
          },
        },
      },
    ],
  }
});

const apiConfig = {
  DOMAIN_URL: process.env.DOMAIN_URL || "wudysoft.xyz",
  JWT_SECRET: process.env.NEXTAUTH_SECRET,
  LIMIT_POINTS: 100,
  LIMIT_DURATION: 60,
  PAGE_LIMIT_POINTS: 30,
  PAGE_LIMIT_DURATION: 60,
  IS_PRODUCTION: process.env.NODE_ENV === "production"
};

const apiAllowOrigin = `https://${apiConfig.DOMAIN_URL}`;

const securityHeaders = [
  {
    key: "X-DNS-Prefetch-Control",
    value: "on"
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains"
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff"
  },
  {
    key: "X-Frame-Options",
    value: "DENY"
  },
  {
    key: "X-XSS-Protection",
    value: "1; mode=block"
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin"
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()"
  }
];

const nextConfig = withPWA({
  reactStrictMode: true,
  swcMinify: true,
  productionBrowserSourceMaps: false,
  compress: true,
  poweredByHeader: false,
  trailingSlash: false,
  
  async headers() {
    return [
      {
        source: "/",
        headers: securityHeaders
      },
      {
        source: "/:path*",
        headers: securityHeaders
      },
      {
        source: "/:path(sw.js|workbox-.*.js|manifest.json)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=0, must-revalidate"
          },
          {
            key: "Service-Worker-Allowed",
            value: "/"
          },
          {
            key: "Access-Control-Allow-Origin",
            value: "*"
          }
        ]
      },
      {
        source: "/assets/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable"
          },
          {
            key: "Access-Control-Allow-Origin",
            value: "*"
          }
        ]
      },
      {
        source: "/:path*.(jpg|jpeg|png|gif|svg|ico|webp|avif|bmp|tiff)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable"
          },
          {
            key: "Access-Control-Allow-Origin",
            value: "*"
          }
        ]
      },
      {
        source: "/:path*.(mp4|webm|ogg|mp3|wav|flac|aac|m4a|oga|weba|mov|avi)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable"
          },
          {
            key: "Access-Control-Allow-Origin",
            value: "*"
          }
        ]
      },
      {
        source: "/api/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0"
          },
          {
            key: "Pragma",
            value: "no-cache"
          },
          {
            key: "Expires",
            value: "0"
          },
          {
            key: "Access-Control-Allow-Credentials",
            value: "true"
          },
          {
            key: "Access-Control-Allow-Origin",
            value: apiAllowOrigin
          },
          {
            key: "Access-Control-Allow-Methods",
            value: "GET, POST, PUT, DELETE, OPTIONS, PATCH, HEAD"
          },
          {
            key: "Access-Control-Allow-Headers",
            value: "Content-Type, Authorization, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Date, X-Api-Version, Origin, X-CSRF-Token"
          }
        ]
      },
      {
        source: "/_next/static/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable"
          },
          {
            key: "Access-Control-Allow-Origin",
            value: "*"
          }
        ]
      },
      {
        source: "/_next/image/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable"
          },
          {
            key: "Access-Control-Allow-Origin",
            value: "*"
          }
        ]
      },
      {
        source: "/_next/data/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0"
          },
          {
            key: "Pragma",
            value: "no-cache"
          },
          {
            key: "Expires",
            value: "0"
          },
          {
            key: "Access-Control-Allow-Origin",
            value: "*"
          }
        ]
      }
    ];
  },
  
  experimental: {
    appDir: true,
    nextScriptWorkers: true,
    serverActions: {
      bodySizeLimit: "5gb"
    },
    amp: {
      skipValidation: true
    }
  },
  
  images: {
    domains: [
      apiConfig.DOMAIN_URL, 
      `www.${apiConfig.DOMAIN_URL}`, 
      "cdn.weatherapi.com", 
      "tile.openstreetmap.org", 
      "www.chess.com", 
      "deckofcardsapi.com", 
      "raw.githubusercontent.com"
    ],
    minimumCacheTTL: 60,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**"
      }
    ],
    dangerouslyAllowSVG: true,
    contentDispositionType: "attachment"
  },
  
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "/api/:path*"
      },
      {
        source: "/static/:path*",
        destination: "/:path*"
      }
    ];
  },
  
  async redirects() {
    return [
      {
        source: "/public/:path*",
        destination: "/:path*",
        permanent: true
      }
    ];
  },
  
  webpack: (config, { dev, isServer }) => {
    config.externals.push({
      "utf-8-validate": "commonjs utf-8-validate",
      bufferutil: "commonjs bufferutil"
    });
    
    config.module.rules.push({
      test: /\.(jpg|jpeg|png|gif|svg|webp|avif)$/,
      type: "asset/resource",
      generator: {
        filename: "static/media/[name].[hash][ext]"
      }
    });
    
    if (!dev && !isServer) {
      const WebpackObfuscator = require("webpack-obfuscator");
      config.plugins.push(
        new WebpackObfuscator({
          compact: true,
          renameGlobals: false,
          identifierNamesGenerator: "hexadecimal",
          log: false,
          stringArray: true,
          stringArrayRotate: true,
          stringArrayShuffle: true,
          stringArrayThreshold: 0.75,
          unicodeEscapeSequence: false,
          controlFlowFlattening: false,
          deadCodeInjection: false,
          selfDefending: false,
          disableConsoleOutput: true
        })
      );
      
      const webpack = require('webpack');
      config.plugins.push(
        new webpack.BannerPlugin({
          banner: `Build Time: ${new Date().toISOString()}`,
          entryOnly: true,
          include: /\.(js|ts)$/
        })
      );
    }
    return config;
  },
  
  staticPageGenerationTimeout: 120,
  onDemandEntries: {
    maxInactiveAge: 25 * 1000,
    pagesBufferLength: 5
  },
  
  generateEtags: false,
  
  compress: true,
  
  webpackDevMiddleware: (config) => {
    config.watchOptions = {
      poll: 1000,
      aggregateTimeout: 300,
    };
    return config;
  },
});

module.exports = nextConfig;