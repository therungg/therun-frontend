'use client';

import { DurationToFormatted } from '~src/components/util/datetime';
import styles from './moderate-panel.module.scss';

/** A time in mono, or an ellipsis while there is none. */
export function Time({ ms }: { ms: number | null }) {
    return (
        <span className={styles.mono}>
            {ms == null ? '…' : <DurationToFormatted duration={ms} />}
        </span>
    );
}
