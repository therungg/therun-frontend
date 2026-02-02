import { getFrontpageConfig } from '~src/actions/frontpage-config.action';
import { getSession } from '~src/actions/session.action';
import { PANEL_REGISTRY } from '~src/lib/frontpage-panels';
import { PanelId } from '../../../types/frontpage-config.types';
import { FrontpageLayout } from './components/frontpage-layout';
import styles from './frontpage.module.scss';

export default async function FrontPage() {
    const session = await getSession();
    const config = await getFrontpageConfig();
    const isAuthenticated = !!session?.id;

    const LiveRunsComponent = PANEL_REGISTRY['live-runs'];
    const StatsComponent = PANEL_REGISTRY['stats'];
    const CurrentUserLiveComponent = PANEL_REGISTRY['current-user-live'];
    const RaceComponent = PANEL_REGISTRY['race'];
    const PatreonComponent = PANEL_REGISTRY['patreon'];
    const LatestPbsComponent = PANEL_REGISTRY['latest-pbs'];

    const panelComponents: Record<PanelId, React.ReactNode> = {
        'live-runs': <LiveRunsComponent />,
        stats: <StatsComponent />,
        'current-user-live': <CurrentUserLiveComponent />,
        race: <RaceComponent />,
        patreon: <PatreonComponent />,
        'latest-pbs': <LatestPbsComponent />,
    };

    return (
        <div>
            <div className={`text-center mb-3 ${styles.heroSection}`}>
                <h1 className={`display-3 fw-medium ${styles.title}`}>
                    The Run
                </h1>
                <h2 className={`display-6 ${styles.subtitle}`}>
                    Everything Speedrunning
                </h2>
            </div>
            <FrontpageLayout
                initialConfig={config}
                panels={panelComponents}
                isAuthenticated={isAuthenticated}
            />
        </div>
    );
}
