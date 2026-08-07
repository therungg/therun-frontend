import { ErrorBoundary } from 'react-error-boundary';
import { Topbar } from '~src/components/Topbar/Topbar';
import { TopbarSkeleton } from '~src/components/Topbar/TopbarSkeleton';
import { getFeaturedPatrons } from '~src/lib/featured-patrons';
import type { FeaturedPatronsResponse } from '../../types/patreon.types';

export const Header = async () => {
    let featuredPatrons: FeaturedPatronsResponse;
    try {
        featuredPatrons = await getFeaturedPatrons();
    } catch {
        featuredPatrons = { supporterOfTheDay: null, latestPatron: null };
    }

    return (
        <ErrorBoundary fallback={<TopbarSkeleton />}>
            <Topbar featuredPatrons={featuredPatrons} />
        </ErrorBoundary>
    );
};
