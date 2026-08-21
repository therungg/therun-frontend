'use client';

import { usePathname, useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { ConsoleChrome } from '~src/components/console-chrome/console-chrome';
import {
    activeSettingsItem,
    SETTINGS_GROUPS,
    SETTINGS_ICONS,
    type SettingsItemId,
    settingsHref,
} from './nav-model';

export function SettingsChrome({
    username,
    children,
}: {
    username: string;
    children: ReactNode;
}) {
    const pathname = usePathname();
    const router = useRouter();
    return (
        <ConsoleChrome
            header={{
                eyebrow: 'Settings',
                title: username,
                titleHref: `/${encodeURIComponent(username)}`,
            }}
            groups={SETTINGS_GROUPS}
            icons={SETTINGS_ICONS}
            navAriaLabel="Settings"
            activeItem={activeSettingsItem(pathname)}
            onNavigate={(id) => router.push(settingsHref(id as SettingsItemId))}
        >
            {children}
        </ConsoleChrome>
    );
}
