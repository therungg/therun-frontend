import { Race } from "~app/races/races.types";
import { FromNow } from "~src/components/util/datetime";
import Link from "next/link";
import React from "react";
import { Col, Row } from "react-bootstrap";
import { GameImage } from "~src/components/image/gameimage";

export const RaceHeader = ({ race }: { race: Race }) => {
    return (
        <div className={"bg-body-secondary mb-4 game-border"}>
            <Row className={""}>
                <Col xl={2} className={"position-relative"}>
                    <GameImage
                        src={race.gameImage}
                        alt={race.displayGame}
                        height={352 / 1.5}
                        width={264 / 1.5}
                        quality={"hd"}
                    />
                </Col>
                <Col xl={10} className={"p-4"}>
                    <h1>{race.customName}</h1>
                    <h3>Status: {race.status}</h3>
                    <h3>
                        Started{" "}
                        {race.startTime ? (
                            <FromNow time={race.startTime} />
                        ) : (
                            <>Race pending</>
                        )}
                    </h3>
                    <h3>
                        {race.displayGame} - {race.displayCategory}
                    </h3>
                    {race.previousRaceId && (
                        <h3>
                            Successor of{" "}
                            <Link href={race.previousRaceId}>
                                {race.previousRaceId}
                            </Link>
                        </h3>
                    )}
                </Col>
            </Row>
        </div>
    );
};
