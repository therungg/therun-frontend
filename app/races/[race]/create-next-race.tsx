import { Race } from "~app/races/races.types";
import { Button } from "react-bootstrap";
import Link from "next/link";
import { User } from "../../../types/session.types";
import { CreateNextRaceButton } from "~app/races/components/buttons/create-next-race-button";
import { RaceActionProps } from "~app/races/components/buttons/race-action-button";

interface CreateNextRaceProps extends Omit<RaceActionProps, "raceId"> {
    user?: User;
    race: Race;
}

export const CreateNextRace = (props: CreateNextRaceProps) => {
    const { race, user } = props;
    if (race.nextRaceId)
        return <GoToNextRace {...props} raceId={race.nextRaceId} />;

    if (race.status === "pending" || race.status === "starting") return <></>;

    if (!user || race.creator !== user.username) return <></>;

    return (
        <div>
            <CreateNextRaceButton {...props} raceId={race.raceId} />
        </div>
    );
};

const GoToNextRace = (props: RaceActionProps) => {
    return (
        <div>
            <Link href={`/races/${props.raceId}`}>
                <Button {...props} variant={"primary"}>
                    Go to next race
                </Button>
            </Link>
            <span>A new race has been created!</span>
        </div>
    );
};
