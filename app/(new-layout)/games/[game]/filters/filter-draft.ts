import {
    BUILTIN_PARAM_KEYS,
    type BuiltinFilterState,
    countBuiltinFilters,
} from './builtin-params';

/**
 * Local, not-yet-applied state of the Filters sheet. The URL stays the truth;
 * the draft is what Apply writes there in one navigation.
 */
export interface FilterDraft {
    builtins: BuiltinFilterState;
    varFilters: Record<string, string[]>;
}

export function emptyDraft(): FilterDraft {
    return {
        builtins: {
            verified: false,
            video: null,
            from: null,
            to: null,
            country: null,
        },
        varFilters: {},
    };
}

export function draftFromApplied(
    builtins: BuiltinFilterState,
    selectedVarFilters: Record<string, string>,
): FilterDraft {
    const varFilters: Record<string, string[]> = {};
    for (const [k, v] of Object.entries(selectedVarFilters)) {
        const values = v.split(',').filter(Boolean);
        if (values.length > 0) varFilters[k] = values;
    }
    return { builtins: { ...builtins }, varFilters };
}

export function draftCount(d: FilterDraft): number {
    return (
        countBuiltinFilters(d.builtins) +
        Object.values(d.varFilters).reduce((n, v) => n + v.length, 0)
    );
}

export function draftEquals(a: FilterDraft, b: FilterDraft): boolean {
    for (const k of BUILTIN_PARAM_KEYS) {
        if (a.builtins[k] !== b.builtins[k]) return false;
    }
    const keys = new Set([
        ...Object.keys(a.varFilters),
        ...Object.keys(b.varFilters),
    ]);
    for (const k of keys) {
        const av = [...(a.varFilters[k] ?? [])].sort();
        const bv = [...(b.varFilters[k] ?? [])].sort();
        if (av.length !== bv.length || av.some((v, i) => v !== bv[i])) {
            return false;
        }
    }
    return true;
}

/**
 * Writes the whole draft onto `sp` — every key it owns is set or deleted, so
 * one call fully replaces the filter state in the URL. `page` always goes.
 */
export function applyDraftToParams(
    sp: URLSearchParams,
    d: FilterDraft,
    variableKeys: string[],
): void {
    const b = d.builtins;
    if (b.verified) sp.set('verified', 'true');
    else sp.delete('verified');
    if (b.video) sp.set('video', b.video);
    else sp.delete('video');
    if (b.from) sp.set('from', b.from);
    else sp.delete('from');
    if (b.to) sp.set('to', b.to);
    else sp.delete('to');
    if (b.country) sp.set('country', b.country.toUpperCase());
    else sp.delete('country');
    for (const k of variableKeys) {
        const values = d.varFilters[k] ?? [];
        if (values.length > 0) sp.set(k, values.join(','));
        else sp.delete(k);
    }
    sp.delete('page');
}
