'use server';

import { updateTag } from 'next/cache';
import { getSession } from '~src/actions/session.action';
import { ApiError, apiFetch } from '~src/lib/api-client';
import { revalidateBoardsForRuleScope } from '~src/lib/moderation/revalidate-boards';
import type {
    SrcGameLink,
    SrcMode,
    SrcRestorePreview,
    SrcRestoreQueued,
    SrcRunSyncStatus,
    SrcSettingsPlan,
    SrcSettingsPreview,
    SrcSettingsSelection,
    SrcSettingsStatus,
} from '../../../../../../types/src-board-sync.types';

export type Result<T> = { result: T } | { error: string; code?: number };

const base = (gameId: number) => `/v1/games/${gameId}/src-import`;

async function call<T>(
    path: string,
    method: 'GET' | 'POST' | 'PATCH' = 'GET',
    body?: unknown,
): Promise<Result<T>> {
    const session = await getSession();
    if (!session?.id) return { error: 'You must be signed in.' };
    try {
        const result = await apiFetch<T>(path, {
            sessionId: session.id,
            method,
            body,
        });
        return { result };
    } catch (e) {
        if (e instanceof ApiError) return { error: e.message, code: e.status };
        return { error: 'Something went wrong. Please try again.' };
    }
}

export async function getSrcSync(gameId: number): Promise<
    Result<{
        settings: SrcSettingsStatus;
        runs: SrcRunSyncStatus;
    }>
> {
    const [settings, runs] = await Promise.all([
        getSrcSettings(gameId),
        getRunSync(gameId),
    ]);
    if ('error' in settings) return settings;
    if ('error' in runs) return runs;
    return { result: { settings: settings.result, runs: runs.result } };
}

export async function getSrcSettings(gameId: number) {
    return call<SrcSettingsStatus>(`${base(gameId)}/settings`);
}

export async function linkSrcGame(gameId: number, url: string) {
    return call<SrcGameLink>(`${base(gameId)}/link`, 'POST', { url });
}

export async function getSettingsPlan(gameId: number) {
    return call<SrcSettingsPlan | null>(`${base(gameId)}/settings/plan`);
}

export async function loadSettingsPlan(gameId: number) {
    return call<SrcSettingsPlan>(`${base(gameId)}/settings/plan`, 'POST');
}

export async function previewSettings(
    gameId: number,
    selection: SrcSettingsSelection,
) {
    return call<SrcSettingsPreview>(
        `${base(gameId)}/settings/preview`,
        'POST',
        selection,
    );
}

export async function applySettings(
    gameId: number,
    selection: SrcSettingsSelection,
) {
    return call<{ jobId: number }>(
        `${base(gameId)}/settings/apply`,
        'POST',
        selection,
    );
}

export async function undoSettings(gameId: number, jobId: number) {
    return call<{ jobId: number }>(
        `${base(gameId)}/${jobId}/undo-config`,
        'POST',
    );
}

export async function getRunSync(gameId: number) {
    return call<SrcRunSyncStatus>(`${base(gameId)}/run-sync`);
}

export async function setSrcMode(
    gameId: number,
    gameSlug: string,
    srcMode: SrcMode,
) {
    const res = await call<SrcRunSyncStatus>(
        `${base(gameId)}/run-sync`,
        'PATCH',
        { srcMode },
    );
    if ('result' in res) {
        updateTag(`game-meta:${gameId}`);
        updateTag(`game-cats:${gameId}`);
        await revalidateBoardsForRuleScope(gameId, gameSlug, null);
    }
    return res;
}

export async function syncRunsNow(gameId: number) {
    return call<SrcRunSyncStatus>(`${base(gameId)}/run-sync/now`, 'POST');
}

export async function previewRestore(gameId: number) {
    return call<SrcRestorePreview>(
        `/admin/games/${gameId}/src-restore`,
        'POST',
        { dryRun: true },
    );
}

export async function restoreFromSrc(gameId: number, gameSlug: string) {
    const res = await call<SrcRestoreQueued>(
        `/admin/games/${gameId}/src-restore`,
        'POST',
        { dryRun: false },
    );
    if ('result' in res) {
        updateTag(`game-meta:${gameId}`);
        updateTag(`game-cats:${gameId}`);
        await revalidateBoardsForRuleScope(gameId, gameSlug, null);
    }
    return res;
}
