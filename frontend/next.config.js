/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */

  experimental: {
    // reactCompiler: true, // Uncomment if you want to use React Compiler

    // Optimize package imports for better tree-shaking
    optimizePackageImports: [
      "lucide-react",
      "date-fns",
      "recharts", // if using charts
      "@radix-ui/react-icons",
    ],
  },


  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "**",
      },
    ],
    // Enable modern image formats
    formats: ["image/avif", "image/webp"],
  },

  // Turbopack configuration for canvas stub
  turbopack: {
    resolveAlias: {
      canvas: "./canvas-stub.js",
    },
  },

  // Production compiler optimizations
  compiler: {
    // Remove console logs in production
    removeConsole:
      process.env.NODE_ENV === "production"
        ? {
            exclude: ["error", "warn"], // Keep error and warn
          }
        : false,
  },

  // Webpack configuration for client-side libraries
  webpack: (config, { isServer, dev }) => {
    // Handle canvas module for server-side rendering
    if (isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        canvas: require.resolve("./canvas-stub.js"),
      };
    } else {
      // Client-side fallbacks
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        canvas: false,
      };
    }

    // Ignore warnings for known compatibility issues
    config.ignoreWarnings = [
      ...(config.ignoreWarnings || []),
      /Failed to parse source map/,
      /Critical dependency: the request of a dependency is an expression/,
      /Module.*was instantiated because it was required.*but the module factory is not available/,
    ];

    // Advanced bundle splitting for production builds
    if (!isServer && !dev) {
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: "all",
          cacheGroups: {
            default: false,
            vendors: false,

            // React framework chunk
            framework: {
              name: "framework",
              test: /[\\/]node_modules[\\/](react|react-dom|scheduler|next)[\\/]/,
              priority: 40,
              enforce: true,
            },

            // Shadcn UI / Radix UI components
            ui: {
              name: "ui",
              test: /[\\/]node_modules[\\/](@radix-ui|cmdk|vaul)[\\/]/,
              priority: 35,
            },

            // Novel editor + Tiptap (lazy load this!)
            editor: {
              name: "editor",
              test: /[\\/]node_modules[\\/](novel|@tiptap|prosemirror)[\\/]/,
              priority: 35,
            },

            // Framer Motion animations
            motion: {
              name: "motion",
              test: /[\\/]node_modules[\\/](framer-motion|motion)[\\/]/,
              priority: 30,
            },

            // TanStack Query & Table
            tanstack: {
              name: "tanstack",
              test: /[\\/]node_modules[\\/]@tanstack[\\/]/,
              priority: 30,
            },

            // Icon libraries
            icons: {
              name: "icons",
              test: /[\\/]node_modules[\\/](react-icons|lucide-react)[\\/]/,
              priority: 25,
            },

            // PDF libraries
            pdf: {
              name: "pdf",
              test: /[\\/]node_modules[\\/](react-pdf|pdfjs-dist)[\\/]/,
              priority: 25,
            },

            // Google Maps
            maps: {
              name: "maps",
              test: /[\\/]node_modules[\\/](@react-google-maps)[\\/]/,
              priority: 25,
            },

            // Other vendor libraries used in multiple places
            lib: {
              name: "lib",
              test: /[\\/]node_modules[\\/]/,
              priority: 20,
              minChunks: 2,
              reuseExistingChunk: true,
            },
          },
        },
      };
    }

    return config;
  },

  // Security headers on every page. (A strict Content-Security-Policy is deliberately not set yet: the app
  // relies on inline scripts and several third-party origins, and an untested CSP would break pages.)
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // HTTPS only for a year. Not includeSubDomains/preload: nothing here controls other subdomains.
          { key: "Strict-Transport-Security", value: "max-age=31536000" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Pages may be framed only by the same site (clickjacking protection).
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // geolocation is used by the "businesses near me" button; the rest are never needed.
          { key: "Permissions-Policy", value: "geolocation=(self), camera=(), microphone=(), payment=(self)" },
        ],
      },
    ];
  },

  // API proxy: use app/api/[...path] route (forwards cookies). No rewrites.
  // Rewrites don't forward cookies; the API route does.
};

module.exports = nextConfig;
