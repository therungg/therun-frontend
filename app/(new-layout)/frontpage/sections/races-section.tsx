import { Panel } from '~app/(new-layout)/components/panel.component';
import { getSession } from '~src/actions/session.action';
import { getAllActiveRaces, getPaginatedFinishedRaces } from '~src/lib/races';
import { RacesSectionClient } from './races-section-client';

export const RacesSection = async () => {
    const [races, session, prefetchedFinished] = await Promise.all([
        getAllActiveRaces(),
        getSession(),
        getPaginatedFinishedRaces(1, 6),
    ]);

    const liveCount = races.filter(
        (race) => race.status === 'progress' || race.status === 'starting',
    ).length;

    return (
        <Panel
            panelId="races"
            title="Races"
            subtitle={
                liveCount > 0 ? `${liveCount} Live Now` : 'Race against friends'
            }
            link={{ url: '/races', text: 'View All Races' }}
            className="p-0 overflow-hidden"
        >
            <RacesSectionClient
                initialActiveRaces={races}
                initialFinishedRaces={prefetchedFinished.items}
                hasSession={!!session}
            />
        </Panel>
    );
};
