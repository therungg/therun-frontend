import React from "react";
import { getSession } from "~src/actions/session.action";
import buildMetadata from "~src/utils/metadata";
import { Viewport } from "next";
import { Providers } from "~app/(old-layout)/providers";
import { Scripts } from "~app/(old-layout)/scripts";
import { SessionErrorBoundary } from "~src/components/errors/session.error-boundary";
import { Header } from "./header";

import "./styles/_imports.scss";
import styles from "./layout.module.scss";
import { Content } from "./content";

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
    const session = await getSession();
    const sessionError = session.sessionError;

    return (
        <Providers user={session}>
            <Scripts />
            <div className={styles.background}>
                <header className={styles.header}>
                    <Header
                        username={session?.username}
                        picture={session?.picture}
                    />
                </header>
                <main className={styles.main}>
                    <Content>
                        {sessionError ? <SessionErrorBoundary /> : children}
                    </Content>
                </main>
            </div>
        </Providers>
    );
}
