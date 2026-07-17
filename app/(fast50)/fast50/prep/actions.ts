'use server';

import { getSession } from '~src/actions/session.action';
import {
    createPrepSession,
    deletePrepSession,
    getPrepSession,
    getUploadUrl,
    listPrepSessions,
    updatePrepSession,
} from '~src/lib/fast50/prep';
import {
    emptyPrepData,
    type PrepSession,
    type PrepSessionData,
    type PrepSessionSummary,
} from '~src/lib/fast50/prep.types';

export const listSessionsAction = async (
    username: string,
    game: string,
    category: string,
): Promise<PrepSessionSummary[]> => {
    const user = await getSession();
    if (!user.id) return [];
    return listPrepSessions(user.id, username, game, category);
};

export const loadPrepAction = async (id: number): Promise<PrepSession> => {
    const user = await getSession();
    return getPrepSession(user.id, id);
};

export const createPrepAction = async (input: {
    username: string;
    game: string;
    category: string;
    label: string;
    data?: PrepSessionData;
}): Promise<PrepSession> => {
    const user = await getSession();
    return createPrepSession(user.id, {
        ...input,
        data: input.data ?? emptyPrepData(),
    });
};

export const savePrepAction = async (
    id: number,
    input: { label?: string; data?: PrepSessionData },
): Promise<PrepSession> => {
    const user = await getSession();
    return updatePrepSession(user.id, id, input);
};

export const deletePrepAction = async (id: number): Promise<void> => {
    const user = await getSession();
    await deletePrepSession(user.id, id);
};

export const uploadUrlAction = async (
    contentType: string,
    contentLength: number,
): Promise<{ uploadUrl: string; url: string; videoUrl: string }> => {
    const user = await getSession();
    return getUploadUrl(user.id, contentType, contentLength);
};
