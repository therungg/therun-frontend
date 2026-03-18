import { FaFlagCheckered } from 'react-icons/fa6';
import { Panel } from '~app/(new-layout)/components/panel.component';
import { Race } from '~app/(new-layout)/races/races.types';
import { getSession } from '~src/actions/session.action';
import { getGlobalUser } from '~src/lib/get-global-user';
import { getAllActiveRaces, getPaginatedFinishedRaces } from '~src/lib/races';
import { RacesSectionClient } from './races-section-client';

const collectRaceUsernames = (races: Race[]) => {
    const usernames = new Set<string>();
    for (const race of races) {
        if (race.creator) usernames.add(race.creator);
        if (race.participants) {
            for (const p of race.participants) {
                usernames.add(p.user);
            }
        }
        if (race.results) {
            for (const r of race.results) {
                usernames.add(r.name);
            }
        }
    }
    return [...usernames];
};

const fetchUserPictures = async (
    races: Race[],
): Promise<Record<string, string>> => {
    const usernames = collectRaceUsernames(races);
    if (usernames.length === 0) return {};

    const results = await Promise.all(
        usernames.map(async (username) => {
            try {
                const user = await getGlobalUser(username);
                return [
                    username,
                    user?.picture && user.picture !== 'noimage'
                        ? user.picture
                        : '',
                ] as const;
            } catch {
                return [username, ''] as const;
            }
        }),
    );

    const pictures: Record<string, string> = {};
    for (const [username, picture] of results) {
        if (picture) pictures[username] = picture;
    }
    return pictures;
};

export const RacesSection = async () => {
    const [races, session, prefetchedFinished] = await Promise.all([
        getAllActiveRaces(),
        getSession(),
        getPaginatedFinishedRaces(1, 6),
    ]);

    const allRaces = [...races, ...prefetchedFinished.items];
    const userPictures = await fetchUserPictures(allRaces);

    const liveCount = races.filter(
        (race) => race.status === 'progress' || race.status === 'starting',
    ).length;

    return (
        <Panel
            panelId="races"
            title="Races"
            subtitle={
                liveCount > 0 ? `${liveCount} live now` : 'Race against friends'
            }
            icon={FaFlagCheckered}
            link={{ url: '/races', text: 'View All Races' }}
            className="p-0 overflow-hidden"
        >
            <RacesSectionClient
                initialActiveRaces={races}
                initialFinishedRaces={prefetchedFinished.items}
                hasSession={!!session}
                initialUserPictures={userPictures}
            />
        </Panel>
    );
};
