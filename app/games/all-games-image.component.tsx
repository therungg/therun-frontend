"use client";
import React from "react";
import Image from "next/image";
import styles from "~src/components/css/Games.module.scss";
import { Game } from "~app/games/games.types";
import { useTheme } from "next-themes";
import { getGameUrl } from "./utilities";
import { GameImage, QUALITIES } from "~src/components/image/gameimage";

interface AllGamesImageProps {
    game: Game;
}

export const AllGamesImage: React.FunctionComponent<AllGamesImageProps> = ({
    game,
}) => {
    const { theme } = useTheme();
    const gameUrl = getGameUrl(game);
    return (
        <div className={styles.image}>
            <a href={`/games/${gameUrl}`}>
                {game.image && game.image != "noimage" && (
                    <GameImage
                        alt={game.display}
                        src={game.image}
                        quality={QUALITIES.medium}
                        width={106}
                        height={142}
                    />
                )}
                {(!game.image || game.image == "noimage") && (
                    <div className={styles.backupImage}>
                        <Image
                            alt={"Game Image"}
                            src={`/logo_${theme}_theme_no_text_transparent.png`}
                            width={106}
                            height={142}
                        />
                    </div>
                )}
            </a>
        </div>
    );
};
