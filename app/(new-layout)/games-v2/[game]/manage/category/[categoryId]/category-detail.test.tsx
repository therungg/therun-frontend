// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type {
    ResolvedCategory,
    ResolvedGame,
} from '../../../../../../../types/leaderboards.types';
import type { LevelTemplate } from '../../../../../../../types/levels.types';

const mocks = vi.hoisted(() => ({
    levelOpAction: vi.fn(async () => ({ result: { ok: true } })),
    refresh: vi.fn(),
}));

vi.mock('~src/actions/levels/level-op.action', () => ({
    levelOpAction: mocks.levelOpAction,
}));
vi.mock('next/navigation', () => ({
    useRouter: () => ({ refresh: mocks.refresh }),
}));
// The editor itself is out of scope here — it drags in every settings
// section and their server actions.
vi.mock('../category-editor', () => ({
    CategoryEditor: () => <div data-testid="category-editor" />,
}));

import { CategoryDetail } from './category-detail';

const GAME = {
    id: 1,
    name: 'example-game',
    display: 'Example Game',
} as ResolvedGame;

const TEMPLATE: LevelTemplate = {
    id: 100,
    display: 'Any%',
    rules: null,
    isMain: true,
    sortOrder: 1,
    imageUrl: null,
};

function category(patch: Partial<ResolvedCategory>): ResolvedCategory {
    return {
        id: 1,
        name: 'any',
        display: 'Any%',
        primaryTiming: 'rt',
        archived: false,
        sortOrder: 1,
        ...patch,
    } as ResolvedCategory;
}

function renderDetail(props: {
    category: ResolvedCategory;
    levelTemplates?: LevelTemplate[];
    levelBoardCount?: number;
}) {
    return render(
        <CategoryDetail
            game={GAME}
            category={props.category}
            canConfigure
            canModerate
            canEditStandards
            levelTemplates={props.levelTemplates ?? [TEMPLATE]}
            levelBoardCount={props.levelBoardCount ?? 0}
            prev={null}
            next={null}
        />,
    );
}

afterEach(() => {
    cleanup();
    vi.clearAllMocks();
});

describe('CategoryDetail — level category (template)', () => {
    it('says an edit here lands on every level board', () => {
        renderDetail({
            category: category({ id: 100, display: 'Any%' }),
            levelBoardCount: 2,
        });

        expect(
            screen.getByText(
                'Level category — saved changes apply to 2 level boards',
            ),
        ).toBeTruthy();
        // Nothing to detach: a template has no template of its own.
        expect(screen.queryByRole('button', { name: 'Detach' })).toBeNull();
    });
});

describe('CategoryDetail — level board (instance)', () => {
    it('shows the board as synced and offers Detach', () => {
        renderDetail({
            category: category({
                id: 21,
                display: 'E1M1 — Any%',
                groupId: 10,
                groupName: 'E1M1',
                levelTemplateId: 100,
                levelOverride: false,
            }),
        });

        expect(screen.getByText('Level board of Any% — synced')).toBeTruthy();
        fireEvent.click(screen.getByRole('button', { name: 'Detach' }));
        expect(mocks.levelOpAction).toHaveBeenCalledWith({
            gameSlug: 'example-game',
            gameId: 1,
            op: { op: 'level-detach', categoryId: 21 },
        });
    });

    it('shows a detached board as detached and offers Resync', () => {
        renderDetail({
            category: category({
                id: 21,
                display: 'E1M1 — Any%',
                groupId: 10,
                groupName: 'E1M1',
                levelTemplateId: 100,
                levelOverride: true,
            }),
        });

        expect(screen.getByText('Level board of Any% — detached')).toBeTruthy();
        fireEvent.click(screen.getByRole('button', { name: 'Resync' }));
        expect(mocks.levelOpAction).toHaveBeenCalledWith({
            gameSlug: 'example-game',
            gameId: 1,
            op: { op: 'level-resync', categoryId: 21 },
        });
    });

    it('keeps a failed detach on screen instead of swallowing it', () => {
        mocks.levelOpAction.mockResolvedValueOnce({
            error: 'Not authorized to manage category groups.',
        } as never);
        renderDetail({
            category: category({
                id: 21,
                display: 'E1M1 — Any%',
                levelTemplateId: 100,
                levelOverride: false,
            }),
        });

        fireEvent.click(screen.getByRole('button', { name: 'Detach' }));

        return screen
            .findByText('Not authorized to manage category groups.')
            .then((el) => {
                expect(el).toBeTruthy();
                expect(mocks.refresh).not.toHaveBeenCalled();
            });
    });

    it('warns that editing a synced board detaches it', () => {
        renderDetail({
            category: category({
                id: 21,
                display: 'E1M1 — Any%',
                levelTemplateId: 100,
                levelOverride: false,
            }),
        });

        expect(
            screen.getByText(
                'Editing any field here detaches this board from its template.',
            ),
        ).toBeTruthy();
    });
});

describe('CategoryDetail — ordinary category', () => {
    it('says nothing about levels', () => {
        renderDetail({ category: category({ id: 7, display: '120 Star' }) });

        expect(screen.queryByText(/Level board of/)).toBeNull();
        expect(screen.queryByText(/Level category/)).toBeNull();
    });
});
