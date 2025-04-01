"use client";
import React, { useEffect } from "react";
import { AppProgressBar as ProgressBar } from "next-nprogress-bar";
import { Container } from "react-bootstrap";
import { useTheme } from "next-themes";
import { useProgressBar } from "~src/components/n-progress.component";
import { Bounce, toast, ToastContainer } from "react-toastify";
import { useSearchParams } from "next/navigation";

export const Content: React.FunctionComponent<React.PropsWithChildren> = ({
    children,
}) => {
    const { systemTheme } = useTheme();
    useProgressBar();
    const query = useSearchParams();

    const prefix = systemTheme === "dark" ? "" : "/lightmode";

    useEffect(() => {
        if (query.has("toast")) {
            const type = query.has("toastType")
                ? (query.get("toastType") as "success" | "error")
                : "success";

            console.log(query.get("toast"));

            toast[type](query.get("toast"));
        }
    }, [query.get("toast")]);

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

            <ToastContainer
                position="top-center"
                autoClose={5000}
                hideProgressBar={false}
                newestOnTop={false}
                closeOnClick
                draggable
                pauseOnHover
                transition={Bounce}
                theme={systemTheme || "dark"}
            />
            {children}
        </Container>
    );
};
