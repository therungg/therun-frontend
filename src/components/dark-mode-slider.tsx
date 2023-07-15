"use client";
import React from "react";
import styles from "./css/DarkModeSlider.module.scss";

export const DarkModeSlider = () => {
    // I read the theme from local storage and set it onto body data attribute earlier in my code, so
    const [theme, setTheme] = React.useState(
        document.documentElement.dataset.bsTheme || "light"
    );

    // sync the changed theme value to local storage and body data attribute
    React.useEffect(() => {
        if (theme && theme !== document.documentElement.dataset.bsTheme) {
            window.localStorage.setItem("theme", theme);
            document.documentElement.dataset.bsTheme = theme;
        }
    }, [theme]);

    return (
        <>
            <div className={styles.switch}>
                <input
                    type="checkbox"
                    className={styles.switch__input}
                    id="Switch"
                    onChange={(checked) => {
                        setTheme(!checked.target.checked ? "dark" : "light");
                    }}
                    checked={theme == "light"}
                />
                <label className={styles.switch__label} htmlFor="Switch">
                    <span className={styles.switch__indicator}></span>
                    <span className={styles.switch__decoration}></span>
                </label>
            </div>
        </>
    );
};

export default DarkModeSlider;
