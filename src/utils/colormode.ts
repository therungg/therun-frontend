export const setColorMode = (theme: string) => {
    document.documentElement.setAttribute("data-bs-theme", theme);
    localStorage.setItem("theme", theme);
};

export const getColorMode = (): string => {
    const getStoredTheme = () => localStorage.getItem("theme");
    const storedTheme = getStoredTheme();

    if (storedTheme) {
        return storedTheme;
    }

    return window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
};
