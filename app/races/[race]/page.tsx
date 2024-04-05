import {
    getRaceByRaceId,
    getRaceMessages,
    getTimeAndMmrLeaderboards,
} from "~src/lib/races";
import { RaceDetail } from "~app/races/[race]/race-view";
import { getSession } from "~src/actions/session.action";
import { Race, RaceMessage } from "~app/races/races.types";
import { User } from "../../../types/session.types";
import { sortRaceParticipants } from "~app/races/[race]/sort-race-participants";
import { Metadata } from "next";
import buildMetadata from "~src/utils/metadata";
import { safeEncodeURI } from "~src/utils/uri";

interface PageProps {
    params: { race: string };
}

export default async function RaceDetailPage({ params }: PageProps) {
    const raceId = params.race;

    const promises = [
        getRaceByRaceId(raceId),
        getSession(),
        getRaceMessages(raceId, true),
    ];

    const [race, session, messages] = (await Promise.all(promises)) as [
        Race,
        User,
        RaceMessage[],
    ];

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

export async function generateMetadata({
    params,
}: PageProps): Promise<Metadata> {
    const raceId = params.race;

    if (!raceId) return buildMetadata();

    const race = await getRaceByRaceId(raceId);
    const game = race.displayGame;
    const category = race.displayCategory;
    const participantCount = race.participantCount;

    return buildMetadata({
        title: `Watch or join this speedrun race for ${game} - ${category} on therun.gg!`,
        description: `A race between ${participantCount} people speedrunning ${game} - ${category} on therun.gg. Come check it out!`,
        images:
            race.gameImage && race.gameImage !== "noimage"
                ? [
                      {
                          url: race.gameImage,
                          secureUrl: race.gameImage,
                          alt: `Game image of ${game}`,
                          type: "image/png",
                          width: 300,
                          height: 300,
                      },
                  ]
                : undefined,
        index: true,
    });
}
