const RUN_FIELDS = [
    'id',
    'gameId',
    'categoryId',
    'levelId',
    'time',
    'platformId',
    'regionId',
    'emulator',
    'video',
    'comment',
    'verified',
    'verifiedById',
    'date',
    'dateSubmitted',
    'dateVerified',
    'playerIds',
    'valueIds',
] as const;

// Vercel rejects request bodies over 4.5MB; stay under with some headroom.
export const MAX_EXPORT_BYTES = 4 * 1024 * 1024;

type Obj = Record<string, unknown>;

function isObj(v: unknown): v is Obj {
    return typeof v === 'object' && v !== null && !Array.isArray(v);
}

export type TrimResult =
    | { ok: true; trimmed: unknown }
    | { ok: false; error: string };

/**
 * Reduces a speedrun.com data export to the fields the backend reads: the
 * user's id and name, and only their own runs.
 */
export function trimExport(parsed: unknown): TrimResult {
    const invalid: TrimResult = {
        ok: false,
        error: "That isn't a speedrun.com data export.",
    };
    if (!isObj(parsed)) return invalid;
    const { user, runList } = parsed;
    if (
        !isObj(user) ||
        user.id == null ||
        user.name == null ||
        !Array.isArray(runList)
    ) {
        return invalid;
    }
    const runs = runList
        .filter(
            (r): r is Obj =>
                isObj(r) &&
                Array.isArray(r.playerIds) &&
                r.playerIds.includes(user.id),
        )
        .map((r) => {
            const out: Obj = {};
            for (const key of RUN_FIELDS) {
                if (key in r) out[key] = r[key];
            }
            return out;
        });
    const trimmed = { user: { id: user.id, name: user.name }, runList: runs };
    if (JSON.stringify(trimmed).length > MAX_EXPORT_BYTES) {
        return { ok: false, error: 'This export is too large to upload.' };
    }
    return { ok: true, trimmed };
}
