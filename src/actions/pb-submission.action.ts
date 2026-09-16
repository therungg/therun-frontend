'use server';

import { z } from 'zod';
import { type ActionResult, mapApiError } from '~src/lib/action-result';
import {
    getPbSubmission,
    listWaitingOnRunner,
    submitPb,
} from '~src/lib/pb-submissions';
import type {
    PbSubmissionForm,
    WaitingRun,
} from '../../types/pb-submission.types';
import { getSession } from './session.action';

const submitSchema = z.object({
    runId: z.number().int().positive(),
    legitimate: z.literal(true),
    timeMs: z.number().int().positive(),
    gameTimeMs: z.number().int().positive().nullable().optional(),
    vodUrl: z.string().url().optional(),
    variables: z.record(z.string(), z.unknown()).optional(),
});

/**
 * Everything waiting on the signed-in runner: runs that need a video and PBs
 * held until they submit them. With `forName`, only when the viewer is that
 * runner, so a profile never shows someone else's list.
 */
export async function loadWaitingOnYouAction(
    forName?: string,
): Promise<
    | { ok: true; username: string | null; runs: WaitingRun[] }
    | { ok: false; error: string }
> {
    const session = await getSession();
    if (!session?.id || !session.username) {
        return { ok: true, username: null, runs: [] };
    }
    if (
        forName !== undefined &&
        forName.toLowerCase() !== session.username.toLowerCase()
    ) {
        return { ok: true, username: session.username, runs: [] };
    }
    try {
        return {
            ok: true,
            username: session.username,
            runs: await listWaitingOnRunner(session.id),
        };
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
