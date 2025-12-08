import { Viewport } from 'next';
import React, { Suspense } from 'react';
import buildMetadata from '~src/utils/metadata';

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
            <body>
                <Suspense>{children}</Suspense>
            </body>
        </html>
    );
}
