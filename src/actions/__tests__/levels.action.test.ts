import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
    getSession: vi.fn(),
    createLevel: vi.fn(),
    updateLevel: vi.fn(),
    createLevelTemplate: vi.fn(),
    levelOp: vi.fn(),
    fetchLevelOverview: vi.fn(),
    updateTag: vi.fn(),
}));
vi.mock('~src/actions/session.action', () => ({
    getSession: mocks.getSession,
}));
vi.mock('~src/lib/levels', () => ({
    createLevel: mocks.createLevel,
    updateLevel: mocks.updateLevel,
    createLevelTemplate: mocks.createLevelTemplate,
    levelOp: mocks.levelOp,
    fetchLevelOverview: mocks.fetchLevelOverview,
}));
vi.mock('next/cache', () => ({ updateTag: mocks.updateTag }));

import { ApiError } from '~src/lib/api-client';
import { createLevelAction } from '../levels/create-level.action';
import { createLevelTemplateAction } from '../levels/create-level-template.action';
import { levelOpAction } from '../levels/level-op.action';
import { levelOverviewAction } from '../levels/level-overview.action';
import { updateLevelAction } from '../levels/update-level.action';

const validUser = { id: 'sess', username: 'mod', roles: ['admin'] };

describe('levels actions', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.getSession.mockResolvedValue(validUser);
    });

    describe('createLevelAction', () => {
        it('denies without permission', async () => {
            mocks.getSession.mockResolvedValue(null);
            const r = await createLevelAction({
                gameSlug: 'game',
                gameId: 12,
                name: 'Level 1',
            });
            expect(r).toEqual({
                error: 'Not authorized to manage category groups.',
            });
            expect(mocks.createLevel).not.toHaveBeenCalled();
        });

        it('calls the lib with session id and updates the tag', async () => {
            mocks.createLevel.mockResolvedValue({ id: 5, created: 3 });
            const r = await createLevelAction({
                gameSlug: 'game',
                gameId: 12,
                name: 'Level 1',
                rules: 'no skips',
                sortOrder: 2,
            });
            expect(r).toEqual({ result: { id: 5, created: 3 } });
            expect(mocks.createLevel).toHaveBeenCalledWith('sess', 12, {
                name: 'Level 1',
                rules: 'no skips',
                sortOrder: 2,
            });
            expect(mocks.updateTag).toHaveBeenCalledWith('game-cats:12');
        });

        it('surfaces ApiError message as {error}', async () => {
            mocks.createLevel.mockRejectedValue(new ApiError(400, 'bad name'));
            const r = await createLevelAction({
                gameSlug: 'game',
                gameId: 12,
                name: 'Level 1',
            });
            expect(r).toEqual({ error: 'bad name' });
            expect(mocks.updateTag).not.toHaveBeenCalled();
        });
    });

    describe('updateLevelAction', () => {
        it('denies without permission', async () => {
            mocks.getSession.mockResolvedValue(null);
            const r = await updateLevelAction({
                gameSlug: 'game',
                gameId: 12,
                groupId: 7,
                name: 'Renamed',
            });
            expect(r).toEqual({
                error: 'Not authorized to manage category groups.',
            });
            expect(mocks.updateLevel).not.toHaveBeenCalled();
        });

        it('calls the lib with session id and updates the tag', async () => {
            mocks.updateLevel.mockResolvedValue(undefined);
            const r = await updateLevelAction({
                gameSlug: 'game',
                gameId: 12,
                groupId: 7,
                name: 'Renamed',
                rules: null,
            });
            expect(r).toEqual({ result: undefined });
            expect(mocks.updateLevel).toHaveBeenCalledWith('sess', 12, 7, {
                name: 'Renamed',
                rules: null,
            });
            expect(mocks.updateTag).toHaveBeenCalledWith('game-cats:12');
        });

        it('surfaces ApiError message as {error}', async () => {
            mocks.updateLevel.mockRejectedValue(new ApiError(404, 'not found'));
            const r = await updateLevelAction({
                gameSlug: 'game',
                gameId: 12,
                groupId: 7,
                name: 'Renamed',
            });
            expect(r).toEqual({ error: 'not found' });
            expect(mocks.updateTag).not.toHaveBeenCalled();
        });
    });

    describe('createLevelTemplateAction', () => {
        it('denies without permission', async () => {
            mocks.getSession.mockResolvedValue(null);
            const r = await createLevelTemplateAction({
                gameSlug: 'game',
                gameId: 12,
                display: 'Level Template',
            });
            expect(r).toEqual({
                error: 'Not authorized to manage category groups.',
            });
            expect(mocks.createLevelTemplate).not.toHaveBeenCalled();
        });

        it('calls the lib with session id and updates the tag', async () => {
            mocks.createLevelTemplate.mockResolvedValue({ id: 9, created: 4 });
            const r = await createLevelTemplateAction({
                gameSlug: 'game',
                gameId: 12,
                display: 'Level Template',
                primaryTiming: 'realtime',
                isMain: true,
            });
            expect(r).toEqual({ result: { id: 9, created: 4 } });
            expect(mocks.createLevelTemplate).toHaveBeenCalledWith('sess', 12, {
                display: 'Level Template',
                primaryTiming: 'realtime',
                isMain: true,
            });
            expect(mocks.updateTag).toHaveBeenCalledWith('game-cats:12');
        });

        it('surfaces ApiError message as {error}', async () => {
            mocks.createLevelTemplate.mockRejectedValue(
                new ApiError(400, 'bad template'),
            );
            const r = await createLevelTemplateAction({
                gameSlug: 'game',
                gameId: 12,
                display: 'Level Template',
            });
            expect(r).toEqual({ error: 'bad template' });
            expect(mocks.updateTag).not.toHaveBeenCalled();
        });
    });

    describe('levelOpAction', () => {
        it('denies without permission', async () => {
            mocks.getSession.mockResolvedValue(null);
            const r = await levelOpAction({
                gameSlug: 'game',
                gameId: 12,
                op: { op: 'level-materialise' },
            });
            expect(r).toEqual({
                error: 'Not authorized to manage category groups.',
            });
            expect(mocks.levelOp).not.toHaveBeenCalled();
        });

        it('calls the lib with session id and updates the tag', async () => {
            mocks.levelOp.mockResolvedValue({ ok: true });
            const r = await levelOpAction({
                gameSlug: 'game',
                gameId: 12,
                op: {
                    op: 'level-exclusion',
                    groupId: 1,
                    templateId: 2,
                    excluded: true,
                },
            });
            expect(r).toEqual({ result: { ok: true } });
            expect(mocks.levelOp).toHaveBeenCalledWith('sess', 12, {
                op: 'level-exclusion',
                groupId: 1,
                templateId: 2,
                excluded: true,
            });
            expect(mocks.updateTag).toHaveBeenCalledWith('game-cats:12');
        });

        it('surfaces ApiError message as {error}', async () => {
            mocks.levelOp.mockRejectedValue(new ApiError(409, 'conflict'));
            const r = await levelOpAction({
                gameSlug: 'game',
                gameId: 12,
                op: { op: 'level-resync', categoryId: 3 },
            });
            expect(r).toEqual({ error: 'conflict' });
            expect(mocks.updateTag).not.toHaveBeenCalled();
        });
    });

    describe('levelOverviewAction', () => {
        it('denies without permission', async () => {
            mocks.getSession.mockResolvedValue(null);
            const r = await levelOverviewAction({
                gameSlug: 'game',
                gameId: 12,
            });
            expect(r).toEqual({
                error: 'Not authorized to manage category groups.',
            });
            expect(mocks.fetchLevelOverview).not.toHaveBeenCalled();
        });

        it('calls the lib with session id and does not update any tag', async () => {
            const overview = { levels: [], templates: [] };
            mocks.fetchLevelOverview.mockResolvedValue(overview);
            const r = await levelOverviewAction({
                gameSlug: 'game',
                gameId: 12,
            });
            expect(r).toEqual({ result: overview });
            expect(mocks.fetchLevelOverview).toHaveBeenCalledWith('sess', 12);
            expect(mocks.updateTag).not.toHaveBeenCalled();
        });

        it('surfaces ApiError message as {error}', async () => {
            mocks.fetchLevelOverview.mockRejectedValue(
                new ApiError(500, 'boom'),
            );
            const r = await levelOverviewAction({
                gameSlug: 'game',
                gameId: 12,
            });
            expect(r).toEqual({ error: 'boom' });
        });
    });
});
