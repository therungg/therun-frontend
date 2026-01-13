import { Viewport } from 'next';
import React, { Suspense } from 'react';
import { Providers } from '~app/(old-layout)/providers';
import { Scripts } from '~app/(old-layout)/scripts';
import { getSession } from '~src/actions/session.action';
import { SessionErrorBoundary } from '~src/components/errors/session.error-boundary';
import buildMetadata from '~src/utils/metadata';
import { LayoutSwitcher } from './components/layout-switcher';
import { Header } from './header';

import './styles/_imports.scss';
import { Content } from './content';
import styles from './layout.module.scss';

export const metadata = buildMetadata();
export const viewport: Viewport = {
    themeColor: '#007c00',
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
            <LayoutSwitcher />
        </Providers>
    );
}
