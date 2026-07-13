import { apiFetch } from '~src/lib/api-client';
import {
    type PrepSession,
    type PrepSessionData,
    type PrepSessionSummary,
    parsePrepData,
} from './prep.types';

interface RawPrepSession {
    id: number;
    username: string;
    game: string;
    category: string;
    label: string;
    data: unknown;
    createdAt: string;
    updatedAt: string;
}

const toSession = (raw: RawPrepSession): PrepSession => ({
    id: raw.id,
    username: raw.username,
    game: raw.game,
    category: raw.category,
    label: raw.label,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
    data: parsePrepData(raw.data),
});

const runQuery = (username: string, game: string, category: string) =>
    `username=${encodeURIComponent(username)}&game=${encodeURIComponent(
        game,
    )}&category=${encodeURIComponent(category)}`;

export const listPrepSessions = (
    sessionId: string,
    username: string,
    game: string,
    category: string,
): Promise<PrepSessionSummary[]> =>
    apiFetch<PrepSessionSummary[]>(
        `/fast50/prep?${runQuery(username, game, category)}`,
        { sessionId, cache: 'no-store' },
    );

export const getPrepSession = async (
    sessionId: string,
    id: number,
): Promise<PrepSession> =>
    toSession(
        await apiFetch<RawPrepSession>(`/fast50/prep/${id}`, {
            sessionId,
            cache: 'no-store',
        }),
    );

export const createPrepSession = async (
    sessionId: string,
    input: {
        username: string;
        game: string;
        category: string;
        label: string;
        data: PrepSessionData;
    },
): Promise<PrepSession> =>
    toSession(
        await apiFetch<RawPrepSession>('/fast50/prep', {
            method: 'POST',
            body: input,
            sessionId,
        }),
    );

export const updatePrepSession = async (
    sessionId: string,
    id: number,
    input: { label?: string; data?: PrepSessionData },
): Promise<PrepSession> =>
    toSession(
        await apiFetch<RawPrepSession>(`/fast50/prep/${id}`, {
            method: 'PUT',
            body: input,
            sessionId,
        }),
    );

export const deletePrepSession = async (
    sessionId: string,
    id: number,
): Promise<void> => {
    await apiFetch(`/fast50/prep/${id}`, { method: 'DELETE', sessionId });
};

export const getClipUploadUrl = (
    sessionId: string,
    contentType: string,
    contentLength: number,
): Promise<{ uploadUrl: string; videoUrl: string }> =>
    apiFetch('/fast50/prep/upload-url', {
        method: 'POST',
        body: { contentType, contentLength },
        sessionId,
    });
