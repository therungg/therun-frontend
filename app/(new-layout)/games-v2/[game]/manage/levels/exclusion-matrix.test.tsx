// @vitest-environment jsdom
import {
    cleanup,
    fireEvent,
    render,
    screen,
    waitFor,
} from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { LevelOverview } from '../../../../../../types/levels.types';

vi.mock('~src/actions/levels/level-op.action', () => ({
    levelOpAction: vi.fn(async () => ({ result: {} })),
}));

import { levelOpAction } from '~src/actions/levels/level-op.action';
import { ExclusionMatrix, isIncluded } from './exclusion-matrix';

afterEach(() => {
    cleanup();
    vi.clearAllMocks();
});

function noop() {
    return Promise.resolve();
}

const templates: LevelOverview['templates'] = [
    {
        id: 1,
        display: 'Any%',
        isMain: true,
        synced: 1,
        overridden: 0,
        excluded: 1,
        total: 2,
    },
];

const levels: LevelOverview['levels'] = [
    {
        id: 10,
        name: 'E1M1',
        rules: null,
        sortOrder: 0,
        instances: [
            {
                categoryId: 100,
                templateId: 1,
                state: 'synced',
                display: 'E1M1 — Any%',
            },
        ],
    },
    {
        id: 11,
        name: 'E1M2',
        rules: null,
        sortOrder: 1,
        instances: [
            {
                categoryId: 101,
                templateId: 1,
                state: 'excluded',
                display: 'E1M2 — Any%',
            },
        ],
    },
];

describe('isIncluded', () => {
    it('is true when the instance is synced', () => {
        expect(isIncluded(levels[0], 1)).toBe(true);
    });
    it('is false when the instance is excluded', () => {
        expect(isIncluded(levels[1], 1)).toBe(false);
    });
    it('is true when there is no instance at all (nothing to exclude yet)', () => {
        expect(isIncluded({ ...levels[0], instances: [] }, 1)).toBe(true);
    });
});

describe('ExclusionMatrix', () => {
    it('renders nothing with no levels or no templates', () => {
        const { container: a } = render(
            <ExclusionMatrix
                gameId={1}
                gameSlug="g"
                levels={[]}
                templates={templates}
                onChanged={noop}
            />,
        );
        expect(a.firstChild).toBeNull();

        const { container: b } = render(
            <ExclusionMatrix
                gameId={1}
                gameSlug="g"
                levels={levels}
                templates={[]}
                onChanged={noop}
            />,
        );
        expect(b.firstChild).toBeNull();
    });

    it('renders one row per level and one column per template, checked by inclusion', () => {
        render(
            <ExclusionMatrix
                gameId={1}
                gameSlug="g"
                levels={levels}
                templates={templates}
                onChanged={noop}
            />,
        );
        expect(screen.getByText('E1M1')).toBeTruthy();
        expect(screen.getByText('E1M2')).toBeTruthy();
        expect(screen.getByText('Any%')).toBeTruthy();
        expect(
            (screen.getByLabelText('Any% for E1M1') as HTMLInputElement)
                .checked,
        ).toBe(true);
        expect(
            (screen.getByLabelText('Any% for E1M2') as HTMLInputElement)
                .checked,
        ).toBe(false);
    });

    it('toggling a cell calls level-exclusion with the inverse of its current state', async () => {
        const onChanged = vi.fn(noop);
        render(
            <ExclusionMatrix
                gameId={1}
                gameSlug="g"
                levels={levels}
                templates={templates}
                onChanged={onChanged}
            />,
        );
        fireEvent.click(screen.getByLabelText('Any% for E1M1'));

        await waitFor(() =>
            expect(levelOpAction).toHaveBeenCalledWith({
                gameSlug: 'g',
                gameId: 1,
                op: {
                    op: 'level-exclusion',
                    groupId: 10,
                    templateId: 1,
                    excluded: true,
                },
            }),
        );
        await waitFor(() => expect(onChanged).toHaveBeenCalled());
    });

    it('surfaces the action error instead of reloading', async () => {
        const onChanged = vi.fn(noop);
        vi.mocked(levelOpAction).mockResolvedValueOnce({
            error: 'Not authorized to manage category groups.',
        });
        render(
            <ExclusionMatrix
                gameId={1}
                gameSlug="g"
                levels={levels}
                templates={templates}
                onChanged={onChanged}
            />,
        );
        fireEvent.click(screen.getByLabelText('Any% for E1M1'));

        expect(
            await screen.findByText(
                'Not authorized to manage category groups.',
            ),
        ).toBeTruthy();
        expect(onChanged).not.toHaveBeenCalled();
    });

    it('names each level row as a row header', () => {
        render(
            <ExclusionMatrix
                gameId={1}
                gameSlug="g"
                levels={levels}
                templates={templates}
                onChanged={noop}
            />,
        );
        expect(screen.getByRole('rowheader', { name: 'E1M1' })).toBeTruthy();
    });
});
