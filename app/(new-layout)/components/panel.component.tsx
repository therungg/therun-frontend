import { FC, HTMLAttributes, PropsWithChildren } from 'react';
import { IconType } from 'react-icons';
import { FaArrowUpRightFromSquare } from 'react-icons/fa6';
import styles from './styles/panel.component.module.scss';

interface PanelInterface extends HTMLAttributes<HTMLDivElement> {
    title: string;
    subtitle: string;
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
    icon,
    panelId,
    link,
    children,
    ...props
}) => {
    return (
        <div id={panelId} className={styles.bookmarkFolder}>
            <div className={styles.tab}>
                <div className={styles.subtitle}>{subtitle}</div>
                <h2 className={styles.title}>{title}</h2>
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
