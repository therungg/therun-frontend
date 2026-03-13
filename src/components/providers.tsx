'use client';

import { ThemeProvider } from 'next-themes';
import { PropsWithChildren } from 'react';
import { User } from 'types/session.types';
import { defineAbilityFor } from '~src/rbac/ability';
import { AbilityContext } from '~src/rbac/Can.component';

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
            <AbilityContext.Provider value={ability}>
                {children}
            </AbilityContext.Provider>
        </ThemeProvider>
    );
}
