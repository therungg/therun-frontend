"use client";
import React from "react";
import { AppProgressBar as ProgressBar } from "next-nprogress-bar";
import { Container } from "react-bootstrap";
import { useTheme } from "next-themes";
import { useProgressBar } from "~src/components/n-progress.component";

export const Content: React.FunctionComponent<React.PropsWithChildren> = ({
    children,
}) => {
    const { theme } = useTheme();
    useProgressBar();
    const prefix = theme === "dark" ? "" : "/lightmode";

    return (
        <Container className="my-4 pb-5 main-container">
            <link rel="icon" href={`${prefix}/favicon.ico`} />
            <link
                rel="apple-touch-icon"
                sizes="180x180"
                href={`${prefix}/apple-touch-icon.png`}
            />
            <link
                rel="icon"
                type="image/png"
                sizes="32x32"
                href={`${prefix}/favicon-32x32.png`}
            />
            <link
                rel="icon"
                type="image/png"
                sizes="16x16"
                href={`${prefix}/favicon-16x16.png`}
            />
            <link
                rel="mask-icon"
                href="/safari-pinned-tab.svg"
                color="#5bbad5"
            />
            <ProgressBar
                height="4px"
                color="#fffd00"
                options={{ showSpinner: false }}
                shallowRouting
            />
            {children}
        </Container>
    );
};
