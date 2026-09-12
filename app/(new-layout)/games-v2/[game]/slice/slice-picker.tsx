'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
    effectiveSelection,
    type SliceSelection,
} from '~src/lib/variables/slice-selection';
import type { StandingsVariable } from '../../../../../types/leaderboards.types';
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

/**
 * One single-select segmented control per subcategory variable. Picking a
 * value switches EVERY category on the page to that board at once — the
 * page-level twin of the board masthead's subcategory tier, same classes.
 * Selection lives in the URL, one param per variable key, exactly as the
 * board page writes it, so a link from here opens the board on that slice.
 */
export function SlicePicker({ variables, selection, clearKeys = [] }: Props) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
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
        router.replace(`${pathname}?${sp.toString()}`, { scroll: false });
    };

    return (
        <div className={styles.band} role="group" aria-label="Board">
            {variables.map((v) => {
                const capId = `slice-${v.key}`;
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
                                const on = active[v.key] === x.value;
                                return (
                                    <button
                                        key={x.value}
                                        type="button"
                                        onClick={() =>
                                            pick(v.key, x.value, x.display)
                                        }
                                        aria-pressed={on}
                                        className={`${masthead.seg} ${on ? masthead.segOn : ''}`}
                                    >
                                        {x.display}
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
