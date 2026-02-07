'use client';

import { useEffect, useRef, useState } from 'react';
import { Col, Row } from 'react-bootstrap';
import { CardWithImage } from '~app/(new-layout)/components/card-with-image.component';
import { Button } from '~src/components/Button/Button';
import { getGameGlobal } from '~src/components/game/get-game';
import { DurationToFormatted, FromNow } from '~src/components/util/datetime';
import { SummaryFinishedRun, UserSummary } from '~src/types/summary.types';
import styles from './stats-panel.module.scss';

const DEFAULT_SHOW_LIMIT = 4;

interface GameData {
    image?: string;
    display?: string;
}

export const RecentFinishedAttempts = ({
    stats,
    initialGameDataMap,
}: {
    stats: UserSummary;
    initialGameDataMap?: Record<string, unknown>;
}) => {
    const [showAll, setShowAll] = useState(false);
    const [gameDataMap, setGameDataMap] = useState<Record<string, GameData>>(
        () => (initialGameDataMap as Record<string, GameData>) ?? {},
    );
    const fetchedGamesRef = useRef<Set<string>>(
        new Set(Object.keys(initialGameDataMap ?? {})),
    );

    // Fetch game data after mount/when stats change
    useEffect(() => {
        const uniqueGames = [...new Set(stats.finishedRuns.map((r) => r.game))];
        const missingGames = uniqueGames.filter(
            (game) => !fetchedGamesRef.current.has(game),
        );

        if (missingGames.length === 0) return;

        // Mark as fetching to prevent duplicate requests
        for (const game of missingGames) {
            fetchedGamesRef.current.add(game);
        }

        Promise.all(missingGames.map((game) => getGameGlobal(game))).then(
            (results) => {
                const newData: Record<string, GameData> = {};
                missingGames.forEach((game, i) => {
                    newData[game] = results[i] as GameData;
                });
                setGameDataMap((prev) => ({ ...prev, ...newData }));
            },
        );
    }, [stats.finishedRuns]);

    const sortedRuns = stats.finishedRuns
        .sort((a, b) => b.date - a.date)
        .slice(0, showAll ? undefined : DEFAULT_SHOW_LIMIT);

    return (
        <div className="w-100">
            <h5>Finished Runs</h5>
            <div className="mt-2">
                {stats.finishedRuns.length === 0 && <div></div>}
                {stats.finishedRuns.length > 0 && (
                    <Row className="w-100 mx-0">
                        {sortedRuns.map((run) => (
                            <Col
                                key={run.date}
                                xxl={6}
                                xl={12}
                                className="mb-2 mx-0 px-1"
                            >
                                <RecentFinishedRun
                                    run={run}
                                    gameData={gameDataMap[run.game]}
                                />
                            </Col>
                        ))}
                    </Row>
                )}
            </div>
            {!showAll && stats.finishedRuns.length > DEFAULT_SHOW_LIMIT && (
                <div className="d-flex justify-content-center mt-3">
                    <Button
                        variant="primary"
                        className="px-4 py-2 rounded-3 fw-bold text-uppercase"
                        style={{ letterSpacing: '0.5px', fontSize: '0.95rem' }}
                        onClick={() => setShowAll(true)}
                    >
                        Show{' '}
                        {stats.finishedRuns.length - DEFAULT_SHOW_LIMIT - 1}{' '}
                        more runs
                    </Button>
                </div>
            )}
            {showAll && (
                <div className="d-flex justify-content-center mt-3">
                    <Button
                        variant="primary"
                        className="px-4 py-2 rounded-3 fw-bold text-uppercase"
                        style={{ letterSpacing: '0.5px', fontSize: '0.95rem' }}
                        onClick={() => setShowAll(false)}
                    >
                        Show fewer runs
                    </Button>
                </div>
            )}
        </div>
    );
};

const RecentFinishedRun = ({
    run,
    gameData,
}: {
    run: SummaryFinishedRun;
    gameData?: GameData;
}) => {
    const image = gameData?.image;
    const display = gameData?.display ?? run.game;

    return (
        <CardWithImage
            className={`bg-body-tertiary ${styles.finishedRunCard}`}
            imageUrl={image}
            imageAlt={display}
        >
            <div className={styles.finishedContent}>
                {/* Top row: Game + Time */}
                <div className={styles.topRow}>
                    <div className={styles.gameName}>{display}</div>
                    <div className={styles.timeBadge}>
                        <DurationToFormatted
                            duration={run.time?.toString() as string}
                        />
                    </div>
                </div>

                {/* Bottom row: Category + Timestamp */}
                <div className={styles.bottomRow}>
                    <div className={styles.categoryBadge}>{run.category}</div>
                    <span className={styles.timestamp}>
                        <FromNow time={new Date(run.date)} />
                    </span>
                </div>
            </div>
        </CardWithImage>
    );
};
