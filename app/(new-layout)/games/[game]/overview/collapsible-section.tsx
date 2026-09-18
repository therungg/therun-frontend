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
            {/* A compact dashed chip (the plate's collapsed-group vocabulary),
                not a full-width hairline row — a disclosure plus a count must
                not own the same anatomy as a real section heading. */}
            <h2 className={styles.collapsibleHead}>
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
                    <span className={styles.sectionCount} aria-hidden>
                        {count}
                    </span>
                </button>
            </h2>
            {open && children}
        </section>
    );
}
