/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  reactCompiler: true,

  // Enable standalone output for Docker
  output: 'standalone',

  // Transpile packages that need client-side rendering
  transpilePackages: ['tui-image-editor'],

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },

  // Turbopack configuration for canvas stub
  turbopack: {
    resolveAlias: {
      canvas: './canvas-stub.js',
    },
  },

  // Webpack configuration for client-side libraries
  webpack: (config, { isServer }) => {
    // Handle canvas module for server-side rendering
    if (isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        canvas: require.resolve('./canvas-stub.js'),
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

    // Handle TUI Image Editor CSS and assets
    config.module.rules.push({
      test: /\.css$/,
      include: /node_modules\/tui-image-editor/,
      use: [
        'style-loader',
        {
          loader: 'css-loader',
          options: {
            importLoaders: 1,
          },
        },
      ],
    });

    // Handle TUI Image Editor SVG and other assets
    config.module.rules.push({
      test: /\.(svg|png|jpg|gif|woff|woff2|eot|ttf)$/,
      include: /node_modules\/tui-image-editor/,
      use: [
        {
          loader: 'file-loader',
          options: {
            publicPath: '/_next/static/media/',
            outputPath: 'static/media/',
          },
        },
      ],
    });

    // Ignore warnings for known compatibility issues
    config.ignoreWarnings = [
      ...(config.ignoreWarnings || []),
      /Failed to parse source map/,
      /Critical dependency: the request of a dependency is an expression/,
      /Module.*was instantiated because it was required.*but the module factory is not available/,
    ];

    return config;
  },

  // Proxy API requests to backend server
  async rewrites() {
    return [
      {
        source: '/api/v1/:path*',
        destination: 'http://localhost:8000/api/v1/:path*',
      },
    ];
  },
};

module.exports = nextConfig;