"use client";

import { ThemeProvider } from "next-themes";
import { HelmetProvider } from "react-helmet-async";

export function Providers({ children }) {
    return (
        <ThemeProvider attribute="data-bs-theme">
            <HelmetProvider>{children}</HelmetProvider>
        </ThemeProvider>
    );
}
