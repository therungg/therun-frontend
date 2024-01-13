"use client";

import { Race } from "~app/races/races.types";
import { UserLink } from "~src/components/links/links";
import Link from "next/link";
import { Table } from "react-bootstrap";
import { DurationToFormatted } from "~src/components/util/datetime";

export const InProgressRaces = ({ races }: { races: Race[] }) => {
    return (
        <Table responsive bordered striped>
            <thead>
                <tr>
                    <th>Name</th>
                    <th>Created By</th>
                    <th># Players</th>
                    <th>Top participants</th>
                    <th>Started</th>
                </tr>
            </thead>
            <tbody>
                {races.map((race) => {
                    return (
                        <tr key={race.raceId}>
                            <td>
                                <Link href={`/races/${race.raceId}`}>
                                    {race.customName}
                                </Link>
                            </td>
                            <td>
                                <UserLink username={race.creator} />
                            </td>
                            <td>{race.participantCount}</td>
                            <td>
                                {race.topParticipants
                                    .slice(0, 3)
                                    .map((participant) => {
                                        return (
                                            <div
                                                key={
                                                    race.raceId +
                                                    participant.user
                                                }
                                            >
                                                {participant.user}{" "}
                                                {participant.pb && (
                                                    <DurationToFormatted
                                                        duration={
                                                            participant.pb
                                                        }
                                                    />
                                                )}
                                            </div>
                                        );
                                    })}
                            </td>
                            <td>
                                {new Date(
                                    race.startTime as string,
                                ).toLocaleString()}
                            </td>
                        </tr>
                    );
                })}
            </tbody>
        </Table>
    );
};
