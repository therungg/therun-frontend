/** @type {import('next').NextConfig} */
// eslint-disable-next-line import/no-commonjs
module.exports = {
    typescript: {
        ignoreBuildErrors: true,
    },
    productionBrowserSourceMaps: true,
    reactStrictMode: true,
    images: {
        remotePatterns: [
            {
                protocol: "https",
                hostname: "images.igdb.com",
            },
            {
                protocol: "https",
                hostname: "raw.githubusercontent.com",
            },
            {
                protocol: "https",
                hostname: "static-cdn.jtvnw.net",
            },
        ],
    },
    async redirects() {
        return [
            {
                source: "/game/:path*",
                destination: "/games/:path*",
                permanent: true,
            },
        ];
    },
};
