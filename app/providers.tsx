"use client";

import { ThemeProvider } from "next-themes";
import { HelmetProvider } from "react-helmet-async";
import { PropsWithChildren } from "react";
import { User } from "../types/session.types";
import { defineAbilityFor } from "~src/rbac/ability";
import { AbilityContext } from "~src/rbac/Can.component";

interface ProvidersProps {
    user: User;
}

export function Providers({
    children,
    user,
}: PropsWithChildren<ProvidersProps>) {
    const ability = defineAbilityFor(user);

    return (
        <ThemeProvider attribute="data-bs-theme">
            <HelmetProvider>
                <AbilityContext.Provider value={ability}>
                    {children}
                </AbilityContext.Provider>
            </HelmetProvider>
        </ThemeProvider>
    );
}
