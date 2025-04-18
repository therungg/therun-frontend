import { FC, HTMLAttributes, PropsWithChildren } from "react";
import styles from "./styles/panel.component.module.scss";
import { FaArrowUpRightFromSquare } from "react-icons/fa6";
import { IconType } from "react-icons";

interface PanelInterface extends HTMLAttributes<HTMLDivElement> {
    title: string;
    subtitle: string;
    icon?: IconType;
    link?: {
        url: string;
        text: string;
    };
}

export const Panel: FC<PropsWithChildren<PanelInterface>> = ({
    title,
    subtitle,
    icon,
    link,
    children,
    ...props
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
            <div {...props}>{children}</div>
        </div>
    );
};
