"use client";
import React from "react";
import styles from "./css/DarkModeSlider.module.scss";
import { getColorMode, setColorMode } from "~src/utils/colormode";

export const DarkModeSlider = () => {
    return (
        <>
            <div className={styles.switch}>
                <input
                    type="checkbox"
                    className={styles.switch__input}
                    id="Switch"
                    onChange={(checked) => {
                        setColorMode(
                            !checked.target.checked ? "dark" : "light",
                        );
                    }}
                    checked={getColorMode() == "light"}
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
