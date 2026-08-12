// @vitest-environment jsdom
import {
    cleanup,
    fireEvent,
    render,
    screen,
    waitFor,
} from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ManageCategoryRow } from '~src/lib/category-mgmt';

const mocks = vi.hoisted(() => ({
    curateCategoryAction: vi.fn(async (_input: Record<string, unknown>) => ({
        result: { updated: true },
    })),
}));

vi.mock('../../setup/actions/curate-category.action', () => ({
    curateCategoryAction: mocks.curateCategoryAction,
}));

import { AddCategoryDialog } from './add-category-dialog';

const GAME = { id: 1, name: 'example-game' };

const SEED = {
    primaryTiming: 'gametime' as const,
    gameTimeLabel: 'igt' as const,
    hideRealTime: false,
    hideGameTime: false,
    rulesTemplate: 'No glitches.',
};

function row(patch: Partial<ManageCategoryRow>): ManageCategoryRow {
    return {
        id: 1,
        display: 'Any%',
        sortOrder: 0,
        primaryTiming: 'rt',
        isMain: false,
        active: true,
        groupId: null,
        groupName: null,
        totalRunTime: 0,
        totalFinishedAttemptCount: 0,
        uniqueRunners: 0,
        ...patch,
    } as ManageCategoryRow;
}

const POOL = [
    row({ id: 1, display: 'Quiet route', uniqueRunners: 2 }),
    row({ id: 2, display: 'Busy route', uniqueRunners: 90 }),
];

function renderDialog(
    props: Partial<Parameters<typeof AddCategoryDialog>[0]> = {},
) {
    const onAdded = vi.fn();
    const onClose = vi.fn();
    render(
        <AddCategoryDialog
            open
            onClose={onClose}
            game={GAME}
            pool={POOL}
            seed={SEED}
            rulesEmptyIds={new Set([2])}
            onAdded={onAdded}
            {...props}
        />,
    );
    return { onAdded, onClose };
}

afterEach(() => {
    cleanup();
    vi.clearAllMocks();
});

describe('AddCategoryDialog', () => {
    it('ranks the pool by unique runners', () => {
        // Runner count is the signal setup uses: one prolific runner can
        // inflate raw run count, not the number of people.
        renderDialog();
        const labels = screen
            .getAllByRole('checkbox')
            .map((el) => el.closest('label')?.textContent ?? '');

        expect(labels[0]).toContain('Busy route');
        expect(labels[1]).toContain('Quiet route');
    });

    it('seeds game defaults onto a category as it joins the board', async () => {
        // Featuring a cold category is the same act as the wizard's step 2 —
        // without the seed it lands on the board with no timing and no rules.
        const { onAdded, onClose } = renderDialog();
        // First row is the busiest (id 2), which is also the one whose rules
        // are still empty.
        fireEvent.click(screen.getAllByRole('checkbox')[0]);
        fireEvent.click(screen.getByRole('button', { name: 'Add to board' }));

        await waitFor(() =>
            expect(mocks.curateCategoryAction).toHaveBeenCalledWith(
                expect.objectContaining({
                    categoryId: 2,
                    isMain: true,
                    seed: SEED,
                    currentRulesEmpty: true,
                }),
            ),
        );
        await waitFor(() => expect(onAdded).toHaveBeenCalledWith([2]));
        expect(onClose).toHaveBeenCalled();
    });

    it('features as-is when the console never loaded game metadata', async () => {
        // A moderator without configure has no metadata to seed from; the
        // add must still work rather than write a half-built body.
        renderDialog({ seed: null });
        fireEvent.click(screen.getAllByRole('checkbox')[0]);
        fireEvent.click(screen.getByRole('button', { name: 'Add to board' }));

        await waitFor(() =>
            expect(mocks.curateCategoryAction).toHaveBeenCalled(),
        );
        const body = mocks.curateCategoryAction.mock.calls[0][0];
        expect(body.seed).toBeUndefined();
        expect(body.currentRulesEmpty).toBeUndefined();
    });
});
