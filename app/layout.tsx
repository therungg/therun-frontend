import React from "react";
import "../src/styles/_import.scss";
import { Header } from "./header";
import { Footer } from "./footer";
import { Content } from "./content";
import { Providers } from "./providers";
import { Scripts } from "./scripts";
import { getSession } from "~src/actions/session.action";
import buildMetadata from "~src/utils/metadata";

export const metadata = buildMetadata();

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
                    <Scripts />
                    <Header
                        username={session?.username}
                        picture={session?.picture}
                    />
                    <Content>{children}</Content>
                    <Footer />
                </Providers>
            </body>
        </html>
    );
}
