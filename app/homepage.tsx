"use client";

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
            <div className="px-4 pt-5 mt-3 mb-5 text-center">
                <h1 className="display-1 fw-medium">The Run</h1>
                <h2 className="display-6 mb-5">Statistics for speedrunners</h2>
                <div className="col-lg-6 mx-auto">
                    <p className="lead mb-4"></p>
                    <div className="d-grid gap-2 d-sm-flex justify-content-sm-center mb-5">
                        <Link href={"/patron"}>
                            <Button
                                variant={"secondary"}
                                className="btn-lg me-sm-3 px-3 w-160p h-3r fw-medium"
                            >
                                Support <PatreonBunnySvgWithoutLink />
                            </Button>
                        </Link>
                        <Link href={"/about"}>
                            <Button
                                variant={"primary"}
                                className="btn-lg px-3 w-160p h-3r fw-medium"
                            >
                                Learn more
                            </Button>
                        </Link>
                    </div>
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
            <Row className="text-center">
                <Col xl={6} lg={12} className="mt-4">
                    <h2>Recent Personal Bests</h2>
                    {runs && <DataHolder runs={runs} />}
                    {!runs && <SkeletonPersonalBests />}
                </Col>
                <Col xl={6} lg={12} className="mt-4">
                    <h2>Popular Games</h2>
                    {gamestats && <PopularGames gamestats={gamestats} />}
                    {!gamestats && <SkeletonPopularGames />}
                </Col>
            </Row>
        </div>
    );
};
