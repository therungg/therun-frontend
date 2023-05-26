"use client";

import { ThemeProvider } from "next-themes";
import { HelmetProvider } from "react-helmet-async";

export function Providers({ children }) {
    return (
        <ThemeProvider>
            <HelmetProvider>{children}</HelmetProvider>
        </ThemeProvider>
    );
}
