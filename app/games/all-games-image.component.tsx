"use client";
import React from "react";
import Image from "next/image";
import styles from "~src/components/css/Games.module.scss";
import { Game } from "~app/games/games.types";
import { useTheme } from "next-themes";
import { getGameUrl } from "./utilities";
import { GetGameImageSrc } from "~src/lib/get-game-image-src";

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
                    <Image
                        alt={game.display}
                        src={GetGameImageSrc({ imageSrc: game.image })}
                        loading={"lazy"}
                        height={142}
                        width={106}
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
