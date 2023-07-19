import React from "react";
import { Metadata } from "next";
import "nprogress/nprogress.css";
import "./material-symbols-outline.css";
import "../src/styles/_import.scss";
import Topbar from "../src/components/topbar";
import { Footer } from "./footer";
import { Content } from "./content";
import { Providers } from "./providers";
import { Scripts } from "./scripts";
import { getSession } from "~src/actions/session.action";

const metaTitle = "The Run - Speedrun Statistics";
const metaDescription =
    "The Run - a free tool for speedrun statistics. Explore leaderboards, check out live runs, and easily manage your own speedrun data!";
const metaImageUrl = "/therun-no-url-with-black-background.png";

export const metadata: Metadata = {
    metadataBase: new URL("https://therun.gg"),
    title: {
        default: metaTitle,
        template: "The Run - %s",
    },
    description: metaDescription,
    keywords: ["TheRun", "Speedrun", "Statistics"],
    themeColor: "#007c00",
    manifest: "/site.webmanifest",
    referrer: "strict-origin-when-cross-origin",
    other: {
        "msapplication-TileColor": "#007c00",
    },
    openGraph: {
        title: metaTitle,
        description: metaDescription,
        url: "/",
        siteName: "The Run",
        locale: "en_US",
        type: "website",
        images: [
            {
                url: metaImageUrl,
                secureUrl: metaImageUrl,
                alt: "The Run logo",
                type: "image/png",
                width: 800,
                height: 600,
            },
        ],
    },
    twitter: {
        title: metaTitle,
        description: metaDescription,
        siteId: "1482414005138477061",
        creator: "@therungg",
        creatorId: "1482414005138477061",
        card: "summary_large_image",
        images: [metaImageUrl],
    },
};

export default async function RootLayout({
    // Layouts must accept a children prop.
    // This will be populated with nested layouts or pages
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await getSession();
    return (
        <html lang="en" suppressHydrationWarning>
            <body>
                <Providers>
                    <Topbar
                        username={session?.username}
                        picture={session?.picture}
                    />
                    <Scripts />
                    <Content>{children}</Content>
                    <Footer />
                </Providers>
            </body>
        </html>
    );
}
