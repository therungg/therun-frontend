import React from 'react';
import tournamentStyles from '~src/components/css/Tournament.module.scss';
import { GameImage } from '~src/components/image/gameimage';
import { Tournament } from '~src/components/tournament/tournament-info';
import { FromNow } from '~src/components/util/datetime';
import { safeEncodeURI } from '~src/utils/uri';

export const UpcomingTournaments = ({
    tournaments,
}: {
    tournaments: Tournament[];
}) => {
    if (!tournaments || tournaments.length < 1) {
        return <></>;
    }

    return (
        <div className={tournamentStyles.upcomingSection}>
            <h2>Upcoming</h2>
            <hr />
            <div>
                {!tournaments ||
                    (tournaments.length < 1 && (
                        <span>No upcoming tournaments...</span>
                    ))}
                {tournaments &&
                    tournaments.length > 0 &&
                    [...tournaments].reverse().map((tournament) => (
                        <a
                            href={`/tournaments/${safeEncodeURI(
                                tournament.name,
                            )}`}
                            className="card-link-wrapper"
                            key={tournament.name}
                        >
                            <UpcomingTournament tournament={tournament} />
                        </a>
                    ))}
            </div>
        </div>
    );
};

const UpcomingTournament = ({ tournament }: { tournament: Tournament }) => {
    return (
        <div
            key={`${tournament.name}-game-image`}
            className={`d-flex w-100 ${tournamentStyles.upcomingCard} rounded-3`}
            style={{ color: 'var(--bs-body-color)' }}
        >
            <GameImage
                alt={`Image for ${tournament.name}`}
                src={tournament.gameImage || ''}
                quality="large"
                height={64 * 1.3}
                width={48 * 1.3}
                className="rounded-2"
            />
            <div className="px-3 flex-grow-1 d-flex flex-column justify-content-center">
                <div
                    className={`${tournamentStyles.upcomingCardTitle} mb-1 p-0`}
                    style={{
                        color: 'var(--bs-link-color)',
                    }}
                >
                    {tournament.shortName}
                </div>
                <div className={tournamentStyles.upcomingCardGame}>
                    {tournament.eligibleRuns[0].game} -{' '}
                    {tournament.eligibleRuns[0].category}
                </div>
                <div
                    className={`${tournamentStyles.upcomingCardMeta} d-flex justify-content-between`}
                >
                    <div>{tournament.organizer}</div>
                    <div>
                        Starts <FromNow time={tournament.startDate} />
                    </div>
                </div>
            </div>
        </div>
    );
};
