import { FC, PropsWithChildren } from "react";
import styles from "./styles/panel.component.module.scss";
import { FaArrowUpRightFromSquare } from "react-icons/fa6";

interface PanelInterface {
    title: string;
    subtitle: string;
    link?: {
        url: string;
        text: string;
    };
}

export const Panel: FC<PropsWithChildren<PanelInterface>> = ({
    title,
    subtitle,
    link,
    children,
}) => {
    return (
        <div className={styles.bookmarkFolder}>
            <div className={styles.tab}>
                <div className={styles.subtitle}>{subtitle}</div>
                <div className={styles.title}>{title}</div>
            </div>
            {link && (
                <a className={styles.url} href={link.url}>
                    {link.text}{" "}
                    <FaArrowUpRightFromSquare size={14} className="ms-1 mb-1" />
                </a>
            )}
            <div className={styles.content}>{children}</div>
        </div>
    );
};
