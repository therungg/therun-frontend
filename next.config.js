const { withAxiom } = require("next-axiom");

/** @type {import('next').NextConfig} */
module.exports = withAxiom({
    typescript: {
        ignoreBuildErrors: true,
    },
    reactStrictMode: true,
    images: {
        domains: ["static-cdn.jtvnw.net"],
    },
});
