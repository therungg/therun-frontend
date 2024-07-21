"use client";
import React from "react";
import styles from "./css/DarkModeSlider.module.scss";
import { useTheme } from "next-themes";
import { setCookie } from "cookies-next";

export const DarkModeSlider = () => {
    const { setTheme, theme } = useTheme();
    const handleInputToggle = React.useCallback<
        React.ChangeEventHandler<HTMLInputElement>
    >(
        (event) => {
            const theme = !event.target.checked ? "dark" : "light";
            setCookie("theme", theme);
            setTheme(theme);
        },
        [setTheme],
    );
    const isChecked = React.useMemo(() => theme === "light", [theme]);
    return (
        <div className={styles.switch}>
            <input
                type="checkbox"
                className={styles.switch__input}
                id="Switch"
                onChange={handleInputToggle}
                checked={isChecked}
            />
            <label className={styles.switch__label} htmlFor="Switch">
                <span className={styles.switch__indicator}></span>
                <span className={styles.switch__decoration}></span>
            </label>
        </div>
    );
};

export default DarkModeSlider;
