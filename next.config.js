/** @type {import('next').NextConfig} */
// eslint-disable-next-line import/no-commonjs
module.exports = {
    experimental: {
        serverActions: true,
    },
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
        ],
        domains: ["static-cdn.jtvnw.net", "raw.githubusercontent.com"],
    },
};
