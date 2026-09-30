import type {
    RejectEntryAfter,
    RejectOptions,
    RejectWithout,
} from '../../../../../../types/reject-options.types';

/** How far a reject reaches. Ban scopes are the runner's exclusion rule. */
export type RejectScope =
    | { kind: 'run' }
    | { kind: 'select'; runIds: number[] }
    | { kind: 'all' }
    | { kind: 'ban'; scope: 'category' | 'game' };

/** Verdict batches are capped at 500 ids on the server. */
const VERDICT_BATCH = 500;

/** The `without` question that previews this scope. A ban hides every run. */
export function scopeWithout(scope: RejectScope): RejectWithout {
    switch (scope.kind) {
        case 'run':
            return null;
        case 'select':
            return scope.runIds;
        default:
            return 'all';
    }
}

/** Run ids a reject scope submits; none for a ban. */
export function scopeRunIds(
    scope: RejectScope,
    runId: number,
    options: RejectOptions | null,
): number[] {
    switch (scope.kind) {
        case 'run':
            return [runId];
        case 'select':
            return scope.runIds;
        case 'all':
            return options ? options.allRunIds : [runId];
        case 'ban':
            return [];
    }
}

export function chunkIds(ids: number[], size = VERDICT_BATCH): number[][] {
    const out: number[][] = [];
    for (let i = 0; i < ids.length; i += size) out.push(ids.slice(i, i + size));
    return out;
}

export function submitLabel(
    scope: RejectScope,
    runId: number,
    options: RejectOptions | null,
    names: { category: string; game: string },
): string {
    if (scope.kind === 'ban') {
        return `Ban from ${scope.scope === 'category' ? names.category : names.game}`;
    }
    const n = scopeRunIds(scope, runId, options).length;
    if (n === 0) return 'Select runs';
    return `Reject ${n} run${n === 1 ? '' : 's'}`;
}

/** Why a ban scope can't be picked, or null when it can. */
export function banBlocked(
    options: RejectOptions,
    scope: 'category' | 'game',
): string | null {
    if (options.runner.userId == null) return "Guest runners can't be banned";
    if (options.runner.isCoop) {
        return 'Ban individual runners from the runner menu';
    }
    if (options.bans[scope]) return 'Already banned';
    return null;
}

export function consequenceOf(entryAfter: RejectEntryAfter):
    | { kind: 'leaves' }
    | {
          kind: 'drops';
          timeMs: number;
          endedAt: string | null;
          manual: boolean;
      } {
    if (!entryAfter) return { kind: 'leaves' };
    return {
        kind: 'drops',
        timeMs: entryAfter.timeMs,
        endedAt: entryAfter.endedAt,
        manual: entryAfter.kind === 'manual',
    };
}
