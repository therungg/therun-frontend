import { FC, HTMLAttributes, PropsWithChildren } from 'react';
import { IconType } from 'react-icons';
import { FaArrowUpRightFromSquare } from 'react-icons/fa6';
import styles from './styles/panel.component.module.scss';

interface PanelInterface extends HTMLAttributes<HTMLDivElement> {
    title: string;
    subtitle: string;
    mobileTitle?: string;
    mobileSubtitle?: string;
    icon?: IconType;
    panelId?: string;
    link?: {
        url: string;
        text: string;
    };
}

export const Panel: FC<PropsWithChildren<PanelInterface>> = ({
    title,
    subtitle,
    mobileTitle,
    mobileSubtitle,
    icon: Icon,
    panelId,
    link,
    children,
    ...props
}) => {
    return (
        <div id={panelId} className={styles.bookmarkFolder}>
            <div className={styles.tab}>
                {mobileSubtitle ? (
                    <>
                        <div
                            className={`${styles.subtitle} ${styles.desktopOnly}`}
                        >
                            {subtitle}
                        </div>
                        <div
                            className={`${styles.subtitle} ${styles.mobileOnly}`}
                        >
                            {mobileSubtitle}
                        </div>
                    </>
                ) : (
                    <div className={styles.subtitle}>{subtitle}</div>
                )}
                <h2 className={styles.title}>
                    {Icon && (
                        <Icon
                            size={18}
                            className={styles.titleIcon}
                            aria-hidden="true"
                        />
                    )}
                    {mobileTitle ? (
                        <>
                            <span className={styles.desktopOnly}>{title}</span>
                            <span className={styles.mobileOnly}>
                                {mobileTitle}
                            </span>
                        </>
                    ) : (
                        title
                    )}
                </h2>
            </div>
            {link && (
                <a className={styles.url} href={link.url}>
                    {link.text}{' '}
                    <FaArrowUpRightFromSquare
                        size={14}
                        className="ms-1 mb-1"
                        aria-hidden="true"
                    />
                </a>
            )}
            <div {...props}>{children}</div>
        </div>
    );
};
