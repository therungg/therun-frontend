import { Race } from "~app/races/races.types";
import { Button } from "react-bootstrap";
import Link from "next/link";
import { User } from "../../../types/session.types";
import { CreateNextRaceButton } from "~app/races/components/buttons/create-next-race-button";

export const CreateNextRace = ({ race, user }: { race: Race; user?: User }) => {
    if (race.nextRaceId) return <GoToNextRace raceId={race.nextRaceId} />;

    if (race.status === "pending" || race.status === "starting") return <></>;

    if (!user || race.creator !== user.username) return <></>;

    return (
        <div>
            <CreateNextRaceButton raceId={race.raceId} />
        </div>
    );
};

const GoToNextRace = ({ raceId }: { raceId: string }) => {
    return (
        <div className={"mb-4"}>
            <span className={"mx-3"}>A new race has been created!</span>
            <Button>
                <Link href={`/races/${raceId}`}>Go to next race</Link>
            </Button>
        </div>
    );
};
