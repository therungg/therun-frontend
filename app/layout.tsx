import { Viewport } from 'next';
import { DM_Sans } from 'next/font/google';
import React, { Suspense } from 'react';
import buildMetadata from '~src/utils/metadata';

const dmSans = DM_Sans({
    subsets: ['latin'],
    display: 'swap',
    variable: '--font-sans',
});

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
    return (
        <html lang="en" suppressHydrationWarning>
            <body className={dmSans.variable}>
                <Suspense>{children}</Suspense>
            </body>
        </html>
    );
}
