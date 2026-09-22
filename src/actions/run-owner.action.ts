'use server';

import { updateTag } from 'next/cache';
import { getSession } from '~src/actions/session.action';
import { ApiError, apiFetch } from '~src/lib/api-client';
import { userRunsTag } from '~src/lib/run-tags';
import { runnerProfileTag } from '~src/lib/runner-profile';
import { safeDecodeURI, safeEncodeURI } from '~src/utils/uri';

export interface RunTarget {
    /** The runner the run belongs to, as the page addresses them. */
    username: string;
    /** The run's own game segment — what the timer API keys it by. */
    game: string;
    /** The run's own category segment, qualifiers included. */
    category: string;
}

export interface RunEditFields {
    description: string;
    vod: string;
    customUrl: string;
}

type Result<T = unknown> = ({ ok: true } & T) | { error: string };

const MAX_DESCRIPTION = 250;
const MAX_VOD = 100;

/**
 * The path the timer API authorises owner writes on: the caller's session id
 * joined to the name it belongs to. Only the runner's own session can
 * produce it, so this is an owner-only surface by construction — the check
 * below just fails fast instead of letting the backend reject it.
 */
async function ownerPath({
    username,
    game,
    category,
}: RunTarget): Promise<string | null> {
    const session = await getSession();
    if (!session?.id || !session.username) return null;
    const target = safeDecodeURI(username).toLowerCase();
    if (session.username.toLowerCase() !== target) return null;
    return `/users/${session.id}-${session.username}/${safeEncodeURI(
        game,
    )}/${safeEncodeURI(category)}`;
}

/**
 * Expire what a write to one run changes.
 *
 * `updateTag`, not `revalidateTag`: the runner is sent straight back to the
 * page they just edited, and stale-while-revalidate would show them the old
 * description for one more read.
 */
function invalidate(name: string) {
    updateTag(userRunsTag(name));
    updateTag(runnerProfileTag(name, 'stats'));
    updateTag(runnerProfileTag(name, 'head'));
}

function toError(e: unknown): { error: string } {
    if (e instanceof ApiError) return { error: e.message };
    return { error: 'Something went wrong. Please try again.' };
}

/** Description, VOD link and custom URL on your own run. */
export async function editRunAction(
    target: RunTarget,
    fields: RunEditFields,
): Promise<Result> {
    const path = await ownerPath(target);
    if (!path) return { error: 'This is not your run.' };

    const description = fields.description.trim();
    if (description.length > MAX_DESCRIPTION) {
        return {
            error: `Keep the description under ${MAX_DESCRIPTION} characters.`,
        };
    }

    const vod = fields.vod.trim();
    if (vod) {
        if (vod.length > MAX_VOD) {
            return { error: `Keep the VOD link under ${MAX_VOD} characters.` };
        }
        if (!vod.includes('youtu') && !vod.includes('twitch')) {
            return { error: 'A VOD link has to be a YouTube or Twitch URL.' };
        }
    }

    try {
        await apiFetch(path, {
            method: 'PUT',
            body: {
                description,
                vod,
                customUrl: fields.customUrl.trim(),
            },
        });
    } catch (e) {
        return toError(e);
    }

    invalidate(target.username);
    return { ok: true };
}

/** Star or unstar your own run. Returns the state it ended up in. */
export async function toggleRunHighlightAction(
    target: RunTarget,
): Promise<Result<{ highlighted: boolean }>> {
    const path = await ownerPath(target);
    if (!path) return { error: 'This is not your run.' };

    let highlighted: boolean;
    try {
        const result = await apiFetch<{ highlighted: boolean }>(
            `${path}/highlight`,
            { method: 'PUT' },
        );
        highlighted = !!result?.highlighted;
    } catch (e) {
        return toError(e);
    }

    invalidate(target.username);
    return { ok: true, highlighted };
}

/** Remove your own run, its splits and its history. */
export async function deleteRunAction(target: RunTarget): Promise<Result> {
    const path = await ownerPath(target);
    if (!path) return { error: 'This is not your run.' };

    try {
        await apiFetch(path, { method: 'DELETE' });
    } catch (e) {
        return toError(e);
    }

    invalidate(target.username);
    return { ok: true };
}
