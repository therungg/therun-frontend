import { Card, Col, Row } from 'react-bootstrap';
import styles from '~src/components/css/LiveRun.module.scss';
import { Tournament } from '~src/components/tournament/tournament-info';
import { FromNow } from '~src/components/util/datetime';
import { safeEncodeURI } from '~src/utils/uri';

export const CurrentTournaments = ({
    tournaments,
}: {
    tournaments: Tournament[];
}) => {
    return (
        <div>
            <Row className="gy-3 gx-3">
                {tournaments.map((tournament) => {
                    return (
                        <Col key={tournament.name} xl={6} lg={12} xs={12}>
                            <a
                                href={`/tournaments/${safeEncodeURI(
                                    tournament.name,
                                )}`}
                                className="text-decoration-none"
                            >
                                <Card
                                    className={`${styles.liveRunContainer} game-border h-100`}
                                >
                                    <Row className="flex-grow-1">
                                        <Col xs={4}>
                                            <Card.Img
                                                className="rounded-0 rounded-start me-0 pe-0 h-100 d-inline-block"
                                                src={
                                                    tournament.gameImage &&
                                                    tournament.gameImage !==
                                                        'noimage'
                                                        ? tournament.gameImage
                                                        : `/logo_dark_theme_no_text_transparent.png`
                                                }
                                                height={100}
                                                width={20}
                                            />
                                        </Col>
                                        <Col
                                            xs={8}
                                            className="p-2 ps-1 pe-4 d-flex flex-column"
                                        >
                                            <div className="d-flex justify-content-between gap-3">
                                                <Card.Title
                                                    className="m-0 p-0 h5 text-truncate"
                                                    style={{
                                                        color: 'var(--bs-link-color)',
                                                    }}
                                                >
                                                    {tournament.shortName}
                                                </Card.Title>
                                            </div>

                                            <div className="d-flex justify-content-between gap-3 mb-0 pb-2 w-100 border-bottom">
                                                <div className="pb-0 mb-0 w-100 fst-italic text-truncate">
                                                    {
                                                        tournament
                                                            .eligibleRuns[0]
                                                            .game
                                                    }
                                                </div>
                                            </div>

                                            <div className="pt-1">
                                                <Card.Text className="text-truncate">
                                                    {tournament.organizer}
                                                </Card.Text>
                                            </div>
                                            <div className="h-100 d-flex align-items-end justify-content-between">
                                                <div>
                                                    Started{' '}
                                                    <FromNow
                                                        time={
                                                            tournament.startDate
                                                        }
                                                    />
                                                </div>
                                                <div>
                                                    Ends{' '}
                                                    <FromNow
                                                        time={
                                                            tournament.endDate
                                                        }
                                                    />
                                                </div>
                                            </div>
                                        </Col>
                                    </Row>
                                </Card>
                            </a>
                        </Col>
                    );
                })}
            </Row>
        </div>
    );
};
