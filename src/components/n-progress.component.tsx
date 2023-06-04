"use client";
import React from "react";
import NProgress from "nprogress";

type PushStateInput = [
    data: any,
    unused: string,
    url?: string | URL | null | undefined
];

export function useProgressBar() {
    React.useEffect(() => {
        NProgress.configure({ showSpinner: false });

        const handleAnchorClick = (event: MouseEvent) => {
            const targetUrl = (event.currentTarget as HTMLAnchorElement).href;
            const currentUrl = location.href;
            if (targetUrl !== currentUrl) {
                NProgress.start();
            }
        };

        // eslint-disable-next-line no-undef
        const handleMutation: MutationCallback = () => {
            const anchorElements = document.querySelectorAll("a");
            anchorElements.forEach((anchor) =>
                anchor.addEventListener("click", handleAnchorClick)
            );
        };

        const mutationObserver = new MutationObserver(handleMutation);
        mutationObserver.observe(document, { childList: true, subtree: true });

        window.history.pushState = new Proxy(window.history.pushState, {
            apply: (target, thisArg, argArray: PushStateInput) => {
                NProgress.done();
                return target.apply(thisArg, argArray);
            },
        });
    });
}
