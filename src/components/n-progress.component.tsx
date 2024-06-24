"use client";
import React from "react";
import NProgress from "nprogress";

export function useProgressBar() {
    React.useEffect(() => {
        NProgress.configure({ showSpinner: false });

        const handleAnchorClick = (event: MouseEvent) => {
            const targetUrl = (
                event.currentTarget as HTMLAnchorElement
            ).href.replace("#", "");
            const currentUrl = location.href.replace("#", "");

            if (targetUrl !== currentUrl) {
                NProgress.start();
            }
        };

        const handleMutation: MutationCallback = () => {
            const anchorElements = document.querySelectorAll("a");
            anchorElements.forEach((anchor) =>
                anchor.addEventListener("click", handleAnchorClick),
            );
        };

        const mutationObserver = new MutationObserver(handleMutation);
        mutationObserver.observe(document, { childList: true, subtree: true });

        window.history.pushState = new Proxy(window.history.pushState, {
            apply: (
                target,
                thisArg,
                argArray: Parameters<History["pushState"]>,
            ) => {
                NProgress.done();
                return target.apply(thisArg, argArray);
            },
        });
    });
}
