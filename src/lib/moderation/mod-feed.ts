import type {
    AnonymizeRuleWithNames,
    ModActionLogData,
    ModActionRow,
    PublicModLogEntry,
} from '../../../types/moderation.types';

/**
 * Adapter: the AUTHENTICATED per-game mod feed (`/mod-actions`,
 * `ModActionRow[]`) → the shape the public log view already renders
 * (`PublicModLogEntry`).
 *
 * The "Moderator view" toggle on the board's Moderation tab swaps one feed for
 * the other, and both must render through the same `LogRow`. The two feeds are
 * *not* the same contract, though — the backend calls the authed one's shape
 * "unchanged" on purpose:
 *
 * | | public `mod-log` | authed `mod-actions` |
 * |---|---|---|
 * | envelope | `{items,total,limit,offset,hasMore}` | bare array |
 * | identity | `subject` object, redacted | `data.subject`, real |
 * | reason | `reason` | `remark` |
 * | scope | `gameId`/`categoryId` columns | `data.gameId`/`data.categoryId` |
 * | anonymize marking | `subject.anonymized`/`anonId` | absent |
 *
 * So this module (a) reads identity and scope out of the free-form `data`
 * blob the unified-log writer guarantees, and (b) re-derives the
 * publicly-masked marking by cross-referencing the game's anonymize rules,
 * which a mod is entitled to read anyway. The mod sees the real name AND that
 * the public sees a placeholder — which is exactly what the mock's
 * "publicly anonymous · #N" tag says.
 */

const asData = (v: unknown): ModActionLogData =>
    v && typeof v === 'object' && !Array.isArray(v)
        ? (v as ModActionLogData)
        : {};

const asRecord = (v: unknown): Record<string, unknown> | null =>
    v && typeof v === 'object' && !Array.isArray(v)
        ? (v as Record<string, unknown>)
        : null;

/**
 * Index of "which identities are publicly masked", built from the rules the
 * mod GET returns. Keyed twice because a rule can target either a user
 * (masked across the game/board/site) or one specific run.
 */
export interface AnonymizeIndex {
    byUserId: Map<number, number>;
    byRunId: Map<number, number>;
}

export function buildAnonymizeIndex(
    rules: AnonymizeRuleWithNames[],
): AnonymizeIndex {
    const byUserId = new Map<number, number>();
    const byRunId = new Map<number, number>();
    for (const r of rules) {
        // Lifted rules are history, not current masking.
        if (r.liftedAt) continue;
        if (r.type === 'user') byUserId.set(r.targetId, r.anonId);
        else byRunId.set(r.targetId, r.anonId);
    }
    return { byUserId, byRunId };
}

export const EMPTY_ANONYMIZE_INDEX: AnonymizeIndex = {
    byUserId: new Map(),
    byRunId: new Map(),
};

/** Number of the placeholder the public sees for this row, or null. */
export function publicAnonIdOf(
    entry: PublicModLogEntry,
    index: AnonymizeIndex,
): number | null {
    if (entry.runId != null) {
        const byRun = index.byRunId.get(entry.runId);
        if (byRun != null) return byRun;
    }
    const userId = entry.subject?.userId;
    if (userId != null) {
        const byUser = index.byUserId.get(userId);
        if (byUser != null) return byUser;
    }
    return null;
}

export function modActionToLogEntry(row: ModActionRow): PublicModLogEntry {
    const data = asData(row.data);
    const subject = data.subject ?? null;
    const runId =
        row.entity === 'finished_run' && row.target && /^\d+$/.test(row.target)
            ? Number.parseInt(row.target, 10)
            : null;

    return {
        id: row.logId,
        action: row.action,
        entity: row.entity,
        target: row.target,
        runId,
        at:
            typeof row.timestamp === 'string'
                ? row.timestamp
                : new Date(row.timestamp).toISOString(),
        actor: { userId: row.userId, username: row.actorName },
        subject: subject
            ? {
                  userId: subject.userId ?? null,
                  username: subject.username ?? null,
                  guestName: subject.guestName ?? null,
              }
            : null,
        gameId: data.gameId ?? null,
        categoryId: data.categoryId ?? null,
        reason: row.remark,
        before: asRecord(data.before),
        after: asRecord(data.after),
    };
}

/**
 * Full conversion for the moderator view: real identities from the authed
 * feed, plus the `anonymized`/`anonId` marking the public feed carries so the
 * row can be badged.
 */
export function buildModeratorFeed(
    rows: ModActionRow[],
    index: AnonymizeIndex,
): PublicModLogEntry[] {
    return rows.map((row) => {
        const entry = modActionToLogEntry(row);
        const anonId = publicAnonIdOf(entry, index);
        if (anonId == null || !entry.subject) return entry;
        return {
            ...entry,
            subject: { ...entry.subject, anonymized: true, anonId },
        };
    });
}
