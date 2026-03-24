'use client';

import { Form } from 'react-bootstrap';
import {
    approveJoinAction,
    deleteTeamAction,
    denyJoinAction,
    kickTeamMemberAction,
    leaveTeamAction,
    requestJoinTeamAction,
} from '~app/(new-layout)/races/actions/team-actions';
import { Race, RaceTeam } from '~app/(new-layout)/races/races.types';
import { Button } from '~src/components/Button/Button';
import { SubmitButton } from '~src/components/Button/SubmitButton';
import { UserLink } from '~src/components/links/links';
import { DurationToFormatted } from '~src/components/util/datetime';
import { User } from '../../../../../types/session.types';
import styles from './team-lobby.module.scss';

interface TeamCardProps {
    team: RaceTeam;
    teamIndex: number;
    race: Race;
    user?: User;
    userTeamName: string | null;
    userIsPending: boolean;
    isModerator: boolean;
}

export const TeamCard = ({
    team,
    teamIndex,
    race,
    user,
    userTeamName,
    userIsPending,
    isModerator,
}: TeamCardProps) => {
    const username = user?.username;
    const isOnThisTeam = username ? team.members.includes(username) : false;
    const isCaptain = username === team.captain;
    const canApprove = isCaptain || isModerator;
    const canJoin =
        !userTeamName &&
        !userIsPending &&
        team.members.length < (race.teamMaxSize ?? Infinity);
    const isFull = team.members.length >= (race.teamMaxSize ?? Infinity);

    const participants = race.participants ?? [];

    return (
        <div
            className={styles.teamCard}
            style={{ '--team-color': team.color } as React.CSSProperties}
        >
            <div className={styles.teamHeader}>
                <span className={styles.teamName}>
                    <span
                        className={styles.teamColorDot}
                        style={{ backgroundColor: team.color }}
                    />
                    {team.name}
                </span>
                <span className={styles.teamCapacity}>
                    {team.members.length}/{race.teamMaxSize ?? '?'}
                </span>
            </div>

            <ul className={styles.memberList}>
                {team.members.map((member) => {
                    const participant = participants.find(
                        (p) => p.user === member,
                    );
                    return (
                        <li key={member} className={styles.memberItem}>
                            <span>
                                <UserLink
                                    username={member}
                                    url={`/${member}/races`}
                                />
                                {member === team.captain && (
                                    <span className={styles.captainBadge}>
                                        Captain
                                    </span>
                                )}
                            </span>
                            <span className="d-flex align-items-center gap-2">
                                {participant?.pb && (
                                    <span
                                        style={{ fontSize: '0.8rem' }}
                                        className="text-secondary"
                                    >
                                        PB:{' '}
                                        <DurationToFormatted
                                            duration={participant.pb}
                                        />
                                    </span>
                                )}
                                {isModerator &&
                                    race.status === 'pending' &&
                                    member !== username && (
                                        <KickButton
                                            raceId={race.raceId}
                                            teamIndex={teamIndex}
                                            username={member}
                                        />
                                    )}
                            </span>
                        </li>
                    );
                })}
            </ul>

            {team.pendingRequests.length > 0 && canApprove && (
                <div className={styles.pendingSection}>
                    <div className={styles.pendingLabel}>Pending Requests</div>
                    {team.pendingRequests.map((reqUser) => (
                        <div key={reqUser} className={styles.pendingItem}>
                            <UserLink
                                username={reqUser}
                                url={`/${reqUser}/races`}
                            />
                            <div className={styles.pendingActions}>
                                <ApproveButton
                                    raceId={race.raceId}
                                    teamIndex={teamIndex}
                                    username={reqUser}
                                />
                                <DenyButton
                                    raceId={race.raceId}
                                    teamIndex={teamIndex}
                                    username={reqUser}
                                />
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <div className={styles.teamActions}>
                {isOnThisTeam && race.status === 'pending' && (
                    <LeaveButton raceId={race.raceId} teamIndex={teamIndex} />
                )}
                {username &&
                    canJoin &&
                    !isFull &&
                    race.status === 'pending' && (
                        <JoinButton
                            raceId={race.raceId}
                            teamIndex={teamIndex}
                            requiresPassword={!!race.requiresPassword}
                        />
                    )}
                {isFull && !isOnThisTeam && (
                    <span
                        className="text-secondary"
                        style={{ fontSize: '0.8rem' }}
                    >
                        Team is full
                    </span>
                )}
                {isModerator && race.status === 'pending' && (
                    <DeleteTeamButton
                        raceId={race.raceId}
                        teamIndex={teamIndex}
                    />
                )}
            </div>
        </div>
    );
};

const JoinButton = ({
    raceId,
    teamIndex,
    requiresPassword,
}: {
    raceId: string;
    teamIndex: number;
    requiresPassword: boolean;
}) => (
    <Form action={requestJoinTeamAction}>
        <input hidden name="raceId" value={raceId} readOnly />
        <input hidden name="teamIndex" value={teamIndex.toString()} readOnly />
        {requiresPassword && (
            <Form.Control
                name="password"
                type="password"
                placeholder="Password"
                size="sm"
                className="mb-1"
            />
        )}
        <SubmitButton
            innerText="Request to Join"
            pendingText="Requesting..."
            variant="outline-primary"
            size="sm"
        />
    </Form>
);

const LeaveButton = ({
    raceId,
    teamIndex,
}: {
    raceId: string;
    teamIndex: number;
}) => (
    <Form action={leaveTeamAction}>
        <input hidden name="raceId" value={raceId} readOnly />
        <input hidden name="teamIndex" value={teamIndex.toString()} readOnly />
        <SubmitButton
            innerText="Leave Team"
            pendingText="Leaving..."
            variant="outline-danger"
            size="sm"
        />
    </Form>
);

const ApproveButton = ({
    raceId,
    teamIndex,
    username,
}: {
    raceId: string;
    teamIndex: number;
    username: string;
}) => (
    <Form action={approveJoinAction}>
        <input hidden name="raceId" value={raceId} readOnly />
        <input hidden name="teamIndex" value={teamIndex.toString()} readOnly />
        <input hidden name="username" value={username} readOnly />
        <SubmitButton
            innerText="Approve"
            pendingText="..."
            variant="outline-success"
            size="sm"
        />
    </Form>
);

const DenyButton = ({
    raceId,
    teamIndex,
    username,
}: {
    raceId: string;
    teamIndex: number;
    username: string;
}) => (
    <Form action={denyJoinAction}>
        <input hidden name="raceId" value={raceId} readOnly />
        <input hidden name="teamIndex" value={teamIndex.toString()} readOnly />
        <input hidden name="username" value={username} readOnly />
        <SubmitButton
            innerText="Deny"
            pendingText="..."
            variant="outline-danger"
            size="sm"
        />
    </Form>
);

const KickButton = ({
    raceId,
    teamIndex,
    username,
}: {
    raceId: string;
    teamIndex: number;
    username: string;
}) => (
    <Form action={kickTeamMemberAction} className="d-inline">
        <input hidden name="raceId" value={raceId} readOnly />
        <input hidden name="teamIndex" value={teamIndex.toString()} readOnly />
        <input hidden name="username" value={username} readOnly />
        <Button type="submit" variant="outline-danger" size="sm">
            Kick
        </Button>
    </Form>
);

const DeleteTeamButton = ({
    raceId,
    teamIndex,
}: {
    raceId: string;
    teamIndex: number;
}) => (
    <Form action={deleteTeamAction}>
        <input hidden name="raceId" value={raceId} readOnly />
        <input hidden name="teamIndex" value={teamIndex.toString()} readOnly />
        <SubmitButton
            innerText="Delete Team"
            pendingText="Deleting..."
            variant="outline-danger"
            size="sm"
        />
    </Form>
);
