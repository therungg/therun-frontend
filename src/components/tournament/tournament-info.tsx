import moment from 'moment';
import React from 'react';
import { Col, Form, Row, Table } from 'react-bootstrap';
import { CategoryLeaderboard } from '~app/(old-layout)/games/[game]/game.types';
import { PatreonBunnySvg } from '~app/(old-layout)/patron/patreon-info';
import { increaseEndTimeByAnHour } from '~app/(old-layout)/tournaments/actions/increase-end-time-by-an-hour';
import { SubmitButton } from '~src/components/Button/SubmitButton';
import { User } from '../../../types/session.types';
import styles from '../css/Game.module.scss';

export interface Tournament {
    name: string;
    description?: string;
    rules?: string[];
    socials?: {
        twitch?: Social;
        twitter?: Social;
        youtube?: Social;
    };
    startDate: string;
    endDate: string;
    admin: string;
    eligiblePeriods: DateRange[];
    eligibleUsers: string[] | null;
    eligibleRuns: GameCategory[];
    ineligibleUsersForPoints: string[] | null;
    ineligibleUsers: string[] | null;
    moderators: string[] | null;
    url: string;
    pointDistribution?: number[] | null;
    leaderboards?: CategoryLeaderboard;
    gameTime?: boolean;
    shortName?: string;

    logoUrl?: string;
    minimumTimeSeconds?: number;
    forceStream?: string;

    qualifier?: string;
    parentTournamentName?: string;
    parentTournamentSequence?: number;

    game?: string;
    category?: string;
    excludedRuns: ExcludedRun[];
    customRuns: CustomRun[];

    raceId?: string;
    gameImage: string;
    organizer: string;
}

export interface CustomRun {
    user: string;
    date: string;
    time: string;
}

interface Social {
    display: string;
    urlDisplay: string;
    url: string;
}

export interface DateRange {
    startDate: string;
    endDate: string;
}

interface GameCategory {
    game: string;
    category: string;
}

interface ExcludedRun {
    user: string;
    startedAt: string;
}

//TODO:: This page is ugly and terrible design. There's a lot of cool data on tournaments, so use it properly.
export const TournamentInfo = ({
    tournament,
    user,
}: {
    tournament: Tournament;
    user?: User;
}) => {
    const isAdmin =
        user?.username && tournament.moderators?.includes(user.username);
    return (
        <div>
            {tournament.description && (
                <div className="w-75 mx-auto text-center">
                    <div
                        dangerouslySetInnerHTML={{
                            __html: tournament.description,
                        }}
                    />
                </div>
            )}
            <Table
                responsive
                borderless
                className={styles.tableVertical}
                style={{ marginBottom: '2rem' }}
            >
                <tbody>
                    {tournament.eligiblePeriods.length === 1 && (
                        <>
                            <tr className={styles.tableVerticalHeader}>
                                <th colSpan={2}>Tournament Dates</th>
                            </tr>
                            <tr>
                                <th>Starting at</th>
                                <td>
                                    {moment(tournament.startDate).format('LLL')}
                                </td>
                            </tr>
                            <tr>
                                <th>Ending at</th>
                                <td>
                                    {moment(tournament.endDate).format('LLL')}
                                    {isAdmin && (
                                        <Form
                                            suppressHydrationWarning
                                            action={increaseEndTimeByAnHour}
                                            className="ms-2"
                                        >
                                            <input
                                                hidden
                                                name="tournament"
                                                value={tournament.name}
                                                readOnly
                                            />

                                            <input
                                                hidden
                                                name="date"
                                                value={new Date(
                                                    new Date(
                                                        tournament.endDate,
                                                    ).getTime() +
                                                        60 * 60 * 1000,
                                                ).toISOString()}
                                                readOnly
                                            />

                                            <input
                                                hidden
                                                name="heat"
                                                value={0}
                                                readOnly
                                            />
                                            <SubmitButton
                                                innerText="Increase End Time By An Hour"
                                                pendingText="Increasing End Time By An Hour"
                                            />
                                        </Form>
                                    )}
                                </td>
                            </tr>
                        </>
                    )}
                    {tournament.eligiblePeriods.length > 1 && (
                        <>
                            <tr className={styles.tableVerticalHeader}>
                                <th colSpan={2}>Tournament</th>
                            </tr>
                            {tournament.eligiblePeriods.map((period, i) => {
                                const hourAfterEndDate = new Date(
                                    new Date(period.endDate).getTime() +
                                        60 * 60 * 1000,
                                ).toISOString();
                                const hourBeforeEndDate = new Date(
                                    new Date(period.endDate).getTime() -
                                        60 * 60 * 1000,
                                ).toISOString();
                                return (
                                    <React.Fragment
                                        key={JSON.stringify(period)}
                                    >
                                        <tr>
                                            <th>Day {i + 1}</th>
                                            <td className="d-flex">
                                                {moment(
                                                    period.startDate,
                                                ).format('LLL')}{' '}
                                                -{' '}
                                                {moment(period.endDate).format(
                                                    'LLL',
                                                )}
                                                {isAdmin && (
                                                    <div>
                                                        <Form
                                                            suppressHydrationWarning
                                                            action={
                                                                increaseEndTimeByAnHour
                                                            }
                                                            className="ms-2"
                                                        >
                                                            <input
                                                                hidden
                                                                name="tournament"
                                                                value={
                                                                    tournament.name
                                                                }
                                                                readOnly
                                                            />

                                                            <input
                                                                hidden
                                                                name="date"
                                                                value={
                                                                    hourBeforeEndDate
                                                                }
                                                                readOnly
                                                            />

                                                            <input
                                                                hidden
                                                                name="heat"
                                                                value={i}
                                                                readOnly
                                                            />
                                                            <SubmitButton
                                                                variant="danger"
                                                                innerText={`Decrease End Time Of Day ${
                                                                    i + 1
                                                                } By An Hour`}
                                                                pendingText="Decrease End Time By An Hour"
                                                            />
                                                        </Form>
                                                        <Form
                                                            suppressHydrationWarning
                                                            action={
                                                                increaseEndTimeByAnHour
                                                            }
                                                            className="ms-2"
                                                        >
                                                            <input
                                                                hidden
                                                                name="tournament"
                                                                value={
                                                                    tournament.name
                                                                }
                                                                readOnly
                                                            />

                                                            <input
                                                                hidden
                                                                name="date"
                                                                value={
                                                                    hourAfterEndDate
                                                                }
                                                                readOnly
                                                            />

                                                            <input
                                                                hidden
                                                                name="heat"
                                                                value={i}
                                                                readOnly
                                                            />
                                                            <SubmitButton
                                                                innerText={`Increase End Time Of Day ${
                                                                    i + 1
                                                                } By An Hour`}
                                                                pendingText="Increasing End Time By An Hour"
                                                            />
                                                        </Form>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    </React.Fragment>
                                );
                            })}
                        </>
                    )}
                    {tournament.socials &&
                        Object.keys(tournament.socials).length > 0 && (
                            <tr className={styles.tableVerticalHeader}>
                                <th colSpan={2}>Tournament socials</th>
                            </tr>
                        )}
                    {tournament.socials &&
                        Object.values(tournament.socials).map((social) => {
                            return (
                                <React.Fragment key={JSON.stringify(social)}>
                                    <tr key={social.display}>
                                        <th>{social.display}</th>
                                        <td>
                                            <a
                                                target="_blank"
                                                rel="noreferrer"
                                                href={social.url}
                                            >
                                                {social.urlDisplay}
                                            </a>
                                        </td>
                                    </tr>
                                </React.Fragment>
                            );
                        })}
                </tbody>
            </Table>
            <Row>
                {tournament.pointDistribution &&
                    tournament.pointDistribution.length > 0 && (
                        <Col xl={3}>
                            <h3>Points</h3>
                            <ul>
                                {tournament.pointDistribution.map(
                                    (points, key) => {
                                        let extension = 'th';
                                        if (key === 0) extension = 'st';
                                        if (key === 1) extension = 'nd';
                                        if (key === 2) extension = 'rd';
                                        const displayKey = key + 1 + extension;

                                        return (
                                            <li key={key}>
                                                {displayKey}:{' '}
                                                <span>
                                                    <strong>{points}</strong>{' '}
                                                    points
                                                </span>
                                            </li>
                                        );
                                    },
                                )}
                            </ul>
                        </Col>
                    )}

                {tournament.rules && tournament.rules.length > 0 && (
                    <Col xl={3}>
                        <h3>Rules</h3>
                        <ul>
                            {tournament.rules.map((rule) => {
                                try {
                                    const urlRule = new URL(rule);

                                    return (
                                        <a
                                            href={urlRule.toString()}
                                            target="_blank"
                                            rel="nofollow"
                                        >
                                            Link to full ruleset
                                        </a>
                                    );
                                } catch (_) {
                                    return <li key={rule}>{rule}</li>;
                                }
                            })}
                        </ul>
                    </Col>
                )}
                {tournament.moderators && tournament.moderators.length > 0 && (
                    <Col xl={3}>
                        <h3>Moderators</h3>
                        <ul>
                            {tournament.moderators.map((moderator) => {
                                return (
                                    <li key={moderator}>
                                        <a
                                            target="_blank"
                                            rel="noreferrer"
                                            href={`/${moderator}`}
                                        >
                                            {moderator}
                                        </a>
                                    </li>
                                );
                            })}
                        </ul>
                    </Col>
                )}
                {tournament.eligibleUsers &&
                    tournament.eligibleUsers.length > 0 && (
                        <Col xl={3}>
                            <h3>Runners</h3>
                            <ul>
                                {tournament.eligibleUsers.map((moderator) => {
                                    return (
                                        <li key={moderator}>
                                            <a
                                                target="_blank"
                                                rel="noreferrer"
                                                href={`/${moderator}`}
                                            >
                                                {moderator}
                                            </a>
                                        </li>
                                    );
                                })}
                            </ul>
                        </Col>
                    )}
                <Col xl={3}>
                    <h3>Support therun.gg</h3>
                    <PatreonBunnySvg size={100} />
                </Col>
            </Row>
        </div>
    );
};
