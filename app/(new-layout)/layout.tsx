import { Viewport } from 'next';
import React, { Suspense } from 'react';
import { Providers } from '~src/components/providers';
import { Scripts } from '~src/components/scripts';
import buildMetadata from '~src/utils/metadata';
import { Header } from './header';

import './styles/_imports.scss';
import { Footer } from './components/footer';
import { NavigationProgress } from './components/navigation-progress';
import { Content } from './content';
import styles from './layout.module.scss';
import { SessionErrorGate } from './session-error-gate';

export const metadata = buildMetadata();
export const viewport: Viewport = {
    themeColor: '#007c00',
};
export default function RootLayout({
    // Layouts must accept a children prop.
    // This will be populated with nested layouts or pages
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <Providers>
            <Scripts />
            <Suspense fallback={null}>
                <NavigationProgress />
            </Suspense>
            <div className={styles.background}>
                <header className={styles.header}>
                    <Header />
                </header>
                <main className={styles.main}>
                    <Content>
                        <SessionErrorGate>{children}</SessionErrorGate>
                    </Content>
                </main>
                <div className={styles.footer}>
                    <Footer />
                </div>
            </div>
        </Providers>
    );
}
