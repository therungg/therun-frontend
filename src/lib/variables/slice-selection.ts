import type {
    StandingsCategory,
    StandingsVariable,
    VariableRow,
} from '../../../types/leaderboards.types';
import { buildSubcategoryKey, normalizeVariableName } from './keys';

/** Variable key -> normalized value. Only keys the picker knows. */
export type SliceSelection = Record<string, string>;

const canonicalOf = (bucket: string[]): string | null =>
    bucket.length > 0 ? bucket[0] : null;

/**
 * Union of subcategory variables across categories, keyed by
 * `nameNormalized`. Mirrors the backend's standings `variables` so the
 * overview (which builds it from per-category defs) and standings (which
 * receives it) resolve boards identically. First category wins for name,
 * value order and `defaultValue`; later ones add values and their own
 * default.
 */
export function unionSubcategoryVariables(
    perCategory: Array<{ categoryId: number; defs: VariableRow[] }>,
): StandingsVariable[] {
    const out = new Map<string, StandingsVariable>();
    for (const { categoryId, defs } of perCategory) {
        for (const def of defs) {
            if (def.role !== 'subcategory') continue;
            const values = def.values
                .map(canonicalOf)
                .filter((v): v is string => v !== null)
                .map((display) => ({
                    value: normalizeVariableName(display),
                    display,
                }));
            const defBucket =
                def.defaultValueIndex != null
                    ? def.values[def.defaultValueIndex]
                    : undefined;
            const ownDefault = defBucket ? canonicalOf(defBucket) : null;
            const ownDefaultNorm =
                ownDefault !== null ? normalizeVariableName(ownDefault) : null;
            const existing = out.get(def.nameNormalized);
            if (!existing) {
                out.set(def.nameNormalized, {
                    key: def.nameNormalized,
                    name: def.name,
                    values,
                    defaultValue: ownDefaultNorm,
                    categoryIds: [categoryId],
                    defaultsByCategory:
                        ownDefaultNorm === null
                            ? {}
                            : { [String(categoryId)]: ownDefaultNorm },
                });
                continue;
            }
            existing.categoryIds.push(categoryId);
            if (ownDefaultNorm !== null)
                existing.defaultsByCategory[String(categoryId)] =
                    ownDefaultNorm;
            const seen = new Set(existing.values.map((v) => v.value));
            for (const v of values) {
                if (!seen.has(v.value)) {
                    existing.values.push(v);
                    seen.add(v.value);
                }
            }
        }
    }
    return [...out.values()];
}

/**
 * The picker's state from the URL: one param per variable key, normalized,
 * kept only when it is one of the variable's values. Anything else (unknown
 * key, unknown value, empty) is absent, and absent means "default".
 */
export function readSliceSelection(
    params: Record<string, string | undefined> | URLSearchParams,
    variables: StandingsVariable[],
): SliceSelection {
    const get = (key: string): string | undefined =>
        params instanceof URLSearchParams
            ? (params.get(key) ?? undefined)
            : params[key];
    const selection: SliceSelection = {};
    for (const v of variables) {
        const raw = get(v.key);
        if (!raw) continue;
        const norm = normalizeVariableName(raw);
        if (v.values.some((x) => x.value === norm)) selection[v.key] = norm;
    }
    return selection;
}

/** Selection with every variable filled: picked value, else the union default, else the first value. */
export function effectiveSelection(
    selection: SliceSelection,
    variables: StandingsVariable[],
): SliceSelection {
    const out: SliceSelection = {};
    for (const v of variables) {
        const picked = selection[v.key];
        const fallback = v.defaultValue ?? v.values[0]?.value;
        const value = picked ?? fallback;
        if (value) out[v.key] = value;
    }
    return out;
}

/**
 * Which board of ONE category the selection means, expressed as the
 * category's own subcategory values (normalized) — the `subcategoryValues`
 * a board fetch takes. Rules, in order, per subcategory variable the
 * category carries:
 *   1. the picked value, when this category has it;
 *   2. else this category's own default;
 *   3. else its first value.
 * A picker key the category does not carry is ignored.
 */
export function sliceValuesForCategory(
    defs: VariableRow[],
    selection: SliceSelection,
): Record<string, string> {
    const out: Record<string, string> = {};
    for (const def of defs) {
        if (def.role !== 'subcategory') continue;
        const values = def.values
            .map(canonicalOf)
            .filter((v): v is string => v !== null)
            .map(normalizeVariableName);
        if (values.length === 0) continue;
        const picked = selection[def.nameNormalized];
        const defBucket =
            def.defaultValueIndex != null
                ? def.values[def.defaultValueIndex]
                : undefined;
        const own = defBucket ? canonicalOf(defBucket) : null;
        const ownNorm = own !== null ? normalizeVariableName(own) : null;
        out[def.nameNormalized] =
            picked !== undefined && values.includes(picked)
                ? picked
                : ownNorm !== null && values.includes(ownNorm)
                  ? ownNorm
                  : values[0];
    }
    return out;
}

/**
 * The same rules as `sliceValuesForCategory`, but over a standings payload
 * where the category's boards are the columns sharing its `id`. Returns the
 * index into `boards` of the matching board, or null when no board holds
 * runs for that combination (the caller renders a greyed column).
 */
export function pickBoardIndex(
    boards: StandingsCategory[],
    categoryId: number,
    selection: SliceSelection,
    variables: StandingsVariable[],
): number | null {
    const candidates = boards
        .map((b, i) => ({ b, i }))
        .filter(({ b }) => b.id === categoryId);
    if (candidates.length === 0) return null;

    // The keys this category carries and the values it has for each —
    // derived from its own boards, which is what the payload knows.
    const carried = new Map<string, Set<string>>();
    for (const { b } of candidates) {
        for (const [k, v] of Object.entries(b.subcategory ?? {})) {
            const set = carried.get(k) ?? new Set<string>();
            set.add(v);
            carried.set(k, set);
        }
    }

    const wanted: Record<string, string> = {};
    for (const [k, values] of carried) {
        const picked = selection[k];
        if (picked !== undefined && values.has(picked)) {
            wanted[k] = picked;
            continue;
        }
        const variable = variables.find((v) => v.key === k);
        const own = variable?.defaultsByCategory[String(categoryId)];
        if (own !== undefined && values.has(own)) {
            wanted[k] = own;
            continue;
        }
        const union = variable?.defaultValue ?? undefined;
        if (union !== undefined && values.has(union)) {
            wanted[k] = union;
            continue;
        }
        wanted[k] = [...values].sort()[0];
    }

    const match = candidates.find(({ b }) => {
        const sub = b.subcategory ?? {};
        const keys = Object.keys(sub);
        if (keys.length !== Object.keys(wanted).length) return false;
        return keys.every((k) => sub[k] === wanted[k]);
    });
    return match ? match.i : null;
}

/** "Mario · 1P" from a board's values, in the picker's variable order; null for no subcategories. */
export function sliceLabel(
    subcategory: Record<string, string>,
    variables: StandingsVariable[],
): string | null {
    const parts: string[] = [];
    for (const v of variables) {
        const value = subcategory[v.key];
        if (value === undefined) continue;
        const display = v.values.find((x) => x.value === value)?.display;
        parts.push(display ?? value);
    }
    // Keys the picker does not know still identify the board.
    for (const [k, value] of Object.entries(subcategory)) {
        if (!variables.some((v) => v.key === k)) parts.push(value);
    }
    return parts.length > 0 ? parts.join(' · ') : null;
}

/** The `name=value|name=value` key a board link carries: display values, so the board page's pills light up. */
export function subcategoryKeyOf(
    subcategory: Record<string, string>,
    variables: StandingsVariable[],
): string {
    return buildSubcategoryKey(
        Object.entries(subcategory).map(([name, value]) => ({
            name,
            value:
                variables
                    .find((v) => v.key === name)
                    ?.values.find((x) => x.value === value)?.display ?? value,
        })),
    );
}
