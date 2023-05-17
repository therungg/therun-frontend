/** @type {import('next').NextConfig} */
// eslint-disable-next-line import/no-commonjs
module.exports = {
    typescript: {
        ignoreBuildErrors: true,
    },
    productionBrowserSourceMaps: true,
    reactStrictMode: true,
    images: {
        domains: ["static-cdn.jtvnw.net", "raw.githubusercontent.com"],
    },
};
