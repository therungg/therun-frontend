"use client";
import { Button, Col, Row } from "react-bootstrap";
import useSWR from "swr";
import React from "react";
import Link from "next/link";
import styles from "../src/components/css/Home.module.scss";
import { PopularGames } from "../src/components/game/popular-games";
import { DataHolder } from "../src/components/frontpage/data-holder";
import { SkeletonPersonalBests } from "../src/components/skeleton/index/skeleton-personal-bests";
import { SkeletonPopularGames } from "../src/components/skeleton/index/skeleton-popular-games";
import { PatreonBunnySvgWithoutLink } from "../src/pages/patron";
import { fetcher } from "../src/utils/fetcher";

export default function Page() {
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

            <DataSection />
        </div>
    );
}

const DataSection = () => {
    const {
        data = { runs: null, gamestats: null },
        error,
        isLoading,
    } = useSWR("/api/frontpagedata", fetcher);

    if (error) return <div>Whoops, something went wrong...</div>;

    const { runs = [], gamestats = [] } = data;

    return (
        <div>
            <Row className={styles.dataTitle}>
                <Col xl={6} lg={12} className={styles.dataContainer}>
                    <h2>Recent Personal Bests</h2>
                    {data && <DataHolder runs={runs} />}
                    {!data.runs && isLoading && <SkeletonPersonalBests />}
                </Col>
                <Col
                    xl={6}
                    lg={12}
                    className={`${styles.dataContainer} ${styles.dataContainerBottom}`}
                >
                    <h2>Popular Games</h2>
                    {data && <PopularGames gamestats={gamestats} />}
                    {!data.gamestats && isLoading && <SkeletonPopularGames />}
                </Col>
            </Row>
        </div>
    );
};
