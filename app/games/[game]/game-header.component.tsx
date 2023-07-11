"use client";
import React from "react";
import styles from "~src/components/css/Game.module.scss";
import { Title } from "~src/components/title";
import { GameContext } from "./game.context";
import { StatsData } from "./game.types";
import { LazyLoadImage } from "react-lazy-load-image-component";

interface GameHeaderProps {
    data: Required<StatsData>;
}

export const GameHeader: React.FunctionComponent<GameHeaderProps> = ({
    data,
}) => {
    const { global } = data;
    const { category, categories, setCategory } = React.useContext(GameContext);
    return (
        <>
            <div className={styles.gameImage}>
                {global.image && global.image != "noimage" && (
                    <LazyLoadImage
                        alt={global.display}
                        src={global.image}
                        loading={"lazy"}
                        height={80}
                        width={60}
                    />
                )}
            </div>
            <div className={styles.gameTitleContainer}>
                <Title>
                    {category === "*" ? (
                        data.data.game.display
                    ) : (
                        <a
                            href={"#"}
                            onClick={() => {
                                setCategory("*");
                            }}
                        >
                            {data.data.game.display}
                        </a>
                    )}
                    {category !== "*" &&
                        ` - ${
                            categories.find(
                                (cat) => cat.categoryName === category
                            )?.categoryNameDisplay
                        }`}
                </Title>
            </div>
        </>
    );
};
