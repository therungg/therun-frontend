import { ErrorBoundary } from 'react-error-boundary';
import { Topbar } from '~src/components/Topbar/Topbar';
import { TopbarSkeleton } from '~src/components/Topbar/TopbarSkeleton';
import { getFeaturedPatrons } from '~src/lib/featured-patrons';
import type { FeaturedPatronsResponse } from '../../types/patreon.types';

interface HeaderProps {
    username: string;
    picture: string;
    sessionError: string | null;
}

export const Header = async ({
    username,
    picture,
    sessionError,
}: Partial<HeaderProps>) => {
    let featuredPatrons: FeaturedPatronsResponse;
    try {
        featuredPatrons = await getFeaturedPatrons();
    } catch {
        featuredPatrons = { supporterOfTheDay: null, latestPatron: null };
    }

    return (
        <ErrorBoundary fallback={<TopbarSkeleton />}>
            <Topbar
                username={username}
                picture={picture}
                sessionError={sessionError}
                featuredPatrons={featuredPatrons}
            />
        </ErrorBoundary>
    );
};
