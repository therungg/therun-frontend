'use client';

import dynamic from 'next/dynamic';
import { ThemeMenu } from '../theme-menu';
import { NotificationsBell } from './NotificationsBell';
import styles from './TopbarUtilities.module.scss';
import { UserMenu } from './UserMenu';

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
    moderatesGames?: boolean;
}

export function TopbarUtilities({
    username,
    picture,
    sessionError,
    moderatesGames = false,
}: TopbarUtilitiesProps) {
    return (
        <>
            <div className={styles.desktopOnly}>
                <GlobalSearch />
            </div>
            <div className={styles.desktopOnly}>
                <ThemeMenu />
            </div>
            {username && <NotificationsBell sessionUsername={username} />}
            <UserMenu
                username={username}
                picture={picture}
                sessionError={sessionError}
                moderatesGames={moderatesGames}
            />
        </>
    );
}
