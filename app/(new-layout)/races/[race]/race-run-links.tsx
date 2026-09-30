'use client';

import {
    createContext,
    type ReactNode,
    useContext,
    useEffect,
    useState,
} from 'react';
import type {
    Race,
    RaceParticipant,
    RaceRunLinks,
} from '~app/(new-layout)/races/races.types';
import { getRaceRuns } from '~src/lib/races';

// A finisher's run is uploaded by their timer shortly after the finish. Keep
// looking for this long after the most recent finish still without one, and
// only from a tab someone is looking at: each look is a server call.
const WAIT_FOR_UPLOAD_MS = 10 * 60 * 1000;
const RETRY_MS = 60 * 1000;

const RaceRunLinksContext = createContext<RaceRunLinks>({});

const isFinisher = (p: RaceParticipant) =>
    (p.status === 'finished' || p.status === 'confirmed') &&
    p.finalTime != null;

export function RaceRunLinksProvider({
    race,
    children,
}: {
    race: Race;
    children: ReactNode;
}) {
    const [links, setLinks] = useState<RaceRunLinks>({});
    const waiting = (race.participants ?? []).filter(
        (p) => isFinisher(p) && !links[p.user],
    );
    // Only what the effect needs, as primitives, so a live update to an
    // unrelated field doesn't restart the lookup.
    const waitingKey = waiting
        .map((p) => p.user)
        .sort()
        .join('|');
    const lastFinish = Math.max(
        0,
        ...waiting.map((p) =>
            p.finishedAtDate ? new Date(p.finishedAtDate).getTime() : 0,
        ),
    );

    useEffect(() => {
        if (!waitingKey) return;
        let cancelled = false;
        let timer: ReturnType<typeof setTimeout> | undefined;
        const load = async () => {
            if (document.hidden) {
                timer = setTimeout(load, RETRY_MS);
                return;
            }
            const next = await getRaceRuns(race.raceId).catch(() => null);
            if (cancelled) return;
            if (next) setLinks(next);
            if (Date.now() - lastFinish < WAIT_FOR_UPLOAD_MS) {
                timer = setTimeout(load, RETRY_MS);
            }
        };
        load();
        return () => {
            cancelled = true;
            clearTimeout(timer);
        };
    }, [race.raceId, waitingKey, lastFinish]);

    return (
        <RaceRunLinksContext.Provider value={links}>
            {children}
        </RaceRunLinksContext.Provider>
    );
}

/** The finisher's time, opening their run's page once it is uploaded. */
export function RaceRunLink({
    participant,
    children,
}: {
    participant: RaceParticipant;
    children: ReactNode;
}) {
    const link = useContext(RaceRunLinksContext)[participant.user];
    if (!link || !isFinisher(participant)) return <>{children}</>;
    return (
        <a
            href={`/games/${link.gameSlug}/run/${link.runId}`}
            target="_blank"
            rel="noopener noreferrer"
            title="Open this run"
        >
            {children}
        </a>
    );
}
