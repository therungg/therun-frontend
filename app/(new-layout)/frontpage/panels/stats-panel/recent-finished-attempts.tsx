"use client"

import { Suspense, use, useState } from 'react';
import { Col, Row } from 'react-bootstrap';
import { CardWithImage } from '~app/(new-layout)/components/card-with-image.component';
import { getGameGlobal } from '~src/components/game/get-game';
import { DurationToFormatted, FromNow } from '~src/components/util/datetime';
import { SummaryFinishedRun, UserSummary } from '~src/types/summary.types';
import styles from './stats-panel.module.scss';
import { Button } from '~src/components/Button/Button';

const DEFAULT_SHOW_LIMIT = 4;

export const RecentFinishedAttempts = ({
    stats,
}: {
    stats: UserSummary;
}) => {
    const [showAll, setShowAll] = useState(false);

    console.log(stats.finishedRuns)
    return (
        <div className="w-100">
            <h5>Finished Runs</h5>
            <div className="mt-2">
                {stats.finishedRuns.length === 0 && <div></div>}
                {stats.finishedRuns.length > 0 && (
                    <Row className="w-100 mx-0">
                        {stats.finishedRuns
                            .sort((a, b) => b.date - a.date)
                            .slice(0, showAll ? -1 : DEFAULT_SHOW_LIMIT)
                            .map((run) => {
                                const gameData = getGameGlobal(run.game);
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
                                                gameData={gameData}
                                            />
                                        </Suspense>
                                    </Col>
                                );
                            })}
                    </Row>
                )}
            </div>
            {!showAll && stats.finishedRuns.length > DEFAULT_SHOW_LIMIT && (
                <div className="d-flex justify-content-center mt-2">
                    <Button
                        onClick={() => setShowAll(true)}
                    >
                        Show {stats.finishedRuns.length - DEFAULT_SHOW_LIMIT - 1} more runs
                    </Button>
                </div>
            )}
            {showAll && (
                <div className="d-flex justify-content-center mt-2">
                    <Button
                        onClick={() => setShowAll(false)}
                    >
                        Show fewer runs
                    </Button>
                </div>
            )}
        </div>
    );
};

const RecentFinishedRun = ({ run, gameData }: { run: SummaryFinishedRun, gameData: Promise<any> }) => {
    const gameDataUsed = use(gameData);

    const { image, display } = gameDataUsed;

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
