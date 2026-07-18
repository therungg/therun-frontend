// Pure label helpers for viewing surfaces. Turns machine-shaped strings
// (subcategory keys like `platform=pc|patch=1.0`, normalized variable maps,
// timing enums) into copy a user can read. Kept prop-plain so it can be used
// from server or client components without pulling in page-level types.

import type { VariableDef } from '../../../../types/leaderboards.types';

/** Minimal shape the helpers need from a variable definition. */
export type LabelVariableDef = Pick<
    VariableDef,
    'name' | 'nameNormalized' | 'values'
>;

const REAL_TIME_KEYS = new Set(['rt', 'realtime', 'rta']);
const GAME_TIME_KEYS = new Set(['gt', 'gametime', 'igt']);

/** Title-cases a raw token: splits camelCase/snake_case/kebab-case/whitespace. */
export function humanizeWord(raw: string): string {
    if (!raw) return '';
    const spaced = raw
        .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
        .replace(/[_-]+/g, ' ')
        .trim();
    if (!spaced) return '';
    return spaced
        .split(/\s+/)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
}

/** Resolves a def whose nameNormalized matches (case-insensitive). */
function findDef(
    name: string,
    defs?: LabelVariableDef[],
): LabelVariableDef | undefined {
    return defs?.find(
        (d) => d.nameNormalized.toLowerCase() === name.toLowerCase(),
    );
}

/** Resolves the canonical display bucket for a value against a def. */
function canonicalValue(def: LabelVariableDef, value: string): string | null {
    const bucket = def.values.find((aliases) =>
        aliases.some((alias) => alias.toLowerCase() === value.toLowerCase()),
    );
    return bucket && bucket[0] ? bucket[0] : null;
}

/**
 * Formats a single `name`/`value` pair as user-facing copy. Prefers the
 * def's canonical display value; falls back to a humanized value, prefixed
 * with the humanized name when the value alone has no letters (e.g. a bare
 * version number like `1.0` is meaningless without its variable name).
 */
function formatPair(
    name: string,
    value: string,
    defs?: LabelVariableDef[],
): string {
    const def = findDef(name, defs);
    if (def) {
        const canonical = canonicalValue(def, value);
        if (canonical) return canonical;
    }
    const humanizedValue = humanizeWord(value);
    if (/[a-zA-Z]/.test(humanizedValue)) return humanizedValue;
    const humanizedName = humanizeWord(name);
    return humanizedName
        ? `${humanizedName} ${humanizedValue}`.trim()
        : humanizedValue;
}

/**
 * Parses a `name=value|name=value` subcategory key into human-readable copy,
 * e.g. `platform=pc|patch=1.0` -> `PC · Patch 1.0` (with defs) or
 * `Pc · Patch 1.0` (humanized fallback without defs). Empty/blank key -> ''.
 */
export function formatSubcategoryKey(
    key: string,
    defs?: LabelVariableDef[],
): string {
    const trimmed = key?.trim();
    if (!trimmed) return '';
    const labels: string[] = [];
    for (const pair of trimmed.split('|')) {
        const eq = pair.indexOf('=');
        if (eq < 0) continue;
        const name = pair.slice(0, eq).trim();
        const value = pair.slice(eq + 1).trim();
        if (!name) continue;
        labels.push(formatPair(name, value, defs));
    }
    return labels.join(' · ');
}

/**
 * Formats a normalized-name -> canonical-value variable map (as seen on
 * `LeaderboardEntry.variables` / `RunDetail.variables`) into human-readable
 * copy, e.g. `{ platform: 'pc' }` -> `PC`. No `=` signs, ` · ` separated.
 */
export function formatVariableList(
    vars: Record<string, string>,
    defs?: LabelVariableDef[],
): string {
    const entries = Object.entries(vars).filter(([k]) => k.length > 0);
    if (entries.length === 0) return '';
    return entries.map(([k, v]) => formatPair(k, v, defs)).join(' · ');
}

/**
 * Maps a timing-method enum to display copy. Handles both vocabularies in
 * use across the API (`rt`/`gt` on public board reads and WR history,
 * `realtime`/`gametime` on mod/self endpoints) plus common aliases
 * (`RTA`/`IGT`). Unknown values fall back to a humanized string — the raw
 * enum is never shown to users.
 */
export function timingMethodLabel(method: string): string {
    if (!method) return '';
    const norm = method.trim().toLowerCase();
    if (REAL_TIME_KEYS.has(norm)) return 'Real time';
    if (GAME_TIME_KEYS.has(norm)) return 'Game time';
    return humanizeWord(method);
}
