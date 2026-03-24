'use client';

import { Race } from '~app/(new-layout)/races/races.types';
import { isRaceModerator } from '~src/rbac/confirm-permission';
import { User } from '../../../../../types/session.types';
import { CreateTeamForm } from './create-team-form';
import { TeamCard } from './team-card';
import styles from './team-lobby.module.scss';

interface TeamLobbyProps {
    race: Race;
    user?: User;
}

export const TeamLobby = ({ race, user }: TeamLobbyProps) => {
    const teams = race.teams ?? [];
    const username = user?.username;
    const isModerator = user ? isRaceModerator(race, user) : false;

    const userTeamName = username
        ? (teams.find((t) => t.members.includes(username))?.name ?? null)
        : null;

    const userIsPending = username
        ? teams.some((t) => t.pendingRequests.includes(username))
        : false;

    const teamsNotMeetingMin = teams.filter(
        (t) => t.members.length < (race.teamMinSize ?? 0),
    );

    return (
        <div className={styles.teamLobby}>
            {teams.map((team, index) => (
                <TeamCard
                    key={team.name}
                    team={team}
                    teamIndex={index}
                    race={race}
                    user={user}
                    userTeamName={userTeamName}
                    userIsPending={userIsPending}
                    isModerator={isModerator}
                />
            ))}

            {username &&
                !userTeamName &&
                !userIsPending &&
                race.status === 'pending' && <CreateTeamForm race={race} />}

            {userIsPending && (
                <div className={styles.startGateWarning}>
                    Your join request is pending approval.
                </div>
            )}

            {teamsNotMeetingMin.length > 0 && (
                <div className={styles.startGateWarning}>
                    All teams need at least {race.teamMinSize} members to start.
                    Teams not meeting minimum:{' '}
                    {teamsNotMeetingMin.map((t) => t.name).join(', ')}
                </div>
            )}
        </div>
    );
};
