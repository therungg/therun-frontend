import { Button } from 'react-bootstrap';
import { CreateNextRaceButton } from '~app/(new-layout)/races/components/buttons/create-next-race-button';
import { RaceActionProps } from '~app/(new-layout)/races/components/buttons/race-action-button';
import { Race } from '~app/(new-layout)/races/races.types';
import Link from '~src/components/link';
import { User } from '../../../../types/session.types';

interface CreateNextRaceProps extends Omit<RaceActionProps, 'raceId'> {
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

    if (race.status === 'pending' || race.status === 'starting') return <></>;

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
        url += '?skipPasswordCheck=true';
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
