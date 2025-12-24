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
    // ========== PERBAIKAN: Exclude API routes dari caching PWA ==========
    exclude: [/\/api\//, /\/_next\/data\//],
    runtimeCaching: [
      {
        urlPattern: /\/api\//,
        handler: "NetworkOnly",
        options: {
          cacheName: "api-no-cache",
          networkTimeoutSeconds: 10,
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

const { createSecureHeaders } = require("next-secure-headers");

const apiConfig = {
  DOMAIN_URL: process.env.DOMAIN_URL || "wudysoft.xyz",
  JWT_SECRET: process.env.NEXTAUTH_SECRET,
  LIMIT_POINTS: 100,
  LIMIT_DURATION: 60,
  PAGE_LIMIT_POINTS: 30,
  PAGE_LIMIT_DURATION: 60,
  IS_PRODUCTION: process.env.NODE_ENV === "production"
};

const allowedOrigins = `https://${apiConfig.DOMAIN_URL} https://*.${apiConfig.DOMAIN_URL}`;
const apiAllowOrigin = `https://${apiConfig.DOMAIN_URL}`;

const securityHeaders = [
  ...createSecureHeaders({
    frameGuard: "deny",
    xssProtection: "block-rendering",
    referrerPolicy: "strict-origin-when-cross-origin"
  }),
  {
    key: "Content-Security-Policy",
    value: `
      default-src 'self';
      script-src 'self' 'unsafe-inline' 'unsafe-eval' ${allowedOrigins};
      style-src 'self' 'unsafe-inline' ${allowedOrigins};
      img-src 'self' data: blob: https: ${allowedOrigins} cdn.weatherapi.com tile.openstreetmap.org www.chess.com deckofcardsapi.com raw.githubusercontent.com;
      media-src 'self' data: blob: https: ${allowedOrigins};
      font-src 'self' data: ${allowedOrigins};
      connect-src 'self' ${allowedOrigins};
      frame-src 'none';
      object-src 'none';
      base-uri 'self';
      form-action 'self';
      frame-ancestors 'none';
      block-all-mixed-content;
      upgrade-insecure-requests;
    `.replace(/\s+/g, " ").trim()
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()"
  },
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
      // Service Worker dan PWA files
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
          },
          {
            key: "Access-Control-Allow-Methods",
            value: "GET, HEAD, OPTIONS"
          },
          {
            key: "Access-Control-Allow-Headers",
            value: "*"
          }
        ]
      },
      // Assets umum
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
          },
          {
            key: "Access-Control-Allow-Methods",
            value: "GET, HEAD, OPTIONS"
          },
          {
            key: "Access-Control-Allow-Headers",
            value: "*"
          },
          {
            key: "Access-Control-Expose-Headers",
            value: "Content-Length, Content-Range, Content-Type, Content-Disposition"
          },
          {
            key: "Access-Control-Max-Age",
            value: "86400"
          }
        ]
      },
      // Images
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
          },
          {
            key: "Access-Control-Allow-Methods",
            value: "GET, HEAD, OPTIONS"
          },
          {
            key: "Access-Control-Allow-Headers",
            value: "*"
          },
          {
            key: "Access-Control-Expose-Headers",
            value: "Content-Length, Content-Type"
          }
        ]
      },
      // Media files
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
          },
          {
            key: "Access-Control-Allow-Methods",
            value: "GET, HEAD, OPTIONS"
          },
          {
            key: "Access-Control-Allow-Headers",
            value: "Range, Content-Type"
          },
          {
            key: "Accept-Ranges",
            value: "bytes"
          }
        ]
      },
      // Documents
      {
        source: "/:path*.(pdf|doc|docx|xls|xlsx|ppt|pptx|txt|rtf|md)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable"
          },
          {
            key: "Access-Control-Allow-Origin",
            value: "*"
          },
          {
            key: "Access-Control-Allow-Methods",
            value: "GET, HEAD, OPTIONS"
          },
          {
            key: "Access-Control-Allow-Headers",
            value: "Content-Type"
          },
          {
            key: "Content-Disposition",
            value: "inline"
          }
        ]
      },
      // Data files
      {
        source: "/:path*.(json|xml|csv|yml|yaml|js|ts)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable"
          },
          {
            key: "Access-Control-Allow-Origin",
            value: "*"
          },
          {
            key: "Access-Control-Allow-Methods",
            value: "GET, HEAD, OPTIONS"
          },
          {
            key: "Access-Control-Allow-Headers",
            value: "Content-Type"
          },
          {
            key: "Content-Type",
            value: "application/json; charset=utf-8"
          }
        ]
      },
      // Fonts
      {
        source: "/:path*.(woff|woff2|ttf|eot|otf|sfnt)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable"
          },
          {
            key: "Access-Control-Allow-Origin",
            value: "*"
          },
          {
            key: "Access-Control-Allow-Methods",
            value: "GET, HEAD, OPTIONS"
          },
          {
            key: "Access-Control-Allow-Headers",
            value: "Content-Type"
          }
        ]
      },
      // Archive files
      {
        source: "/:path*.(zip|rar|7z|tar|gz|bz2)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable"
          },
          {
            key: "Access-Control-Allow-Origin",
            value: "*"
          },
          {
            key: "Access-Control-Allow-Methods",
            value: "GET, HEAD, OPTIONS"
          },
          {
            key: "Content-Disposition",
            value: "attachment"
          }
        ]
      },
      // ========== PERBAIKAN: API routes dengan NO CACHE ==========
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
            key: "Surrogate-Control",
            value: "no-store"
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
            value: "Content-Type, Authorization, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Date, X-Api-Version, Origin, X-CSRF-Token, Range, Cache-Control, Pragma"
          },
          {
            key: "Access-Control-Expose-Headers",
            value: "Content-Length, Content-Range, Cache-Control, Expires, Pragma"
          },
          {
            key: "Access-Control-Max-Age",
            value: "86400"
          }
        ]
      },
      // Next.js internal files
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
          },
          {
            key: "Access-Control-Allow-Methods",
            value: "GET, HEAD, OPTIONS"
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
          },
          {
            key: "Access-Control-Allow-Methods",
            value: "GET, HEAD, OPTIONS"
          }
        ]
      },
      // ========== PERBAIKAN: _next/data juga perlu no-cache ==========
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
          },
          {
            key: "Access-Control-Allow-Methods",
            value: "GET, HEAD, OPTIONS"
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
    domains: [apiConfig.DOMAIN_URL, `www.${apiConfig.DOMAIN_URL}`, "cdn.weatherapi.com", "tile.openstreetmap.org", "www.chess.com", "deckofcardsapi.com", "raw.githubusercontent.com"],
    minimumCacheTTL: 60,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**"
      }
    ],
    dangerouslyAllowSVG: true,
    contentDispositionType: "attachment",
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;"
  },
  
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        has: [
          {
            type: "header",
            key: "access-control-request-method"
          }
        ],
        destination: "/api/:path*"
      },
      {
        source: "/static/:path*",
        destination: "/:path*"
      },
      // ========== PERBAIKAN: Rewrite untuk menghindari cache ==========
      {
        source: "/api/no-cache/:path*",
        destination: "/api/:path*",
        has: [
          {
            type: "query",
            key: "_t"
          }
        ]
      }
    ];
  },
  
  async redirects() {
    return [
      {
        source: "/public/:path*",
        destination: "/:path*",
        permanent: true
      },
      // ========== PERBAIKAN: Redirect untuk force refresh ==========
      {
        source: "/api/refresh/:path*",
        destination: "/api/:path*?refresh=true&_t=:timestamp",
        has: [
          {
            type: "header",
            key: "Cache-Control",
            value: "no-cache"
          }
        ],
        permanent: false
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
    
    // ========== PERBAIKAN: Tambahkan webpack plugin untuk no-cache ==========
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
      
      // Tambahkan banner untuk cache busting
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
  
  // ========== PERBAIKAN: Tambahkan generateEtags false untuk API ==========
  generateEtags: false,
  
  // ========== PERBAIKAN: Compress tapi exclude API ==========
  compress: true,
  
  // ========== PERBAIKAN: Cache untuk development ==========
  webpackDevMiddleware: (config) => {
    config.watchOptions = {
      poll: 1000,
      aggregateTimeout: 300,
    };
    return config;
  },
});

module.exports = nextConfig;