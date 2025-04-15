"use client";
import React from "react";
import { Title } from "~src/components/title";
import { GameContext } from "./game.context";
import { StatsData } from "./game.types";
import { GameImage } from "~src/components/image/gameimage";
import { Row } from "react-bootstrap";

interface GameHeaderProps {
    data: Required<StatsData>;
}

export const GameHeader: React.FunctionComponent<GameHeaderProps> = ({
    data,
}) => {
    const { global } = data;
    const { category, categories, setCategory } = React.useContext(GameContext);
    return (
        <Row>
            <div className="col-auto">
                {global.image && global.image != "noimage" && (
                    <GameImage
                        alt={global.display}
                        src={global.image}
                        quality="small"
                        height={80}
                        width={60}
                    />
                )}
            </div>
            <div className="col-auto align-self-center ps-1">
                <Title>
                    {category === "*" ? (
                        data.data.game.display
                    ) : (
                        <a
                            href="#"
                            onClick={() => {
                                setCategory("*");
                            }}
                        >
                            {data.data.game.display}
                        </a>
                    )}
                    {category !== "*" &&
                        ` - ${categories.find(
                            (cat) => cat.categoryName === category,
                        )?.categoryNameDisplay}`}
                </Title>
            </div>
        </Row>
    );
};
