'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import {
    effectiveSelection,
    type SliceSelection,
} from '~src/lib/variables/slice-selection';
import type { StandingsVariable } from '../../../../../types/leaderboards.types';
import { useBoardNav } from '../filters/use-board-nav';
import masthead from '../header/masthead.module.scss';
import styles from './slice-picker.module.scss';

interface Props {
    variables: StandingsVariable[];
    selection: SliceSelection;
    /** Extra query keys to drop when the selection changes. `page` always is. */
    clearKeys?: string[];
}

// Mods often name a variable as the question they were asking ("Solo or
// co-op?"). In front of its own answers the question mark is noise.
const captionOf = (name: string) => name.replace(/\s*\?+\s*$/, '');

function pendingKeyFor(key: string, value: string): string {
    return `slice:${key}:${value}`;
}

/**
 * One single-select segmented control per subcategory variable. Picking a
 * value switches EVERY category on the page to that board at once — the
 * page-level twin of the board masthead's subcategory tier, same classes.
 * Selection lives in the URL, one param per variable key, exactly as the
 * board page writes it, so a link from here opens the board on that slice.
 */
export function SlicePicker({ variables, selection, clearKeys = [] }: Props) {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    // Shared with the rest of the page (see BoardNavRegion) so the region
    // this picker rebuilds dims while the new slice is fetched, and the
    // site's top bar runs for the whole trip.
    const { navigate, isPending, pendingKey } = useBoardNav();
    if (variables.length === 0) return null;

    const active = effectiveSelection(selection, variables);

    const pick = (key: string, value: string, display: string) => {
        const sp = new URLSearchParams(searchParams.toString());
        // The board page's own subcategory pills only mark a value active
        // when the raw URL value equals its display form, so write display
        // here too — a link from this page opens the board with the right
        // pill lit.
        sp.set(key, display);
        sp.delete('page');
        for (const k of clearKeys) sp.delete(k);
        // Replace, not push: this is a view of the page you are already on,
        // and a Back entry per segment click is noise.
        navigate(`${pathname}?${sp.toString()}`, pendingKeyFor(key, value), {
            replace: true,
            scroll: false,
        });
    };

    return (
        <div className={styles.band} role="group" aria-label="Board">
            {variables.map((v) => {
                const capId = `slice-${v.key}`;
                // Optimistic selection: while this variable's own swap is in
                // flight the pressed segment reads as chosen straight away
                // and the previous one drops to rest. A nav for a DIFFERENT
                // variable leaves this group exactly as it was.
                const pendingValue = v.values
                    .map((x) => x.value)
                    .find(
                        (value) =>
                            isPending &&
                            pendingKey === pendingKeyFor(v.key, value),
                    );
                return (
                    <div
                        key={v.key}
                        className={masthead.control}
                        role="group"
                        aria-labelledby={capId}
                    >
                        <span className={masthead.controlCap} id={capId}>
                            {captionOf(v.name)}
                        </span>
                        <div className={masthead.segTrack}>
                            {v.values.map((x) => {
                                const on =
                                    (pendingValue ?? active[v.key]) === x.value;
                                // The segment that was pressed, not every
                                // segment in the group.
                                const busy =
                                    isPending &&
                                    pendingKey ===
                                        pendingKeyFor(v.key, x.value);
                                return (
                                    <button
                                        key={x.value}
                                        type="button"
                                        onClick={() =>
                                            pick(v.key, x.value, x.display)
                                        }
                                        aria-pressed={on}
                                        aria-busy={busy || undefined}
                                        className={`${masthead.seg} ${on ? masthead.segOn : ''} ${busy ? masthead.segBusy : ''}`}
                                    >
                                        {x.display}
                                        {busy && (
                                            <span
                                                aria-hidden
                                                className={masthead.segSpinner}
                                            />
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
