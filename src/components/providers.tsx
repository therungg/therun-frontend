'use client';

import { ThemeProvider } from 'next-themes';
import { PropsWithChildren } from 'react';
import { SessionProvider, useSession } from '~src/components/session-provider';
import { defineAbilityFor } from '~src/rbac/ability';
import { AbilityContext } from '~src/rbac/Can.component';

function AbilityProvider({ children }: PropsWithChildren) {
    const user = useSession();
    const ability = defineAbilityFor(user);

    return (
        <AbilityContext.Provider value={ability}>
            {children}
        </AbilityContext.Provider>
    );
}

export function Providers({ children }: PropsWithChildren) {
    return (
        <ThemeProvider attribute="data-bs-theme">
            <SessionProvider>
                <AbilityProvider>{children}</AbilityProvider>
            </SessionProvider>
        </ThemeProvider>
    );
}
