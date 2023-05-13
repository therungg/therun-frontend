import { withAxiom } from "next-axiom";

const nextConfig = withAxiom({
    typescript: {
        ignoreBuildErrors: true,
    },
    reactStrictMode: true,
    images: {
        domains: ["static-cdn.jtvnw.net", "raw.githubusercontent.com"],
    },
});

export default nextConfig;
