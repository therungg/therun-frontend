'use client';

import { countries } from '~src/common/countries';
import type { VariableRow } from '../../../../../types/leaderboards.types';
import styles from '../header/masthead.module.scss';
import { CountryFlag } from '../leaderboard/country-flag';
import type { BuiltinFilterState } from './builtin-params';
import { removeFilterValue } from './filter-values';
import { useBuiltinFilterNav } from './use-builtin-filter-nav';
import { useFilterNav } from './use-filter-nav';

interface Props {
    defs: VariableRow[];
    selected: Record<string, string>;
    builtins: BuiltinFilterState;
}

/**
 * Echoes active variable (`role: 'filter'`) selections as removable chips in
 * the sub-band row, next to the subcategory pills — so a filter narrowing
 * the board is visible without opening the Filters popover. Removing a chip
 * clears exactly that value via the same URL mechanics the popover uses.
 *
 * Built-in filters (verified / video / date range / country) get the same
 * treatment, rendered first: they're echoed via `useBuiltinFilterNav` so a
 * chip's "×" produces exactly the URL the Filters popover would.
 */
export function ActiveFilterChips({ defs, selected, builtins }: Props) {
    const { setVarFilter, isPending } = useFilterNav();
    const { setBuiltin, setRange } = useBuiltinFilterNav();

    const names = countries() as Record<string, string>;
    const rangeLabel =
        builtins.from && builtins.to
            ? `${builtins.from} – ${builtins.to}`
            : builtins.from
              ? `from ${builtins.from}`
              : builtins.to
                ? `until ${builtins.to}`
                : null;

    const builtinChips: Array<{
        key: string;
        label: React.ReactNode;
        text: string;
        onRemove: () => void;
    }> = [];
    if (builtins.verified) {
        builtinChips.push({
            key: 'verified',
            label: 'Verified',
            text: 'Verified',
            onRemove: () => setBuiltin('verified', null),
        });
    }
    if (builtins.video) {
        const text =
            builtins.video === 'required' ? 'Video required' : 'No video';
        builtinChips.push({
            key: 'video',
            label: text,
            text,
            onRemove: () => setBuiltin('video', null),
        });
    }
    if (rangeLabel) {
        builtinChips.push({
            key: 'range',
            label: rangeLabel,
            text: rangeLabel,
            onRemove: () => setRange(null, null),
        });
    }
    if (builtins.country) {
        const name = names[builtins.country] ?? builtins.country;
        builtinChips.push({
            key: 'country',
            text: name,
            label: (
                <>
                    <CountryFlag country={builtins.country} /> {name}
                </>
            ),
            onRemove: () => setBuiltin('country', null),
        });
    }

    const chips = defs
        .filter((d) => d.role === 'filter')
        .flatMap((def) => {
            const values =
                selected[def.nameNormalized]?.split(',').filter(Boolean) ?? [];
            return values.map((value) => ({ def, value, values }));
        });

    if (builtinChips.length === 0 && chips.length === 0) return null;

    // No label column: an active filter chip already says its own variable
    // name, so an "ACTIVE" endcap in front of it was a whole grid gutter
    // spent restating the obvious. The chips join the tier's control flow.
    return (
        <div
            className={styles.control}
            role="group"
            aria-label="Active filters"
        >
            {builtinChips.map(({ key, label, text, onRemove }) => (
                <button
                    key={key}
                    type="button"
                    disabled={isPending}
                    onClick={onRemove}
                    className={styles.activeChip}
                    aria-label={`Remove ${text} filter`}
                >
                    {label}
                    <span aria-hidden="true" className={styles.activeChipX}>
                        ×
                    </span>
                </button>
            ))}
            {chips.map(({ def, value, values }) => (
                <button
                    key={`${def.nameNormalized}-${value}`}
                    type="button"
                    disabled={isPending}
                    onClick={() =>
                        setVarFilter(
                            def.nameNormalized,
                            removeFilterValue(values, value),
                        )
                    }
                    className={styles.activeChip}
                    aria-label={`Remove ${def.name}: ${value} filter`}
                >
                    <span className={styles.activeChipKey}>{def.name}</span>
                    {value}
                    <span aria-hidden="true" className={styles.activeChipX}>
                        ×
                    </span>
                </button>
            ))}
        </div>
    );
}
