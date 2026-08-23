import { ApiError } from '~src/lib/api-client';

export type ActionResult = { ok: true } | { ok: false; error: string };

export function mapApiError(e: unknown): ActionResult {
    if (e instanceof ApiError) {
        if (e.status === 403)
            return {
                ok: false,
                error: "You don't have permission to do that.",
            };
        return { ok: false, error: e.message };
    }
    return { ok: false, error: 'Something went wrong. Please try again.' };
}
