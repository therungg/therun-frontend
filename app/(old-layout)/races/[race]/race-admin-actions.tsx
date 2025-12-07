import { Button } from 'react-bootstrap';
import { AbortRaceButton } from '~app/(old-layout)/races/components/buttons/abort-race-button';
import { StartRaceButton } from '~app/(old-layout)/races/components/buttons/start-race-button';
import { KickUserForm } from '~app/(old-layout)/races/components/forms/kick-user-form';
import { SetTimeForUserForm } from '~app/(old-layout)/races/components/forms/set-time-for-user-form';
import { Race } from '~app/(old-layout)/races/races.types';
import { isRaceModerator } from '~src/rbac/confirm-permission';
import { User } from '../../../../types/session.types';

export const RaceAdminActions = ({
    race,
    user,
}: {
    race: Race;
    user?: User;
}) => {
    if (!user || !isRaceModerator(race, user)) {
        return <></>;
    }
    const raceIsPending = race.status === 'pending';
    const raceIsOngoing = race.status === 'progress';

    const raceCanBeStarted =
        race.startMethod === 'moderator' &&
        race.participants &&
        race.participants.length > 1 &&
        race.participants?.every(
            (participant) => participant.status === 'ready',
        );

    const raceCanBeEdited = raceIsPending;
    const raceCanBeAborted = raceIsPending;
    const userCanBeKicked = raceIsPending || raceIsOngoing;
    const userTimeCanBeSet = raceIsOngoing;

    const showAdminpanel =
        raceCanBeEdited ||
        raceCanBeAborted ||
        userCanBeKicked ||
        userTimeCanBeSet;

    if (!showAdminpanel) return;

    return (
        <div
            className="rounded-3 px-4 pt-2 pb-4 mb-3 game-border bg-body-secondary"
            style={{
                borderColor: 'var(--bs-link-color)',
            }}
        >
            <span className="h4 w-100 flex-center">Moderator actions</span>
            <hr />
            {raceCanBeStarted && (
                <StartRaceButton
                    raceId={race.raceId}
                    className="w-100 fs-5 mt-2 mb-2"
                />
            )}
            {raceCanBeEdited && (
                <a href={`/races/${race.raceId}/edit`}>
                    <Button variant="primary" className="w-100 fs-5">
                        Edit race
                    </Button>
                </a>
            )}
            {raceCanBeAborted && (
                <AbortRaceButton
                    raceId={race.raceId}
                    variant="danger"
                    className="w-100 fs-5 mt-2"
                />
            )}
            {userCanBeKicked && (
                <KickUserForm
                    raceId={race.raceId}
                    users={race.participants?.map((p) => p.user)}
                />
            )}
            {userTimeCanBeSet && (
                <SetTimeForUserForm
                    raceId={race.raceId}
                    currentRaceTime={
                        new Date().getTime() -
                        new Date(race.startTime).getTime()
                    }
                    users={race.participants?.map((p) => p.user)}
                    times={race.participants?.map((p) => p.finalTime)}
                />
            )}
        </div>
    );
};
