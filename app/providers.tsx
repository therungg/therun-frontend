"use client";
import { ThemeProvider, useTheme } from "next-themes";
import { HelmetProvider } from "react-helmet-async";
import { PropsWithChildren, useEffect } from "react";
import { User } from "../types/session.types";
import { defineAbilityFor } from "~src/rbac/ability";
import { AbilityContext } from "~src/rbac/Can.component";

interface ProvidersProps {
    user: User;
    defaultTheme: string;
}

export function Providers({
    children,
    user,
    defaultTheme,
}: PropsWithChildren<ProvidersProps>) {
    const ability = defineAbilityFor(user);

    return (
        <ThemeProvider defaultTheme={defaultTheme} attribute="data-bs-theme">
            <HelmetProvider>
                <AbilityContext.Provider value={ability}>
                    <ThemeInitializer defaultTheme={defaultTheme} />
                    {children}
                </AbilityContext.Provider>
            </HelmetProvider>
        </ThemeProvider>
    );
}

// Kind of a hack that lets us set the theme using next-themes `setTheme`
// It can't be done in the Providers component because it has to be within `<ThemeProvider>`
const ThemeInitializer = ({ defaultTheme = "system" }) => {
    const { setTheme } = useTheme();

    useEffect(() => {
        setTheme(defaultTheme);
    }, [defaultTheme, setTheme]);

    return <></>;
};
