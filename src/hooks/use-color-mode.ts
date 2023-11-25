"use client";

import { useCallback, useEffect } from "react";

type ColorMode = "dark" | "light";

export default function useColorMode() {
    const getColorMode = (): ColorMode => {
        if (localStorage && localStorage.getItem("colorMode")) {
            return localStorage.getItem("colorMode") as ColorMode;
        }

        return window.matchMedia("(prefers-color-scheme: dark)").matches
            ? "dark"
            : "light";
    };

    const setColorMode = useCallback((mode: ColorMode) => {
        localStorage.setItem("colorMode", mode);
    }, []);

    const toggleColorMode = useCallback(() => {
        const mode = getColorMode();
        if (mode === "dark") {
            setColorMode("light");
        }

        if (mode === "light") {
            setColorMode("dark");
        }

        return getColorMode();
    }, []);

    useEffect(() => {
        if (typeof localStorage !== "undefined") {
            setColorMode(getColorMode());
        }
    });

    return {
        getColorMode,
        toggleColorMode,
    };
}
