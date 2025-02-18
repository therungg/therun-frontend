"use client";

import { Run } from "~src/common/types";
import { DurationToFormatted, FromNow } from "~src/components/util/datetime";
import { UserGameCategoryLink, UserLink } from "~src/components/links/links";
import { GameImage } from "~src/components/image/gameimage";
import Image from "next/image";

/* eslint-disable @typescript-eslint/no-explicit-any */
export const RunPreview = ({
    run,
    gameGlobalData,
    userGlobalData,
}: {
    run: Run;
    gameGlobalData: any;
    userGlobalData: any;
}) => {
    const duration = run.hasGameTime
        ? (run.gameTimeData?.personalBest as string)
        : run.personalBest;

    const gameTimeLabel = run.hasGameTime ? " (IGT)" : "";

    const hasImage = gameGlobalData.image && gameGlobalData.image !== "noimage";

    return (
        <div className="card mb-3 shadow-sm">
            <div className="card-body">
                <div className="d-flex">
                    {/* Game Image */}
                    <div className="me-3 d-flex align-items-center">
                        <a
                            href={`/games/${gameGlobalData.display}`}
                            className="d-flex align-items-center"
                        >
                            <GameImage
                                alt={
                                    hasImage
                                        ? gameGlobalData.display
                                        : "The Run logo displayed due to missing game image"
                                }
                                src={hasImage ? gameGlobalData.image : ""}
                                quality="small"
                                height={84}
                                width={63}
                                className="rounded"
                            />
                        </a>
                    </div>

                    {/* Run Information */}
                    <div className="d-flex flex-column flex-grow-1">
                        {/* Main run information */}
                        <div className="mb-2">
                            <h5 className="card-title mb-0 d-flex align-items-center">
                                <UserGameCategoryLink
                                    url={run.url}
                                    username={run.user}
                                    game={run.game}
                                    category={run.run}
                                    className="text-decoration-none"
                                />
                            </h5>
                        </div>

                        {/* Time and game time indicator */}
                        <div className="d-flex align-items-center mb-2">
                            <span className="badge bg-primary me-2">
                                <DurationToFormatted duration={duration} />
                                {gameTimeLabel}
                            </span>
                        </div>

                        {/* Runner and timestamp information */}
                        <div className="text-muted small text-truncate">
                            <div className="d-flex align-items-center">
                                <div className="d-flex align-items-center">
                                    <i className="bi bi-clock me-1"></i>
                                    <span
                                        style={{
                                            display: "inline-block",
                                            verticalAlign: "baseline",
                                        }}
                                    >
                                        <FromNow time={run.personalBestTime} />
                                    </span>
                                </div>
                                <span className="mx-2">•</span>
                                {userGlobalData.picture ? (
                                    <Image
                                        src={userGlobalData.picture}
                                        alt={`${run.user}'s profile photo`}
                                        height={20}
                                        width={20}
                                        className="rounded-circle me-1"
                                    />
                                ) : (
                                    <i className="bi bi-person me-1"></i>
                                )}
                                <UserLink
                                    username={run.user}
                                    className="text-decoration-none"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
