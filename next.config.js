/** @type {import('next').NextConfig} */
const nextConfig = {
    cacheComponents: true,
    typescript: {
        ignoreBuildErrors: true,
    },
    reactCompiler: true,
    experimental: {
        useCache: true,
        serverActions: {
            bodySizeLimit: '25mb',
        },
    },
    productionBrowserSourceMaps: true,
    reactStrictMode: true,
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'usevk6e5826mt9j6.public.blob.vercel-storage.com',
                port: '',
            },
            {
                protocol: 'https',
                hostname: 'adflsi3tfe9nexsk.public.blob.vercel-storage.com',
                port: '',
            },
            {
                protocol: 'https',
                hostname: 'images.igdb.com',
            },
            {
                protocol: 'https',
                hostname: 'raw.githubusercontent.com',
            },
            {
                protocol: 'https',
                hostname: 'static-cdn.jtvnw.net',
            },
        ],
    },
    async redirects() {
        return [
            {
                source: '/game/:path*',
                destination: '/games/:path*',
                permanent: true,
            },
        ];
    },
};

module.exports = nextConfig;


// Injected content via Sentry wizard below

const { withSentryConfig } = require("@sentry/nextjs");

module.exports = withSentryConfig(module.exports, {
  // For all available options, see:
  // https://www.npmjs.com/package/@sentry/webpack-plugin#options

  org: "therungg",
  project: "javascript-nextjs",

  // Only print logs for uploading source maps in CI
  silent: !process.env.CI,

  // For all available options, see:
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

  // Upload a larger set of source maps for prettier stack traces (increases build time)
  widenClientFileUpload: true,

  // Uncomment to route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
  // This can increase your server load as well as your hosting bill.
  // Note: Check that the configured route will not match with your Next.js middleware, otherwise reporting of client-
  // side errors will fail.
  // tunnelRoute: "/monitoring",

  webpack: {
    // Enables automatic instrumentation of Vercel Cron Monitors. (Does not yet work with App Router route handlers.)
    // See the following for more information:
    // https://docs.sentry.io/product/crons/
    // https://vercel.com/docs/cron-jobs
    automaticVercelMonitors: true,

    // Tree-shaking options for reducing bundle size
    treeshake: {
      // Automatically tree-shake Sentry logger statements to reduce bundle size
      removeDebugLogging: true,
    },
  },
});
