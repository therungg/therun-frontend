import React from "react";
import { Metadata } from "next";
import "nprogress/nprogress.css";
import "./material-symbols-outline.css";
import "../src/styles/globals.css";
import "../src/styles/calendar-heatmap.min.css";
import Topbar from "../src/components/topbar";
import { Footer } from "./footer";
import { Content } from "./content";
import { Providers } from "./providers";
import { Scripts } from "./scripts";
import { getSession } from "~src/actions/session.action";

export const metadata: Metadata = {
    title: {
        default: "The Run - Speedrun Statistics",
        template: "The Run - %s",
    },
    description: "The Run - a free tool for speedrun statistics",
    themeColor: "#ffffff",
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
