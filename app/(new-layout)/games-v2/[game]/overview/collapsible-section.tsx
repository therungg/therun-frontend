'use client';

import { type ReactNode, useState } from 'react';
import { CaretDownFill, CaretRightFill } from 'react-bootstrap-icons';
import styles from './overview.module.scss';

interface Props {
    name: string;
    count: number;
    children: ReactNode;
}

/**
 * A hidden-by-default group's cards, behind a disclosure. Mirrors the board
 * band's behaviour (header/category-pills.tsx) so a group collapsed in one
 * place isn't open in the other. Open state is per-visit on purpose — the
 * moderator's flag is about the default a reader lands on.
 *
 * Its own component because overview-page.tsx is a server component.
 */
export function CollapsibleSection({ name, count, children }: Props) {
    const [open, setOpen] = useState(false);

    return (
        <section className={styles.section}>
            <h2 className={styles.sectionTitle}>
                <button
                    type="button"
                    className={styles.sectionToggle}
                    aria-expanded={open}
                    onClick={() => setOpen((v) => !v)}
                >
                    {open ? (
                        <CaretDownFill size={9} aria-hidden />
                    ) : (
                        <CaretRightFill size={9} aria-hidden />
                    )}
                    {name}
                </button>
                <span className={styles.sectionRule} aria-hidden />
                <span className={styles.sectionCount}>{count}</span>
            </h2>
            {open && children}
        </section>
    );
}
