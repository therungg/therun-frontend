"use client";
import React from "react";
import Image from "next/image";
import { Game } from "~app/games/games.types";
import { useTheme } from "next-themes";
import { getGameUrl } from "./utilities";
import { GameImage } from "~src/components/image/gameimage";

interface AllGamesImageProps {
    game: Game;
}

export const AllGamesImage: React.FunctionComponent<AllGamesImageProps> = ({
    game,
}) => {
    const { theme } = useTheme();
    const gameUrl = getGameUrl(game);
    return (
        <div className="float-start d-flex d-none d-sm-block align-items-center me-2">
            <a href={`/games/${gameUrl}`}>
                {game.image && game.image != "noimage" && (
                    <GameImage
                        className="w-auto"
                        alt={game.display}
                        src={game.image}
                        quality="medium"
                        width={106}
                        height={152}
                    />
                )}
                {(!game.image || game.image == "noimage") && (
                    <div className="d-flex align-items-center">
                        <Image
                            unoptimized
                            alt="Game Image"
                            src={`/logo_${theme}_theme_no_text_transparent.png`}
                            width={106}
                            height={152}
                        />
                    </div>
                )}
            </a>
        </div>
    );
};
