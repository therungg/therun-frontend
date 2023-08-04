"use client";

import { Tournament } from "~src/components/tournament/tournament-info";
import { Card, Col, Image, Row } from "react-bootstrap";
import { FromNow } from "~src/components/util/datetime";
import { AllTournamentsProps } from "~app/tournaments/all-tournaments.types";

export function AllTournaments({
    finishedTournaments,
    ongoingTournaments,
    upcomingTournaments,
}: AllTournamentsProps) {
    return (
        <div>
            <h1>Ongoing tournaments</h1>

            <ListTournaments tournaments={ongoingTournaments} />

            <h1>Upcoming tournaments</h1>

            <ListTournaments tournaments={upcomingTournaments} />

            <h1>Finished tournaments</h1>

            <ListTournaments tournaments={finishedTournaments} />
        </div>
    );
}

export const ListTournaments = ({
    tournaments,
}: {
    tournaments: Tournament[];
}) => {
    return (
        <Row>
            {tournaments.map((tournament: Tournament) => {
                const startDate = new Date(tournament.startDate);
                const endDate = new Date(tournament.endDate);
                const durationInDays = Math.round(
                    (endDate.getTime() - startDate.getTime()) /
                        (1000 * 60 * 60 * 24)
                );

                return (
                    <Col
                        className={"col-xl-6 col-lg-6 col-md-12 col-sm-12"}
                        key={tournament.name}
                    >
                        {tournament.logoUrl && (
                            <div className="float-start d-flex d-none d-sm-block align-items-center min-h-152p me-2 ms-2">
                                <a href={`/tournaments/${tournament.name}`}>
                                    <Image
                                        className="min-h-152p"
                                        alt={"Tournament Logo"}
                                        src={tournament.logoUrl}
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
                                        href={`/tournaments/${tournament.name}`}
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
                                    <Col className={"col-md-6 col-5"}>
                                        <b>Start Date:</b>
                                    </Col>
                                    <Col className={"col-md-6 col-7"}>
                                        {startDate.toDateString()}
                                    </Col>
                                </Row>
                                <Row>
                                    <Col className={"col-md-6 col-5"}>
                                        <b>End Date:</b>
                                    </Col>
                                    <Col className={"col-md-6 col-7"}>
                                        {endDate.toDateString()}
                                    </Col>
                                </Row>
                                <Row>
                                    <Col className={"col-md-6 col-5"}>
                                        <b>Duration:</b>
                                    </Col>
                                    <Col className={"col-md-6 col-7"}>
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
