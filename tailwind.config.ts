import type { Config } from "tailwindcss";

const config: Config = {
    content: [
        "./app/**/*.{js,ts,jsx,tsx,mdx}",
        "./pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./components/**/*.{js,ts,jsx,tsx,mdx}",

        // Or if using `src` directory:
        "./src/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            colors: {
                "therun-green": "#27A11B",
                "twitch-purple": "#9147ff",
                "twitch-purple-hover": "#772ce8",
                "therun-bunny": "#a3850e",
            },
        },
    },
    darkMode: "class",
    prefix: "tw-",
    plugins: [],
};

export default config;
