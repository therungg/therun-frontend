import React from "react";
import { getLocale, getMessages } from "next-intl/server";
import { NextIntlClientProvider } from "next-intl";
import "../src/styles/_import.scss";
import { Header } from "./header";
import { Footer } from "./footer";
import { Content } from "./content";
import { Providers } from "./providers";
import { Scripts } from "./scripts";
import { getSession } from "~src/actions/session.action";
import buildMetadata from "~src/utils/metadata";
import { Viewport } from "next";
import { SessionErrorBoundary } from "~src/components/errors/session.error-boundary";
import { Navigation } from "~src/components/navigation";

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
    const [
        session,
        locale,
        // Providing all messages to the client
        // side is the easiest way to get started
        messages,
    ] = await Promise.all([getSession(), getLocale(), getMessages()]);
    const sessionError = session.sessionError;
    return (
        <html lang={locale} suppressHydrationWarning>
            <body>
                <NextIntlClientProvider messages={messages}>
                    <Providers user={session}>
                        <Scripts />
                        <Header
                            username={session?.username}
                            picture={session?.picture}
                        />
                        <div className="d-flex">
                            <aside className="col-md-2 bg-body-tertiary">
                                <Navigation username="test" />
                            </aside>
                            <main className="col-md-10 main-container container">
                                <Content>
                                    {sessionError ? (
                                        <SessionErrorBoundary />
                                    ) : (
                                        children
                                    )}
                                </Content>
                            </main>
                        </div>
                        <Footer />
                    </Providers>
                </NextIntlClientProvider>
            </body>
        </html>
    );
}
