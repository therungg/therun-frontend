import type { ReactNode } from 'react';
import styles from './profile-ui.module.scss';

/** A titled part of a section page. */
export function ProfileBlock({
    title,
    note,
    actions,
    children,
}: {
    title: string;
    note?: ReactNode;
    actions?: ReactNode;
    children: ReactNode;
}) {
    return (
        <section className={styles.block}>
            <div className={styles.blockHead}>
                <div className={styles.blockHeadText}>
                    <h2 className={styles.blockTitle}>{title}</h2>
                    {note ? (
                        <span className={styles.blockNote}>{note}</span>
                    ) : null}
                </div>
                {actions}
            </div>
            {children}
        </section>
    );
}
