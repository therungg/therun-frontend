"use client";

import styles from "~src/components/css/Home.module.scss";
import Link from "next/link";
import { Button, Col, Row } from "react-bootstrap";
import { PatreonBunnySvgWithoutLink } from "~app/patron/patreon-info";
import { Run } from "~src/common/types";
import { Game } from "~app/games/games.types";
import { DataHolder } from "~src/components/frontpage/data-holder";
import { SkeletonPersonalBests } from "~src/components/skeleton/index/skeleton-personal-bests";
import { PopularGames } from "~src/components/game/popular-games";
import { SkeletonPopularGames } from "~src/components/skeleton/index/skeleton-popular-games";
import React from "react";

export default function Homepage({
    runs,
    gamestats,
}: {
    runs: Run[];
    gamestats: Game[];
}) {
    return (
        <div>
            <div className={styles.homeContainer}>
                <h1 className={styles.title}>The Run</h1>
                <div className={styles.subtitle}>
                    Statistics for speedrunners
                </div>
                <div className={styles.learnMoreButtonContainer}>
                    <Link href={"/patron"}>
                        <Button
                            variant={"primary"}
                            className={styles.supportMeButton}
                        >
                            Support <PatreonBunnySvgWithoutLink />
                        </Button>
                    </Link>
                    <Link href={"/about"}>
                        <Button
                            variant={"primary"}
                            className={styles.learnMoreButton}
                        >
                            Learn more
                        </Button>
                    </Link>
                </div>
            </div>

            <DataSection runs={runs} gamestats={gamestats} />
        </div>
    );
}

const DataSection = ({
    runs,
    gamestats,
}: {
    runs: Run[];
    gamestats: Game[];
}) => {
    return (
        <div>
            <Row className={styles.dataTitle}>
                <Col xl={6} lg={12} className={styles.dataContainer}>
                    <h2>Recent Personal Bests</h2>
                    {runs && <DataHolder runs={runs} />}
                    {!runs && <SkeletonPersonalBests />}
                </Col>
                <Col
                    xl={6}
                    lg={12}
                    className={`${styles.dataContainer} ${styles.dataContainerBottom}`}
                >
                    <h2>Popular Games</h2>
                    {gamestats && <PopularGames gamestats={gamestats} />}
                    {!gamestats && <SkeletonPopularGames />}
                </Col>
            </Row>
        </div>
    );
};
