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
    identity,
    children,
}: {
    username: string;
    identity?: ReactNode;
    children: ReactNode;
}) {
    const pathname = usePathname();
    const router = useRouter();
    return (
        <ConsoleChrome
            plain
            header={{
                eyebrow: 'Settings',
                title: username,
                titleHref: `/${encodeURIComponent(username)}`,
                identity,
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
