'use client';

import { Pin, PinFill } from 'react-bootstrap-icons';
import type { LeaderboardsProfileEntry } from '../../../../types/leaderboards-profile.types';
import styles from './leaderboards-profile.module.scss';
import { useShowcaseOptional } from './showcase-provider';
import { entryRef, PIN_LIMIT, samePin } from './showcase-rules';

export function PinToggle({ entry }: { entry: LeaderboardsProfileEntry }) {
    const showcase = useShowcaseOptional();
    if (!showcase?.editing || entry.status === 'rejected') return null;
    const { draft, setDraft } = showcase;
    const ref = entryRef(entry);
    const pinned = draft.pins.some((p) => samePin(p, ref));
    const full = !pinned && draft.pins.length >= PIN_LIMIT;

    const toggle = () => {
        if (full) return;
        setDraft((d) => {
            if (pinned) {
                const pins = d.pins.filter((p) => !samePin(p, ref));
                return {
                    ...d,
                    pins,
                    videoPin: samePin(d.videoPin, ref) ? null : d.videoPin,
                };
            }
            if (d.pins.length >= PIN_LIMIT) return d;
            return { ...d, pins: [...d.pins, ref] };
        });
    };

    return (
        <button
            type="button"
            className={
                pinned
                    ? `${styles.pinToggle} ${styles.pinToggleOn}`
                    : styles.pinToggle
            }
            aria-pressed={pinned}
            aria-disabled={full}
            title={
                full
                    ? `${PIN_LIMIT} pins max, remove one first`
                    : pinned
                      ? 'Unpin'
                      : 'Pin'
            }
            onClick={toggle}
        >
            {pinned ? (
                <PinFill size={13} aria-hidden />
            ) : (
                <Pin size={13} aria-hidden />
            )}
            {pinned ? 'Pinned' : 'Pin'}
        </button>
    );
}
