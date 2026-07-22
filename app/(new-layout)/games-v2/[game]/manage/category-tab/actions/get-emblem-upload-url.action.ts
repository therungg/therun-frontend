'use server';

import { getSession } from '~src/actions/session.action';
import { confirmPermission } from '~src/rbac/confirm-permission';

const ALLOWED_CONTENT_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
const MAX_CONTENT_LENGTH = 2 * 1024 * 1024;

interface Input {
    gameSlug: string;
    gameId: number;
    categoryId: number;
    contentType: string;
    contentLength: number;
}

interface UploadUrlResult {
    uploadUrl: string;
    imageUrl: string;
}

export async function getEmblemUploadUrlAction(
    input: Input,
): Promise<{ result: UploadUrlResult } | { error: string }> {
    const user = await getSession();
    try {
        confirmPermission(user, 'edit', 'category-settings', {
            game: input.gameSlug,
        });
    } catch {
        return { error: 'Not authorized to edit category settings.' };
    }

    if (!ALLOWED_CONTENT_TYPES.includes(input.contentType)) {
        return { error: 'Image must be PNG, JPEG, or WEBP.' };
    }

    if (
        !Number.isFinite(input.contentLength) ||
        input.contentLength <= 0 ||
        input.contentLength > MAX_CONTENT_LENGTH
    ) {
        return { error: 'Image must be 2 MB or smaller.' };
    }

    try {
        const res = await fetch(
            `${process.env.NEXT_PUBLIC_DATA_URL}/mod/v1/games/${input.gameId}/categories/${input.categoryId}/upload-image`,
            {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${user.id}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contentType: input.contentType,
                    contentLength: input.contentLength,
                }),
            },
        );

        if (!res.ok) {
            const raw = (await res.text()).trim();
            let message = `${res.status} upload-image`;
            if (raw) {
                try {
                    const j = JSON.parse(raw);
                    if (
                        j &&
                        typeof j === 'object' &&
                        typeof j.error === 'string'
                    ) {
                        message = j.error;
                    } else if (
                        j &&
                        typeof j === 'object' &&
                        typeof j.message === 'string'
                    ) {
                        message = j.message;
                    } else {
                        message = raw;
                    }
                } catch {
                    message = raw;
                }
            }
            return { error: message };
        }

        const json = await res.json();
        const result = (json.result ?? json) as UploadUrlResult;
        if (!result?.uploadUrl || !result?.imageUrl) {
            return { error: 'Failed to get upload URL.' };
        }

        return { result };
    } catch {
        return { error: 'Failed to get upload URL.' };
    }
}
