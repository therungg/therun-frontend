"use client";

import { Game } from "~app/games/games.types";
import { GameLink, UserLink } from "~src/components/links/links";
import { DurationToFormatted } from "~src/components/util/datetime";
import React from "react";
import { GameImage } from "~src/components/image/gameimage";

interface PopularGamesProps {
    gamestats: Game[];
}

export const PopularGames: React.FC<PopularGamesProps> = ({ gamestats }) => {
    return (
        <div className={"tw-grid tw-grid-cols-1 lg:tw-grid-cols-2 tw-gap-3"}>
            {gamestats.map((game) => (
                <div
                    key={game.game}
                    className={
                        "tw-rounded-full tw-flex tw-flex-row tw-gap-4 tw-bg-gray-50 tw-py-2 tw-px-2 tw-items-center"
                    }
                >
                    <div
                        className={
                            "tw-overflow-hidden tw-relative tw-w-20 tw-h-20 tw-object-fit-contain tw-min-w-max tw-flex tw-flex-col tw-items-center tw-justify-center"
                        }
                    >
                        {game.image && game.image !== "noimage" && (
                            <a href={`/games/${game.display}`}>
                                <GameImage
                                    alt={game.display}
                                    src={game.image}
                                    quality={"small"}
                                    height={80}
                                    width={80}
                                    className={
                                        "tw-rounded-full tw-aspect-square"
                                    }
                                />
                            </a>
                        )}
                    </div>
                    <div
                        className={
                            "tw-flex tw-flex-col tw-gap-2 tw-justify-between"
                        }
                    >
                        <div className="">
                            <GameLink game={game.display}>
                                <span className={"tw-font-bold"}>
                                    {game.display}
                                </span>
                            </GameLink>
                        </div>
                        <div>
                            Best run by{" "}
                            <span className={"tw-font-bold"}>
                                <UserLink
                                    username={
                                        (game.categories[0].gameTime &&
                                            game.categories[0]
                                                .bestGameTimeUser) ||
                                        game.categories[0].bestTimeUser
                                    }
                                />
                            </span>{" "}
                            in the category{" "}
                            <span className={"tw-font-semibold"}>
                                {game.categories[0].display}
                            </span>{" "}
                            in{" "}
                            {game.categories[0].gameTime ? (
                                <DurationToFormatted
                                    duration={
                                        game.categories[0].gameTimePb as string
                                    }
                                />
                            ) : (
                                <DurationToFormatted
                                    duration={game.categories[0].bestTime}
                                />
                            )}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};
