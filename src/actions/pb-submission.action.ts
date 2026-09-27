'use server';

import { z } from 'zod';
import { type ActionResult, mapApiError } from '~src/lib/action-result';
import { ModError } from '~src/lib/moderation/mod-fetch';
import {
    getPbSubmission,
    getRunnerCategoryRuns,
    getRunnerSubmissions,
    listHeldPbs,
    listOffBoardForRunner,
    submitPb,
} from '~src/lib/pb-submissions';
import type {
    HeldPb,
    OffBoardRow,
    PbSubmissionForm,
} from '../../types/pb-submission.types';
import type {
    SubmissionItem,
    SubmissionsOverview,
} from '../../types/runner-status.types';
import { getSession } from './session.action';

const submitSchema = z.object({
    runId: z.number().int().positive(),
    legitimate: z.literal(true),
    timeMs: z.number().int().positive(),
    gameTimeMs: z.number().int().positive().nullable().optional(),
    vodUrl: z.string().url().optional(),
    variables: z.record(z.string(), z.unknown()).optional(),
});

/** PBs waiting on the signed-in runner, oldest ask first. */
export async function loadHeldPbsAction(): Promise<
    ({ ok: true } & { held: HeldPb[] }) | { ok: false; error: string }
> {
    const session = await getSession();
    if (!session?.id) return { ok: false, error: 'You must be signed in.' };
    try {
        return { ok: true, held: await listHeldPbs(session.id) };
    } catch (e) {
        const failed = mapApiError(e);
        return failed.ok
            ? { ok: false, error: 'Something went wrong.' }
            : failed;
    }
}

/**
 * This runner's own runs a board baseline took off for lacking speedrun.com
 * evidence. Separate from `loadHeldPbsAction` — these runs are not held,
 * they just left a board, so they're fetched and rendered as their own list.
 */
export async function loadOffBoardRunsAction(): Promise<
    ({ ok: true } & { offBoard: OffBoardRow[] }) | { ok: false; error: string }
> {
    const session = await getSession();
    if (!session?.id) return { ok: false, error: 'You must be signed in.' };
    try {
        return { ok: true, offBoard: await listOffBoardForRunner(session.id) };
    } catch (e) {
        const failed = mapApiError(e);
        return failed.ok
            ? { ok: false, error: 'Something went wrong.' }
            : failed;
    }
}

/** One held run, with the board's rules and what it asks for. */
export async function loadPbSubmissionAction(
    runId: number,
): Promise<
    ({ ok: true } & { form: PbSubmissionForm }) | { ok: false; error: string }
> {
    const session = await getSession();
    if (!session?.id) return { ok: false, error: 'You must be signed in.' };
    try {
        return { ok: true, form: await getPbSubmission(runId, session.id) };
    } catch (e) {
        const failed = mapApiError(e);
        return failed.ok
            ? { ok: false, error: 'Something went wrong.' }
            : failed;
    }
}

/**
 * Submit a held PB. This is not the runner verifying their own run — it hands a
 * moderator, or the board's dials, the evidence to judge it with.
 */
export async function submitPbAction(
    input: z.infer<typeof submitSchema>,
): Promise<ActionResult> {
    const session = await getSession();
    if (!session?.id) return { ok: false, error: 'You must be signed in.' };
    const parsed = submitSchema.safeParse(input);
    if (!parsed.success) {
        return {
            ok: false,
            error: parsed.error.issues[0]?.message ?? 'Check the form.',
        };
    }
    const { runId, ...body } = parsed.data;
    try {
        await submitPb(runId, body, session.id);
        return { ok: true };
    } catch (e) {
        return mapApiError(e);
    }
}

/**
 * One runner's submissions overview for the Submissions/Leaderboards tab —
 * the target runner themself, or a moderator scoped to their own games.
 * `status` rides the error so the page can 403/404 rather than showing a
 * generic failure.
 */
export async function loadRunnerSubmissionsAction(
    username: string,
): Promise<
    | { ok: true; overview: SubmissionsOverview }
    | { error: string; status?: number }
> {
    const session = await getSession();
    if (!session?.id) return { error: 'You must be signed in.' };
    try {
        return {
            ok: true,
            overview: await getRunnerSubmissions(username, session.id),
        };
    } catch (e) {
        if (e instanceof ModError) {
            return { error: e.message, status: e.status };
        }
        return { error: 'Something went wrong.' };
    }
}

/** One page of a runner's finished runs on one board slice. */
export async function loadRunnerCategoryRunsAction(
    username: string,
    categoryId: number,
    subcategoryKey: string,
    page: number,
): Promise<
    | { ok: true; items: SubmissionItem[]; page: number; hasMore: boolean }
    | { error: string }
> {
    const session = await getSession();
    if (!session?.id) return { error: 'You must be signed in.' };
    try {
        const res = await getRunnerCategoryRuns(
            username,
            categoryId,
            subcategoryKey,
            page,
            session.id,
        );
        return { ok: true, ...res };
    } catch (e) {
        if (e instanceof ModError) return { error: e.message };
        return { error: 'Something went wrong.' };
    }
}
