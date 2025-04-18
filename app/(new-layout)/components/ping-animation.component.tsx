import clsx from "clsx";
import styles from "./styles/ping-animation.component.module.scss";

export const PingAnimation = () => {
    return (
        <span className={clsx(styles["ping-dot-container"])}>
            <span className={styles["ping-dot-ping"]}></span>
            <span className={styles["ping-dot"]}></span>
        </span>
    );
};
