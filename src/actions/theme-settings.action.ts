'use server';

import { updateTag } from 'next/cache';
import { type ActionResult, mapApiError } from '~src/lib/action-result';
import { apiFetch } from '~src/lib/api-client';
import { runnerProfileTag } from '~src/lib/runner-profile';
import { type ThemeSettings, themeSettingsTag } from '~src/lib/theme-settings';
import { getSession } from './session.action';

const ALLOWED_CONTENT_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
const MAX_CONTENT_LENGTH = 6 * 1024 * 1024;

/** Saves the signed-in runner's theme settings. */
export async function saveThemeSettingsAction(
    s: ThemeSettings,
): Promise<ActionResult> {
    const session = await getSession();
    if (!session?.id || !session.username) {
        return { ok: false, error: 'You must be signed in.' };
    }
    try {
        await apiFetch(`/users/${encodeURIComponent(session.username)}`, {
            method: 'PUT',
            sessionId: session.id,
            body: { themeSettings: s },
        });
    } catch (e) {
        return mapApiError(e);
    }
    updateTag(themeSettingsTag(session.username));
    updateTag(runnerProfileTag(session.username, 'head'));
    return { ok: true };
}

interface UploadUrlInput {
    contentType: string;
    contentLength: number;
}

interface UploadUrlResult {
    uploadUrl: string;
    imageUrl: string;
}

/** Presigned upload URL for a runner's theme background image. */
export async function getThemeBackgroundUploadUrlAction(
    input: UploadUrlInput,
): Promise<{ result: UploadUrlResult } | { error: string }> {
    const session = await getSession();
    if (!session?.id || !session.username) {
        return { error: 'You must be signed in.' };
    }

    if (!ALLOWED_CONTENT_TYPES.includes(input.contentType)) {
        return { error: 'Image must be PNG, JPEG, or WEBP.' };
    }

    if (
        !Number.isFinite(input.contentLength) ||
        input.contentLength <= 0 ||
        input.contentLength > MAX_CONTENT_LENGTH
    ) {
        return { error: 'Image must be 6 MB or smaller.' };
    }

    try {
        const result = await apiFetch<UploadUrlResult>(
            `/users/${encodeURIComponent(session.username)}`,
            {
                method: 'PUT',
                sessionId: session.id,
                body: {
                    themeBackgroundUpload: {
                        contentType: input.contentType,
                        contentLength: input.contentLength,
                    },
                },
            },
        );
        if (!result?.uploadUrl || !result?.imageUrl) {
            return { error: 'Failed to get upload URL.' };
        }
        return { result };
    } catch (e) {
        const mapped = mapApiError(e);
        return {
            error: mapped.ok ? 'Failed to get upload URL.' : mapped.error,
        };
    }
}
