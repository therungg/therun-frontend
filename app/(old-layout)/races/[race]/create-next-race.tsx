import { Race } from "~app/(old-layout)/races/races.types";
import { Button } from "react-bootstrap";
import Link from "next/link";
import { User } from "../../../../types/session.types";
import { CreateNextRaceButton } from "~app/(old-layout)/races/components/buttons/create-next-race-button";
import { RaceActionProps } from "~app/(old-layout)/races/components/buttons/race-action-button";

interface CreateNextRaceProps extends Omit<RaceActionProps, "raceId"> {
    user?: User;
    race: Race;
}

interface GoToNextRaceProps extends RaceActionProps {
    allowedToSkipPassword: boolean;
}

export const CreateNextRace = (props: CreateNextRaceProps) => {
    const { race, user } = props;

    if (race.nextRaceId) {
        const participates = race.participants?.some(
            (participant) => participant.user === user?.username,
        );

        const allowedToSkipPassword = !!(participates && race.requiresPassword);

        return (
            <GoToNextRace
                {...props}
                raceId={race.nextRaceId}
                allowedToSkipPassword={allowedToSkipPassword}
            />
        );
    }

    if (race.status === "pending" || race.status === "starting") return <></>;

    if (!user || race.creator !== user.username) return <></>;

    return (
        <div className="mb-4">
            <CreateNextRaceButton {...props} raceId={race.raceId} />
        </div>
    );
};

const GoToNextRace = (props: GoToNextRaceProps) => {
    let url = `/races/${props.raceId}`;

    if (props.allowedToSkipPassword) {
        url += "?skipPasswordCheck=true";
    }

    return (
        <div className="mb-4">
            <span className="mb-2">A new race has been created!</span>
            <Link href={url}>
                <Button {...props} variant="primary">
                    Go to next race
                </Button>
            </Link>
        </div>
    );
};
