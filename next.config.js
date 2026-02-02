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
