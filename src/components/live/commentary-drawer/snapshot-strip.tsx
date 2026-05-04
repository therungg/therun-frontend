'use client';

import clsx from 'clsx';
import { LiveRun } from '~app/(new-layout)/live/live.types';
import styles from './commentary-drawer.module.scss';
import { deriveSnapshot } from './derive-snapshot';
import { formatDelta, formatPercent, formatTimeMs } from './format';

export const SnapshotStrip = ({
    liveRun,
    selectedIndex,
}: {
    liveRun: LiveRun;
    selectedIndex: number;
}) => {
    const snap = deriveSnapshot(liveRun, selectedIndex);
    const delta = formatDelta(snap.deltaMs);

    const tile = (label: string, value: string, toneClass?: string) => (
        <div className={styles.snapshotTile} key={label}>
            <span className={styles.snapshotLabel}>{label}</span>
            <span className={clsx(styles.snapshotValue, toneClass)}>
                {value}
            </span>
        </div>
    );

    return (
        <div className={styles.snapshot}>
            {tile('Split', snap.splitIndexLabel)}
            {tile('Time', formatTimeMs(snap.timeMs))}
            {tile(
                'Δ PB',
                delta.text,
                delta.tone === 'ahead'
                    ? styles.toneAhead
                    : delta.tone === 'behind'
                      ? styles.toneBehind
                      : styles.toneNeutral,
            )}
            {tile('p50', formatTimeMs(snap.p50Ms))}
            {tile('Reset %', formatPercent(snap.resetRate))}
        </div>
    );
};
