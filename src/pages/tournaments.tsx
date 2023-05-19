import { GetServerSideProps } from "next";
import { getTournaments } from "../components/tournament/getTournaments";
import { Tournament } from "../components/tournament/tournament-info";
import { Card, Col, Image, Row } from "react-bootstrap";
import styles from "../components/css/Games.module.scss";
import { FromNow } from "../components/util/datetime";

export const Tournaments = ({
    finishedTournaments,
    ongoingTournaments,
    upcomingTournaments,
}: {
    finishedTournaments: Tournament[];
    ongoingTournaments: Tournament[];
    upcomingTournaments: Tournament[];
}) => {
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
};

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
                            <div
                                className={styles.image}
                                style={{ marginLeft: "0.5rem" }}
                            >
                                <a href={`/tournaments/${tournament.name}`}>
                                    <Image
                                        alt={"Tournament Logo"}
                                        src={tournament.logoUrl}
                                        height={135}
                                        width={135}
                                    />
                                </a>
                            </div>
                        )}
                        <Card className={`card-columns ${styles.card}`}>
                            <Card.Header className={styles.cardHeader}>
                                <div style={{ overflow: "hidden" }}>
                                    <a
                                        href={`/tournaments/${tournament.name}`}
                                        style={{ fontSize: "large" }}
                                    >
                                        {tournament.shortName ||
                                            tournament.name}
                                    </a>
                                    <div style={{ float: "right" }}>
                                        <i style={{ alignSelf: "center" }}>
                                            <FromNow
                                                time={tournament.startDate}
                                            />
                                        </i>
                                    </div>
                                </div>
                            </Card.Header>
                            <Card.Body className={styles.cardBody}>
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
export const getServerSideProps: GetServerSideProps = async () => {
    const tournaments: Tournament[] = await getTournaments();

    const now = new Date().toISOString();

    const finishedTournaments = tournaments.filter(
        (tournament) => tournament.endDate < now
    );
    const ongoingTournaments = tournaments.filter(
        (tournament) => tournament.startDate < now && tournament.endDate > now
    );
    const upcomingTournaments = tournaments.filter(
        (tournament) => tournament.startDate > now
    );

    return {
        props: { finishedTournaments, ongoingTournaments, upcomingTournaments },
    };
};

export default Tournaments;
