"use client";

import Link from "next/link";
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
        <main>
            <div className="tw-container tw-mx-auto tw-flex tw-flex-col flex-grow tw-items-center tw-justify-center tw-gap-8">
                <h1 className="tw-text-5xl tw-font-bold tw-text-therun-green">
                    The Run
                </h1>
                <h2 className="tw-text-3xl tw-text-gray-600">
                    Statistics for speedrunners
                </h2>
                <div className="">
                    <div className="tw-flex tw-flex-row tw-gap-8">
                        <Link
                            href={"/patron"}
                            className="tw-group hover:tw-bg-therun-bunny tw-justify-center tw-w-36 tw-flex tw-flex-row tw-gap-2 tw-bg-gray-300 tw-border-therun-bunny tw-border tw-px-5 tw-py-3 tw-rounded-2xl tw-text-grey-800 tw-items-center hover:tw-text-white tw-font-bold"
                        >
                            Support{" "}
                            <PatreonBunnySvgWithoutLink
                                className={
                                    "tw-text-therun-bunny group-hover:tw-text-white"
                                }
                            />
                        </Link>
                        <Link
                            href={"/about"}
                            className={
                                "hover:tw-bg-therun-green hover:tw-text-white tw-text-center tw-w-36 tw-px-5 tw-py-3 tw-bg-gray-300 tw-border tw-border-therun-green tw-rounded-2xl tw-font-bold"
                            }
                        >
                            Learn more
                        </Link>
                    </div>
                </div>
            </div>

            <DataSection runs={runs} gamestats={gamestats} />
        </main>
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
        <div
            className={
                "tw-container tw-mx-auto tw-flex tw-flex-col tw-gap-8 tw-px-3 xl:tw-flex-row"
            }
        >
            <div
                className={
                    "tw-flex tw-flex-col tw-gap-3 tw-border-b-2 tw-border-therun-green tw-py-8 lg:tw-flex-grow"
                }
            >
                <h2 className="tw-font-bold tw-text-xl">
                    Recent Personal Bests
                </h2>
                {runs && <DataHolder runs={runs} />}

                {!runs && <SkeletonPersonalBests />}
            </div>

            <div
                className={
                    "tw-flex tw-flex-col tw-gap-3 tw-border-b-2 tw-border-therun-green tw-py-8 xl:tw-w-1/2"
                }
            >
                <h2 className="tw-font-bold tw-text-xl">Popular Games</h2>
                {gamestats && <PopularGames gamestats={gamestats} />}
                {!gamestats && <SkeletonPopularGames />}
            </div>
        </div>
    );
};
