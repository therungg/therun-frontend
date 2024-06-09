"use client";
import { useEffect, useRef } from "react";

// eslint-disable-next-line no-undef
export function useNavigationEvent(callback: MutationCallback) {
    const observerRef = useRef<MutationObserver>();

    useEffect(() => {
        const observer = new MutationObserver(callback);
        const config = { subtree: true, childList: true };

        observer.observe(document, config);
        observerRef.current = observer;

        return () => {
            if (observerRef.current) {
                observerRef.current.disconnect();
            }
        };
    }, [callback]);
}
