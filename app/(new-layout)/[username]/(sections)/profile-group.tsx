'use client';

import { type ReactNode, useState } from 'react';
import { ChevronRight } from 'react-bootstrap-icons';
import { GameImage } from '~src/components/image/gameimage';
import styles from './profile-ui.module.scss';

/**
 * One game (or any group) in a profile panel: a row that folds its rows away.
 * Without `collapsible` the group is always open and the chevron hides.
 */
export function ProfileGroup({
    title,
    imageUrl,
    meta,
    aside,
    defaultOpen = true,
    collapsible = true,
    children,
}: {
    title: string;
    imageUrl?: string | null;
    meta?: ReactNode;
    aside?: ReactNode;
    defaultOpen?: boolean;
    collapsible?: boolean;
    children: ReactNode;
}) {
    const [open, setOpen] = useState(defaultOpen || !collapsible);
    return (
        <section
            className={styles.group}
            data-collapsed={open ? undefined : ''}
        >
            <div className={styles.groupHead}>
                <button
                    type="button"
                    className={styles.groupToggle}
                    onClick={() => setOpen((o) => !o)}
                    aria-expanded={open}
                    disabled={!collapsible}
                >
                    <ChevronRight
                        size={12}
                        aria-hidden
                        className={styles.chevron}
                    />
                    {imageUrl !== undefined ? (
                        <GameImage
                            src={imageUrl ?? ''}
                            alt=""
                            quality="small"
                            width={27}
                            height={36}
                        />
                    ) : null}
                    <span className={styles.groupTitle}>{title}</span>
                    {meta ? (
                        <span className={styles.groupMeta}>{meta}</span>
                    ) : null}
                </button>
                {aside ? (
                    <span className={styles.groupAside}>{aside}</span>
                ) : null}
            </div>
            {open ? children : null}
        </section>
    );
}
