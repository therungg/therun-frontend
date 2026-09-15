import type { ReactNode } from 'react';
import { GameImage } from '~src/components/image/gameimage';
import Link from '~src/components/link';
import styles from './profile-ui.module.scss';
import { type StripTile, TileList } from './stat-strip-tiles';
import { LiveTiles } from './strips/live-tiles';
import type { ResolvedStrip } from './strips/resolve';

export type { StripTile };

export interface StripLead {
    value: string;
    label: string;
    what?: string | null;
    href?: string;
    medal?: string;
    /** Game art shown before the number. */
    image?: string | null;
}

/** A section page's opening line: one big number, then the few that matter. */
export function StatStrip({
    lead,
    tiles,
    label,
    editor,
    strip,
}: {
    lead?: StripLead | null;
    tiles: StripTile[];
    label: string;
    editor?: ReactNode;
    /** When the runner can edit the strip: lets the tiles preview unsaved picks. */
    strip?: ResolvedStrip;
}) {
    const leadBody = lead ? (
        <>
            {lead.image ? (
                <span className={styles.leadArt}>
                    <GameImage
                        src={lead.image}
                        alt=""
                        quality="large"
                        width={45}
                        height={60}
                    />
                </span>
            ) : null}
            <span className={styles.leadValue}>{lead.value}</span>
            <span className={styles.leadText}>
                <span className={styles.leadLabel}>{lead.label}</span>
                {lead.what ? (
                    <span className={styles.leadWhat}>{lead.what}</span>
                ) : null}
            </span>
        </>
    ) : null;
    return (
        <section
            className={`${styles.block} ${styles.strip}`}
            aria-label={label}
        >
            {lead ? (
                lead.href ? (
                    <Link
                        href={lead.href}
                        className={styles.lead}
                        data-medal={lead.medal}
                    >
                        {leadBody}
                    </Link>
                ) : (
                    <div className={styles.lead} data-medal={lead.medal}>
                        {leadBody}
                    </div>
                )
            ) : null}
            {strip ? <LiveTiles strip={strip} /> : <TileList tiles={tiles} />}
            {editor}
        </section>
    );
}
