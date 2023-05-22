import React from "react";
import { Metadata } from "next";
import Topbar from "../src/components/topbar";
import { Footer } from "./footer";
import { Content } from "./content";
import "bootstrap/dist/css/bootstrap.min.css";
import "../src/styles/globals.css";
import "../src/styles/calendar-heatmap.min.css";
import { Scripts } from "./scripts";
import { getSession } from "../src/actions/session.action";

export const metadata: Metadata = {
    title: "The Run - Speedrun Statistics",
    description: "The Run - a free tool for speedrun statistics",
    themeColor: "#ffffff",
    icons: [
        {
            rel: "icon",
            media: "(prefers-color-scheme: dark)",
            url: "/favicon.ico",
        },
        {
            rel: "icon",
            media: "(prefers-color-scheme: light)",
            url: "/lightmode/favicon.ico",
        },
        {
            rel: "apple-touch-icon",
            media: "(prefers-color-scheme: dark)",
            sizes: "180x180",
            url: "/apple-touch-icon.png",
        },
        {
            rel: "apple-touch-icon",
            media: "(prefers-color-scheme: light)",
            sizes: "180x180",
            url: "/lightmode/apple-touch-icon.png",
        },
        {
            rel: "icon",
            media: "(prefers-color-scheme: dark)",
            type: "image/png",
            sizes: "32x32",
            url: "/favicon-32x32.png",
        },
        {
            rel: "icon",
            media: "(prefers-color-scheme: light)",
            type: "image/png",
            sizes: "32x32",
            url: "/lightmode/favicon-32x32.png",
        },
        {
            rel: "icon",
            media: "(prefers-color-scheme: dark)",
            type: "image/png",
            sizes: "16x16",
            url: "/favicon-16x16.png",
        },
        {
            rel: "icon",
            media: "(prefers-color-scheme: light)",
            type: "image/png",
            sizes: "16x16",
            url: "/lightmode/favicon-16x16.png",
        },
    ],
    manifest: "/site.webmanifest",
    other: {
        "msapplication-TileColor": "#ffffff",
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
        <html lang="en">
            <body>
                <Topbar
                    username={session?.username}
                    picture={session?.picture}
                />
                <Scripts />
                <Content>{children}</Content>
                <Footer />
            </body>
        </html>
    );
}
