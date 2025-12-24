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
    disableDevLogs: true
  }
});
const {
  createSecureHeaders
} = require("next-secure-headers");
const apiConfig = {
  DOMAIN_URL: "wudysoft.xyz",
  IS_PRODUCTION: true
};
const allowedOrigins = `https://${apiConfig.DOMAIN_URL} https://*.${apiConfig.DOMAIN_URL}`;
const apiAllowOrigin = `https://${apiConfig.DOMAIN_URL}`;
const securityHeaders = [...createSecureHeaders({
  frameGuard: "deny",
  xssProtection: "block-rendering",
  referrerPolicy: "strict-origin-when-cross-origin"
}), {
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
}, {
  key: "Permissions-Policy",
  value: "camera=(), microphone=(), geolocation=(), interest-cohort=()"
}, {
  key: "X-DNS-Prefetch-Control",
  value: "on"
}, {
  key: "Strict-Transport-Security",
  value: "max-age=31536000; includeSubDomains"
}, {
  key: "X-Content-Type-Options",
  value: "nosniff"
}, {
  key: "X-Frame-Options",
  value: "DENY"
}, {
  key: "X-XSS-Protection",
  value: "1; mode=block"
}, {
  key: "Referrer-Policy",
  value: "strict-origin-when-cross-origin"
}];
const nextConfig = withPWA({
  reactStrictMode: true,
  swcMinify: true,
  productionBrowserSourceMaps: false,
  compress: true,
  poweredByHeader: false,
  trailingSlash: false,
  async headers() {
    return [{
      source: "/",
      headers: securityHeaders
    }, {
      source: "/(.*\\.(html|js|css|ts|tsx|jsx))",
      headers: securityHeaders
    }, {
      source: "/:path(sw.js|workbox-.*.js|manifest.json)",
      headers: [{
        key: "Cache-Control",
        value: "public, max-age=0, must-revalidate"
      }, {
        key: "Service-Worker-Allowed",
        value: "/"
      }, {
        key: "Access-Control-Allow-Origin",
        value: "*"
      }, {
        key: "Access-Control-Allow-Methods",
        value: "GET, HEAD, OPTIONS"
      }, {
        key: "Access-Control-Allow-Headers",
        value: "*"
      }]
    }, {
      source: "/:path*",
      headers: [{
        key: "Cache-Control",
        value: "public, max-age=31536000, immutable"
      }, {
        key: "Access-Control-Allow-Origin",
        value: "*"
      }, {
        key: "Access-Control-Allow-Methods",
        value: "GET, HEAD, OPTIONS"
      }, {
        key: "Access-Control-Allow-Headers",
        value: "*"
      }]
    }, {
      source: "/assets/:path*",
      headers: [{
        key: "Cache-Control",
        value: "public, max-age=31536000, immutable"
      }, {
        key: "Access-Control-Allow-Origin",
        value: "*"
      }, {
        key: "Access-Control-Allow-Methods",
        value: "GET, HEAD, OPTIONS"
      }, {
        key: "Access-Control-Allow-Headers",
        value: "*"
      }, {
        key: "Access-Control-Expose-Headers",
        value: "Content-Length, Content-Range, Content-Type, Content-Disposition"
      }, {
        key: "Access-Control-Max-Age",
        value: "86400"
      }]
    }, {
      source: "/:path*.(jpg|jpeg|png|gif|svg|ico|webp|avif|bmp|tiff)",
      headers: [{
        key: "Cache-Control",
        value: "public, max-age=31536000, immutable"
      }, {
        key: "Access-Control-Allow-Origin",
        value: "*"
      }, {
        key: "Access-Control-Allow-Methods",
        value: "GET, HEAD, OPTIONS"
      }, {
        key: "Access-Control-Allow-Headers",
        value: "*"
      }, {
        key: "Access-Control-Expose-Headers",
        value: "Content-Length, Content-Type"
      }]
    }, {
      source: "/:path*.(mp4|webm|ogg|mp3|wav|flac|aac|m4a|oga|weba|mov|avi)",
      headers: [{
        key: "Cache-Control",
        value: "public, max-age=31536000, immutable"
      }, {
        key: "Access-Control-Allow-Origin",
        value: "*"
      }, {
        key: "Access-Control-Allow-Methods",
        value: "GET, HEAD, OPTIONS"
      }, {
        key: "Access-Control-Allow-Headers",
        value: "Range, Content-Type"
      }, {
        key: "Accept-Ranges",
        value: "bytes"
      }]
    }, {
      source: "/:path*.(pdf|doc|docx|xls|xlsx|ppt|pptx|txt|rtf|md)",
      headers: [{
        key: "Cache-Control",
        value: "public, max-age=31536000, immutable"
      }, {
        key: "Access-Control-Allow-Origin",
        value: "*"
      }, {
        key: "Access-Control-Allow-Methods",
        value: "GET, HEAD, OPTIONS"
      }, {
        key: "Access-Control-Allow-Headers",
        value: "Content-Type"
      }, {
        key: "Content-Disposition",
        value: "inline"
      }]
    }, {
      source: "/:path*.(json|xml|csv|yml|yaml|js|ts)",
      headers: [{
        key: "Cache-Control",
        value: "public, max-age=31536000, immutable"
      }, {
        key: "Access-Control-Allow-Origin",
        value: "*"
      }, {
        key: "Access-Control-Allow-Methods",
        value: "GET, HEAD, OPTIONS"
      }, {
        key: "Access-Control-Allow-Headers",
        value: "Content-Type"
      }, {
        key: "Content-Type",
        value: "application/json; charset=utf-8"
      }]
    }, {
      source: "/:path*.(woff|woff2|ttf|eot|otf|sfnt)",
      headers: [{
        key: "Cache-Control",
        value: "public, max-age=31536000, immutable"
      }, {
        key: "Access-Control-Allow-Origin",
        value: "*"
      }, {
        key: "Access-Control-Allow-Methods",
        value: "GET, HEAD, OPTIONS"
      }, {
        key: "Access-Control-Allow-Headers",
        value: "Content-Type"
      }]
    }, {
      source: "/:path*.(zip|rar|7z|tar|gz|bz2)",
      headers: [{
        key: "Cache-Control",
        value: "public, max-age=31536000, immutable"
      }, {
        key: "Access-Control-Allow-Origin",
        value: "*"
      }, {
        key: "Access-Control-Allow-Methods",
        value: "GET, HEAD, OPTIONS"
      }, {
        key: "Content-Disposition",
        value: "attachment"
      }]
    }, {
      source: "/api/:path*",
      headers: [{
        key: "Access-Control-Allow-Credentials",
        value: "true"
      }, {
        key: "Access-Control-Allow-Origin",
        value: apiAllowOrigin
      }, {
        key: "Access-Control-Allow-Methods",
        value: "GET, POST, PUT, DELETE, OPTIONS, PATCH, HEAD"
      }, {
        key: "Access-Control-Allow-Headers",
        value: "Content-Type, Authorization, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Date, X-Api-Version, Origin, X-CSRF-Token, Range"
      }, {
        key: "Access-Control-Expose-Headers",
        value: "Content-Length, Content-Range"
      }, {
        key: "Access-Control-Max-Age",
        value: "86400"
      }]
    }, {
      source: "/_next/static/:path*",
      headers: [{
        key: "Cache-Control",
        value: "public, max-age=31536000, immutable"
      }, {
        key: "Access-Control-Allow-Origin",
        value: "*"
      }, {
        key: "Access-Control-Allow-Methods",
        value: "GET, HEAD, OPTIONS"
      }]
    }, {
      source: "/_next/image/:path*",
      headers: [{
        key: "Cache-Control",
        value: "public, max-age=31536000, immutable"
      }, {
        key: "Access-Control-Allow-Origin",
        value: "*"
      }, {
        key: "Access-Control-Allow-Methods",
        value: "GET, HEAD, OPTIONS"
      }]
    }, {
      source: "/_next/data/:path*",
      headers: [{
        key: "Cache-Control",
        value: "public, max-age=31536000, immutable"
      }, {
        key: "Access-Control-Allow-Origin",
        value: "*"
      }, {
        key: "Access-Control-Allow-Methods",
        value: "GET, HEAD, OPTIONS"
      }]
    }];
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
    remotePatterns: [{
      protocol: "https",
      hostname: "**"
    }],
    dangerouslyAllowSVG: true,
    contentDispositionType: "attachment",
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;"
  },
  async rewrites() {
    return [{
      source: "/api/:path*",
      has: [{
        type: "header",
        key: "access-control-request-method"
      }],
      destination: "/api/:path*"
    }, {
      source: "/static/:path*",
      destination: "/:path*"
    }];
  },
  async redirects() {
    return [{
      source: "/public/:path*",
      destination: "/:path*",
      permanent: true
    }];
  },
  webpack: (config, {
    dev,
    isServer
  }) => {
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
      config.plugins.push(new WebpackObfuscator({
        compact: true,
        renameGlobals: false,
        identifierNamesGenerator: "hexadecimal",
        log: false,
        stringArray: true,
        stringArrayRotate: true,
        stringArrayShuffle: true,
        stringArrayThreshold: .75,
        unicodeEscapeSequence: false,
        controlFlowFlattening: false,
        deadCodeInjection: false,
        selfDefending: false,
        disableConsoleOutput: true
      }));
    }
    return config;
  },
  staticPageGenerationTimeout: 120,
  onDemandEntries: {
    maxInactiveAge: 25 * 1e3,
    pagesBufferLength: 5
  }
});
module.exports = nextConfig;