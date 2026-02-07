import dynamic from 'next/dynamic';
import { Suspense } from 'react';
import { getFrontpageConfig } from '~src/actions/frontpage-config.action';
import { getSession } from '~src/actions/session.action';
import { PANEL_REGISTRY } from '~src/lib/frontpage-panels';
import { PanelId } from '../../../types/frontpage-config.types';
import { FrontpageHero } from './components/frontpage-hero';
import { PanelSkeleton } from './components/panel-skeleton';
import { StaticFrontpageLayout } from './components/static-frontpage-layout';

const DraggableFrontpageLayout = dynamic(() =>
    import('./components/frontpage-layout').then((mod) => mod.FrontpageLayout),
);

export default async function FrontPage() {
    const session = await getSession();
    const config = await getFrontpageConfig(session?.username);
    const isAuthenticated = !!session?.id;

    const StatsComponent = PANEL_REGISTRY['stats'];
    const CurrentUserLiveComponent = PANEL_REGISTRY['current-user-live'];
    const RaceComponent = PANEL_REGISTRY['race'];
    const PatreonComponent = PANEL_REGISTRY['patreon'];
    const LatestPbsComponent = PANEL_REGISTRY['latest-pbs'];

    const panelComponents: Record<PanelId, React.ReactNode> = {
        stats: (
            <Suspense fallback={<PanelSkeleton />}>
                <StatsComponent />
            </Suspense>
        ),
        'current-user-live': (
            <Suspense fallback={<PanelSkeleton />}>
                <CurrentUserLiveComponent />
            </Suspense>
        ),
        race: (
            <Suspense fallback={<PanelSkeleton />}>
                <RaceComponent />
            </Suspense>
        ),
        patreon: (
            <Suspense fallback={<PanelSkeleton />}>
                <PatreonComponent />
            </Suspense>
        ),
        'latest-pbs': (
            <Suspense fallback={<PanelSkeleton />}>
                <LatestPbsComponent />
            </Suspense>
        ),
    };

    return (
        <div>
            <FrontpageHero />
            {isAuthenticated ? (
                <DraggableFrontpageLayout
                    initialConfig={config}
                    panels={panelComponents}
                    isAuthenticated={isAuthenticated}
                />
            ) : (
                <StaticFrontpageLayout
                    initialConfig={config}
                    panels={panelComponents}
                />
            )}
        </div>
    );
}
