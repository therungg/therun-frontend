"use client";
import React from "react";
import { Button } from "react-bootstrap";
import homeStyles from "~src/components/css/Home.module.scss";
import { AllGamesContext } from "./all-games.context";

export const LoadMoreButton = () => {
    const { count, setCount } = React.useContext(AllGamesContext);
    return (
        <div style={{ display: "flex", justifyContent: "center" }}>
            <Button
                variant={"primary"}
                className={homeStyles.learnMoreButton}
                style={{ width: "40rem", marginTop: "1rem" }}
                onClick={() => {
                    setCount(count + 10);
                }}
            >
                Load more...
            </Button>
        </div>
    );
};
