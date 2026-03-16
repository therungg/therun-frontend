'use client';

import dynamic from 'next/dynamic';
import { UserMenu } from './UserMenu';

const DarkModeSlider = dynamic(() => import('../dark-mode-slider'), {
    ssr: false,
});

const GlobalSearch = dynamic(
    () =>
        import('~src/components/search/global-search.component').then(
            (mod) => mod.GlobalSearch,
        ),
    { ssr: false },
);

interface TopbarUtilitiesProps {
    username?: string;
    picture?: string;
    sessionError?: string | null;
}

export function TopbarUtilities({
    username,
    picture,
    sessionError,
}: TopbarUtilitiesProps) {
    return (
        <div
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
            }}
        >
            <GlobalSearch />
            <DarkModeSlider />
            <UserMenu
                username={username}
                picture={picture}
                sessionError={sessionError}
            />
        </div>
    );
}
