"use client";
import { Button, Col, Row } from "react-bootstrap";
import useSWR from "swr";
import React from "react";
import Link from "next/link";
import styles from "../src/components/css/Home.module.scss";
import { PopularGames } from "~src/components/game/popular-games";
import { DataHolder } from "~src/components/frontpage/data-holder";
import { SkeletonPersonalBests } from "~src/components/skeleton/index/skeleton-personal-bests";
import { SkeletonPopularGames } from "~src/components/skeleton/index/skeleton-popular-games";
import { PatreonBunnySvgWithoutLink } from "~app/patron/patreon-info";
import { fetcher } from "~src/utils/fetcher";

export const revalidate = 60;

export default function Page() {
    return (
        <div>
            <div className="px-4 pt-5 my-5 text-center">
                <h1 className="display-1 fw-medium text-body-emphasis">
                    The Run
                </h1>
                <h2 className="display-6 mb-5">Statistics for speedrunners</h2>
                <div className="col-lg-6 mx-auto">
                    <p className="lead mb-4"></p>
                    <div className="d-grid gap-2 d-sm-flex justify-content-sm-center mb-5">
                        <Link href={"/patron"}>
                            <Button
                                variant={"outline-secondary"}
                                className="btn-lg px-4 px-4 me-sm-3"
                            >
                                Support <PatreonBunnySvgWithoutLink />
                            </Button>
                        </Link>
                        <Link href={"/about"}>
                            <Button
                                variant={"outline-primary"}
                                className="btn-lg px-4"
                            >
                                Learn more
                            </Button>
                        </Link>
                    </div>
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
                    {data.runs && <DataHolder runs={runs} />}
                    {!data.runs && isLoading && <SkeletonPersonalBests />}
                </Col>
                <Col
                    xl={6}
                    lg={12}
                    className={`${styles.dataContainer} ${styles.dataContainerBottom}`}
                >
                    <h2>Popular Games</h2>
                    {data.gamestats && <PopularGames gamestats={gamestats} />}
                    {!data.gamestats && isLoading && <SkeletonPopularGames />}
                </Col>
            </Row>
        </div>
    );
};
