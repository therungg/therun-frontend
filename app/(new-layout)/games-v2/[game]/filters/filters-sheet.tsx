'use client';

import {
    Calendar3,
    CameraVideo,
    CheckCircle,
    Globe2,
} from 'react-bootstrap-icons';
import { countries } from '~src/common/countries';
import type {
    BoardFacets,
    VariableRow,
} from '../../../../../types/leaderboards.types';
import mastheadStyles from '../header/masthead.module.scss';
import type { VideoFilter } from './builtin-params';
import type { FilterDraft } from './filter-draft';
import styles from './filters-popover.module.scss';

interface Props {
    draft: FilterDraft;
    onChange: (d: FilterDraft) => void;
    onApply: () => void;
    onReset: () => void;
    dirty: boolean;
    facets: BoardFacets;
    filterDefs: VariableRow[];
    isPending: boolean;
}

const VIDEO: Array<{ value: VideoFilter | ''; label: string }> = [
    { value: '', label: 'Any' },
    { value: 'required', label: 'Required' },
    { value: 'missing', label: 'Missing' },
];

function Segmented<T extends string>({
    id,
    value,
    options,
    onChange,
}: {
    id: string;
    value: T;
    options: Array<{ value: T; label: string }>;
    onChange: (v: T) => void;
}) {
    return (
        <div
            className={styles.segmented}
            role="radiogroup"
            aria-labelledby={id}
        >
            {options.map((o) => (
                <button
                    key={o.value || 'any'}
                    type="button"
                    role="radio"
                    aria-checked={value === o.value}
                    className={`${styles.segment} ${value === o.value ? styles.segmentOn : ''}`}
                    onClick={() => onChange(o.value)}
                >
                    {o.label}
                </button>
            ))}
        </div>
    );
}

/**
 * The panel body: draft in, callbacks out. It never touches the URL — the
 * popover owns that, on Apply — so a reader can change five things and the
 * board only moves once.
 */
export function FiltersSheet({
    draft,
    onChange,
    onApply,
    onReset,
    dirty,
    facets,
    filterDefs,
    isPending,
}: Props) {
    const b = draft.builtins;
    const setB = (patch: Partial<FilterDraft['builtins']>) =>
        onChange({ ...draft, builtins: { ...b, ...patch } });
    const toggleVar = (key: string, value: string) => {
        const cur = draft.varFilters[key] ?? [];
        const next = cur.includes(value)
            ? cur.filter((v) => v !== value)
            : [...cur, value];
        const varFilters = { ...draft.varFilters };
        if (next.length) varFilters[key] = next;
        else delete varFilters[key];
        onChange({ ...draft, varFilters });
    };
    const today = new Date().toISOString().slice(0, 10);
    const names = countries() as Record<string, string>;

    return (
        <div className={styles.sheet}>
            <div className={styles.grid}>
                <section className={styles.group}>
                    <h3 className={styles.groupLabel} id="flt-verified">
                        <CheckCircle size={13} aria-hidden />
                        Verification
                    </h3>
                    <Segmented
                        id="flt-verified"
                        value={b.verified ? 'verified' : 'all'}
                        options={[
                            { value: 'all', label: 'All runs' },
                            { value: 'verified', label: 'Verified only' },
                        ]}
                        onChange={(v) => setB({ verified: v === 'verified' })}
                    />
                </section>
                <section className={styles.group}>
                    <h3 className={styles.groupLabel} id="flt-video">
                        <CameraVideo size={13} aria-hidden />
                        Video
                    </h3>
                    <Segmented
                        id="flt-video"
                        value={b.video ?? ''}
                        options={VIDEO}
                        onChange={(v) => setB({ video: v || null })}
                    />
                </section>
                <section className={styles.group}>
                    <h3 className={styles.groupLabel}>
                        <Calendar3 size={13} aria-hidden />
                        Date range
                    </h3>
                    <div className={styles.dates}>
                        <label className={styles.dateField}>
                            <span>From</span>
                            <input
                                type="date"
                                value={b.from ?? ''}
                                min={facets.minDate ?? undefined}
                                max={b.to ?? today}
                                onChange={(e) =>
                                    setB({ from: e.target.value || null })
                                }
                            />
                        </label>
                        <span className={styles.dash} aria-hidden>
                            –
                        </span>
                        <label className={styles.dateField}>
                            <span>To</span>
                            <input
                                type="date"
                                value={b.to ?? ''}
                                min={b.from ?? facets.minDate ?? undefined}
                                max={today}
                                onChange={(e) =>
                                    setB({ to: e.target.value || null })
                                }
                            />
                        </label>
                    </div>
                    <p className={styles.hint}>
                        The board as it stood, counting only runs finished in
                        this range.
                    </p>
                </section>
                {facets.countries.length > 0 && (
                    <section className={styles.group}>
                        <label
                            className={styles.groupLabel}
                            htmlFor="flt-country"
                        >
                            <Globe2 size={13} aria-hidden />
                            Country
                        </label>
                        <select
                            id="flt-country"
                            className={styles.select}
                            value={b.country ?? ''}
                            onChange={(e) =>
                                setB({ country: e.target.value || null })
                            }
                        >
                            <option value="">Any</option>
                            {facets.countries.map((c) => (
                                <option key={c} value={c}>
                                    {names[c] ?? c}
                                </option>
                            ))}
                        </select>
                    </section>
                )}
                {filterDefs.map((def) => (
                    <section
                        key={def.nameNormalized}
                        className={`${styles.group} ${styles.groupWide}`}
                    >
                        <h3 className={styles.groupLabel}>{def.name}</h3>
                        <div
                            className={styles.pills}
                            role="group"
                            aria-label={def.name}
                        >
                            {def.values.map((bucket) => {
                                const v = bucket[0];
                                const on = (
                                    draft.varFilters[def.nameNormalized] ?? []
                                ).includes(v);
                                return (
                                    <button
                                        key={v}
                                        type="button"
                                        aria-pressed={on}
                                        className={`${mastheadStyles.chip} ${on ? mastheadStyles.chipActive : ''}`}
                                        onClick={() =>
                                            toggleVar(def.nameNormalized, v)
                                        }
                                    >
                                        {v}
                                    </button>
                                );
                            })}
                        </div>
                    </section>
                ))}
            </div>
            <div className={styles.foot}>
                <button
                    type="button"
                    className={styles.reset}
                    onClick={onReset}
                    disabled={isPending}
                >
                    Reset filters
                </button>
                <button
                    type="button"
                    className={styles.apply}
                    onClick={onApply}
                    disabled={!dirty || isPending}
                >
                    Apply
                </button>
            </div>
        </div>
    );
}
