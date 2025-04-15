import { CardWithImage } from "~app/(new-layout)/components/card-with-image.component";
import { Panel } from "~app/(new-layout)/components/panel.component";
import { getAllActiveRaces, getPaginatedFinishedRaces } from "~src/lib/races";

const FRONTPAGE_RACE_COUNT = 3;

export default async function RacePanel() {
    const races = await getAllActiveRaces();

    if (races.length < FRONTPAGE_RACE_COUNT) {
        races.push(
            ...(
                await getPaginatedFinishedRaces(
                    1,
                    FRONTPAGE_RACE_COUNT - races.length,
                )
            ).items,
        );
    }

    return (
        <Panel
            subtitle="Race against friends"
            title="Races"
            link={{ url: "/races", text: "View All Races" }}
        >
            {races.map((race) => {
                const imageUrl =
                    race.gameImage && race.gameImage !== "noimage"
                        ? race.gameImage
                        : `/logo_dark_theme_no_text_transparent.png`;

                return (
                    <CardWithImage
                        className="mt-2"
                        key={race.raceId}
                        imageUrl={imageUrl}
                        imageAlt={race.game}
                    >
                        <div className="fs-larger fw-bold">
                            {race.displayGame}
                        </div>
                    </CardWithImage>
                );
            })}
        </Panel>
    );
}
