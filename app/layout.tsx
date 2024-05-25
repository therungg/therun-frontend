import React from "react";
import "../src/styles/_import.scss";
import { Header } from "./header";
import { Footer } from "./footer";
import { Content } from "./content";
import { Providers } from "./providers";
import { Scripts } from "./scripts";
import { getSession } from "~src/actions/session.action";
import buildMetadata from "~src/utils/metadata";
import { Viewport } from "next";
import { SessionError } from "~src/common/session.error";
import { User } from "types/session.types";
import { SessionErrorBoundary } from "~src/components/errors/session.error-boundary";

export const metadata = buildMetadata();
export const viewport: Viewport = {
    themeColor: "#007c00",
};
export default async function RootLayout({
    // Layouts must accept a children prop.
    // This will be populated with nested layouts or pages
    children,
}: {
    children: React.ReactNode;
}) {
    let sessionError = null;
    let session!: User;
    try {
        session = await getSession();
    } catch (error) {
        if (error instanceof SessionError) {
            sessionError = error;
        }
    }

    return (
        <html lang="en" suppressHydrationWarning>
            <body>
                <Providers user={session}>
                    <Scripts />
                    <Header
                        username={session?.username}
                        picture={session?.picture}
                    />
                    <Content>
                        {sessionError ? <SessionErrorBoundary /> : children}
                    </Content>
                    <Footer />
                </Providers>
            </body>
        </html>
    );
}
