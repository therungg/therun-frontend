import { UserStats } from "~app/(old-layout)/races/races.types";
import { Table } from "react-bootstrap";
import { DurationToFormatted } from "~src/components/util/datetime";

export const UserRaceStatsTable = ({ raceStats }: { raceStats: UserStats }) => {
    return (
        <>
            <Table striped bordered hover>
                <thead>
                    <tr>
                        <th>Name</th>
                        <th style={{ textAlign: "right" }}>Value</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>Total Races</td>
                        <td style={{ textAlign: "right" }}>
                            {raceStats.totalRaces}
                        </td>
                    </tr>
                    <tr>
                        <td>Finished Races</td>
                        <td style={{ textAlign: "right" }}>
                            {raceStats.totalFinishedRaces}
                        </td>
                    </tr>
                    <tr>
                        <td>Finished %</td>
                        <td style={{ textAlign: "right" }}>
                            {(
                                (raceStats.totalFinishedRaces /
                                    raceStats.totalRaces) *
                                100
                            ).toFixed(0)}
                            %
                        </td>
                    </tr>
                    <tr>
                        <td>Total Race Time</td>
                        <td style={{ textAlign: "right" }}>
                            <DurationToFormatted
                                duration={raceStats.totalRaceTime}
                            />
                        </td>
                    </tr>
                </tbody>
            </Table>
        </>
    );
};
