"use client";
import React from "react";
import styles from "./css/DarkModeSlider.module.scss";
import { useTheme } from "next-themes";

const getCheckedTheme = (isChecked: boolean) => (isChecked ? "light" : "dark");

export const DarkModeSlider = () => {
    const { theme, setTheme } = useTheme();
    const [checked, setChecked] = React.useState(theme === "light");
    return (
        <>
            <div className={styles.switch}>
                <input
                    type="checkbox"
                    className={styles.switch__input}
                    id="Switch"
                    onChange={(checked) => {
                        setChecked(checked.target.checked);
                        setTheme(getCheckedTheme(checked.target.checked));
                    }}
                    checked={checked}
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
