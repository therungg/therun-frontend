"use client";

import { Tournament } from "~src/components/tournament/tournament-info";
import { Card, Col, Image, Row } from "react-bootstrap";
import { FromNow } from "~src/components/util/datetime";
import { AllTournamentsProps } from "~app/(old-layout)/tournaments/all-tournaments.types";
import { safeEncodeURI } from "~src/utils/uri";
import { TournamentInfoBox } from "~app/(old-layout)/tournaments/tournament-info-box";
import { UpcomingTournaments } from "~app/(old-layout)/tournaments/upcoming-tournaments";
import { FinishedTournaments } from "~app/(old-layout)/tournaments/finished-tournaments";
import { CurrentTournaments } from "~app/(old-layout)/tournaments/current-tournaments";

export function AllTournaments({
    finishedTournaments,
    ongoingTournaments,
    upcomingTournaments,
}: AllTournamentsProps) {
    return (
        <div>
            <h1>Tournaments</h1>
            <Row>
                <Col xl={8}>
                    <CurrentTournaments tournaments={ongoingTournaments} />
                    <hr className="mt-4" />
                    <FinishedTournaments tournaments={finishedTournaments} />
                </Col>
                <Col xl={4}>
                    <TournamentInfoBox />
                    <UpcomingTournaments tournaments={upcomingTournaments} />
                </Col>
            </Row>
        </div>
    );
}

export const ListTournaments = ({
    tournaments,
}: {
    tournaments: Tournament[];
}) => {
    return (
        <Row className="g-3 mb-5">
            {tournaments.map((tournament: Tournament) => {
                const startDate = new Date(tournament.startDate);
                const endDate = new Date(tournament.endDate);
                const durationInDays = Math.round(
                    (endDate.getTime() - startDate.getTime()) /
                        (1000 * 60 * 60 * 24),
                );

                return (
                    <Col sm={12} lg={6} key={tournament.name}>
                        {tournament.logoUrl && (
                            <div className="float-start d-flex d-none d-sm-block align-items-center me-2">
                                <a
                                    href={`/tournaments/${safeEncodeURI(
                                        tournament.name,
                                    )}`}
                                >
                                    <Image
                                        className="w-auto"
                                        alt="Tournament Logo"
                                        src={`/${tournament.logoUrl}`}
                                        height={135}
                                        width={135}
                                    />
                                </a>
                            </div>
                        )}
                        <Card className="card-columns">
                            <Card.Header className="border-0">
                                <div className="overflow-hidden">
                                    <a
                                        href={`/tournaments/${safeEncodeURI(
                                            tournament.name,
                                        )}`}
                                        className="fs-large"
                                    >
                                        {tournament.shortName ||
                                            tournament.name}
                                    </a>
                                    <div className="float-end">
                                        <i className="align-self-center">
                                            <FromNow
                                                time={tournament.startDate}
                                            />
                                        </i>
                                    </div>
                                </div>
                            </Card.Header>
                            <Card.Body>
                                <Row>
                                    <Col xs={5} md={6}>
                                        <b>Start Date:</b>
                                    </Col>
                                    <Col xs={7} md={6}>
                                        {startDate.toDateString()}
                                    </Col>
                                </Row>
                                <Row>
                                    <Col xs={5} md={6}>
                                        <b>End Date:</b>
                                    </Col>
                                    <Col xs={7} md={6}>
                                        {endDate.toDateString()}
                                    </Col>
                                </Row>
                                <Row>
                                    <Col xs={5} md={6}>
                                        <b>Duration:</b>
                                    </Col>
                                    <Col xs={7} md={6}>
                                        {durationInDays} days
                                    </Col>
                                </Row>
                            </Card.Body>
                        </Card>
                    </Col>
                );
            })}
        </Row>
    );
};
