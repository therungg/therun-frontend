"use client";
import React from "react";
import { AppProgressBar as ProgressBar } from "next-nprogress-bar";
import { Helmet } from "react-helmet-async";
import { useTheme } from "next-themes";
import { useProgressBar } from "~src/components/n-progress.component";

export const Content: React.FunctionComponent<React.PropsWithChildren> = ({
    children,
}) => {
    const { systemTheme } = useTheme();
    useProgressBar();
    const prefix = systemTheme === "dark" ? "" : "/lightmode";

    return (
        <>
            <Helmet>
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
            </Helmet>
            <ProgressBar
                options={{ showSpinner: false }}
                shallowRouting
                style={`#nprogress{pointer-events:none}#nprogress .bar{background:var(--bs-secondary);position:fixed;z-index:100;top:0;left:0;width:100%;height:2px}`}
            />
            {children}
        </>
    );
};
