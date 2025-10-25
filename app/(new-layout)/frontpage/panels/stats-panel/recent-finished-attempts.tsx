import { Suspense } from 'react';
import { Col, Row } from 'react-bootstrap';
import { CardWithImage } from '~app/(new-layout)/components/card-with-image.component';
import { getGameGlobal } from '~src/components/game/get-game';
import { DurationToFormatted, FromNow } from '~src/components/util/datetime';
import { SummaryFinishedRun, UserSummary } from '~src/types/summary.types';
import styles from './stats-panel.module.scss';

export const RecentFinishedAttempts = async ({
    stats,
}: {
    stats: UserSummary;
}) => {
    return (
        <div className="w-100">
            <h5>Recent Finished Runs</h5>
            <div className="mt-2">
                {stats.finishedRuns.length === 0 && <div></div>}
                {stats.finishedRuns.length > 0 && (
                    <Row className="w-100 mx-0">
                        {stats.finishedRuns
                            .sort((a, b) => b.date - a.date)
                            .slice(0, 2)
                            .map((run) => {
                                return (
                                    <Col
                                        key={run.date}
                                        xxl={6}
                                        xl={12}
                                        className="mb-2 mx-0 px-1"
                                    >
                                        <Suspense
                                            fallback={<div>Loading...</div>}
                                        >
                                            <RecentFinishedRun
                                                key={run.date}
                                                run={run}
                                            />
                                        </Suspense>
                                    </Col>
                                );
                            })}
                    </Row>
                )}
            </div>
        </div>
    );
};

const RecentFinishedRun = async ({ run }: { run: SummaryFinishedRun }) => {
    const { game } = run;

    const gameData = await getGameGlobal(game);

    const { image, display } = gameData;

    return (
        <CardWithImage
            className="bg-tertiary"
            imageUrl={image}
            imageAlt={display}
        >
            <div className="d-flex justify-content-between">
                <div className="fs-larger fw-bold">{display}</div>
            </div>
            <div className="d-flex justify-content-between">
                <div className={styles.category}>{run.category}</div>
                <div>
                    <span className="text-muted fs-smaller d-flex justify-content-end mw-100">
                        <FromNow time={new Date(run.date)} />
                    </span>
                </div>
            </div>
            <div className="d-flex justify-content-between mt-1 w-100">
                <div className="d-flex fs-large justify-content-center font-monospace w-100 fst-italic fw-bold">
                    <DurationToFormatted
                        duration={run.time?.toString() as string}
                    />
                </div>
            </div>
        </CardWithImage>
    );
};
