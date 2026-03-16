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
        <>
            <GlobalSearch />
            <DarkModeSlider />
            <UserMenu
                username={username}
                picture={picture}
                sessionError={sessionError}
            />
        </>
    );
}
