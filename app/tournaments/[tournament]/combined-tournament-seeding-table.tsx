import { CombinedLeaderboardStat } from "~app/tournaments/[tournament]/get-combined-tournament-leaderboard.component";
import { Tournament } from "~src/components/tournament/tournament-info";
import { Table } from "react-bootstrap";
import { DurationToFormatted } from "~src/components/util/datetime";

export const CombinedTournamentSeedingTable = ({
    tournaments,
    guidingTournament,
    leaderboards,
}: {
    tournaments: Tournament[];
    guidingTournament: Tournament;
    leaderboards: CombinedLeaderboardStat[];
}) => {
    return (
        <div>
            <h2>Seeding table</h2>
            <Table responsive striped bordered hover>
                <thead>
                    <tr>
                        <th>{guidingTournament.name}</th>
                        {tournaments.map((tournament) => (
                            <th key={tournament.game}>{tournament.game}</th>
                        ))}
                        <th>AVG %</th>
                        <th>X</th>
                    </tr>
                </thead>
                <tbody>
                    {leaderboards.map((leaderboard) => (
                        <tr key={leaderboard.username}>
                            <td>
                                {leaderboard.seed}. {leaderboard.username}
                            </td>
                            {tournaments.map((tournament) => {
                                const run = leaderboard.runs.get(
                                    tournament.game as string
                                );
                                return (
                                    <td
                                        key={
                                            leaderboard.username +
                                            tournament.game
                                        }
                                    >
                                        {run !== undefined && (
                                            <>
                                                <DurationToFormatted
                                                    duration={
                                                        run.stat as string
                                                    }
                                                />{" "}
                                                | #{run.placing} |{" "}
                                                {run.differenceToFirst.toFixed(
                                                    2
                                                )}
                                            </>
                                        )}
                                    </td>
                                );
                            })}
                            <td>{leaderboard.seedPercentage.toFixed(2)}</td>
                            <td>{leaderboard.gameCount}</td>
                        </tr>
                    ))}
                </tbody>
            </Table>
        </div>
    );
};
