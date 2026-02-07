import React from 'react';
import '~src/styles/_import.scss';
import { Viewport } from 'next';
import { getSession } from '~src/actions/session.action';
import { SessionErrorBoundary } from '~src/components/errors/session.error-boundary';
import buildMetadata from '~src/utils/metadata';
import { LayoutSwitcher } from '../(new-layout)/components/layout-switcher';
import { Content } from './content';
import { Footer } from './footer';
import { Header } from './header';
import { Providers } from './providers';
import { Scripts } from './scripts';

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
    const [session] = await Promise.all([getSession()]);
    const sessionError = session.sessionError;
    return (
        <Providers user={session}>
            <Scripts />
            <Header username={session?.username} picture={session?.picture} />
            <Content>
                {sessionError ? <SessionErrorBoundary /> : children}
            </Content>
            <Footer />
            <LayoutSwitcher currentLayout="old" />
        </Providers>
    );
}
