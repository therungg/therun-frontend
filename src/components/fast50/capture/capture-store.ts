import type { LiveRun } from '~app/(new-layout)/live/live.types';

export interface CapturedRun {
    savedAt: string;
    run: LiveRun;
}

const norm = (s: string) => s.trim().toLowerCase();

export const captureKey = (
    username: string,
    game: string,
    category: string,
): string => `fast50-capture:${norm(username)}:${norm(game)}:${norm(category)}`;

export const saveCapture = (
    storage: Pick<Storage, 'setItem'>,
    run: LiveRun,
): CapturedRun => {
    const payload: CapturedRun = {
        savedAt: new Date().toISOString(),
        run,
    };
    storage.setItem(
        captureKey(run.user, run.game, run.category),
        JSON.stringify(payload),
    );
    return payload;
};

export const loadCapture = (
    storage: Pick<Storage, 'getItem'>,
    username: string,
    game: string,
    category: string,
): CapturedRun | null => {
    const raw = storage.getItem(captureKey(username, game, category));
    if (!raw) return null;
    try {
        const parsed = JSON.parse(raw) as CapturedRun;
        return parsed?.run ? parsed : null;
    } catch {
        return null;
    }
};
