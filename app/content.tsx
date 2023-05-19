"use client";
import React from "react";
import { Container } from "react-bootstrap";

export const Content: React.FunctionComponent<React.PropsWithChildren> = ({
    children,
}) => {
    return <Container className={"mt-4 main-container"}>{children}</Container>;
};
