import React from "react";
import { getLocale } from "next-intl/server";
import buildMetadata from "~src/utils/metadata";
import { Viewport } from "next";

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
    const locale = await getLocale();
    return (
        <html lang={locale} suppressHydrationWarning>
            <body>{children}</body>
        </html>
    );
}
