/** @type {import('next').NextConfig} */
const nextConfig = {
    cacheComponents: true,
    // The admin API-reference page reads docs/openapi/*.yaml at request time;
    // keep those bundled into the server trace.
    outputFileTracingIncludes: {
        '/admin/api-docs': ['./docs/openapi/**/*'],
    },
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
    reactStrictMode: true,
    images: {
        // No Vercel image optimization — every transformation is billed and
        // the sources (Twitch avatars, IGDB covers) are already CDN-sized.
        // next/image renders a plain <img> with the original URL.
        unoptimized: true,
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
