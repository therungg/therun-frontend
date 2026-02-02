'use server';
import { Metadata } from 'next';
import { RaceDetail } from '~app/(old-layout)/races/[race]/race-view';
import { sortRaceParticipants } from '~app/(old-layout)/races/[race]/sort-race-participants';
import { getSession } from '~src/actions/session.action';
import {
    getRaceByRaceId,
    getRaceMessages,
    getTimeAndMmrLeaderboards,
} from '~src/lib/races';
import buildMetadata from '~src/utils/metadata';
import { safeEncodeURI } from '~src/utils/uri';

interface PageProps {
    params: Promise<{ race: string }>;
}

export default async function RaceDetailPage(props: PageProps) {
    const params = await props.params;
    const raceId = params.race;

    const promises = [
        getRaceByRaceId(raceId),
        getSession(),
        getRaceMessages(raceId, true),
    ] as const;

    const [race, session, messages] = await Promise.all(promises);

    race.participants = sortRaceParticipants(race);

    const { timeLeaderboards, mmrLeaderboards } =
        await getTimeAndMmrLeaderboards(
            safeEncodeURI(race.game),
            safeEncodeURI(race.category),
            1,
            3,
            new Date().toISOString().slice(0, 7),
        );

    race.mmrLeaderboards = mmrLeaderboards;
    race.timeLeaderboards = timeLeaderboards;

    return <RaceDetail race={race} user={session} messages={messages} />;
}

export async function generateMetadata(props: PageProps): Promise<Metadata> {
    const params = await props.params;
    const raceId = params.race;

    if (!raceId) return buildMetadata();

    const race = await getRaceByRaceId(raceId);
    const game = race.displayGame;
    const category = race.displayCategory;
    const participantCount = race.participantCount;

    return buildMetadata({
        title: `Race for ${game} - ${category}`,
        description: `A race between ${participantCount} people speedrunning ${game} - ${category} on therun.gg. Come check it out!`,
        images:
            race.gameImage && race.gameImage !== 'noimage'
                ? [
                      {
                          url: race.gameImage,
                          secureUrl: race.gameImage,
                          alt: `Game image of ${game}`,
                          type: 'image/png',
                          width: 300,
                          height: 300,
                      },
                  ]
                : undefined,
        index: true,
    });
}
