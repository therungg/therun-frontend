// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { SrcCommitPlan } from '../../../../../../types/src-import.types';

vi.mock('./src-import-actions', () => ({
    getSrcImportPlanAction: vi.fn(),
}));

import { PlanPreview, planHasConflicts } from './plan-preview';
import { getSrcImportPlanAction } from './src-import-actions';

const plan = (over: Partial<SrcCommitPlan> = {}): SrcCommitPlan => ({
    categories: [
        { srcId: 'c1', name: 'Any%', type: 'per-game', action: 'create' },
        { srcId: 'c2', name: '100%', type: 'per-game', action: 'reuse' },
        { srcId: 'c3', name: 'Glitchless', type: 'per-game', action: 'skip' },
    ],
    levels: [{ srcId: 'l1', name: 'Level 1', action: 'create' }],
    variables: [
        {
            srcId: 'v1',
            name: 'Platform',
            role: 'filter',
            scope: 'full-game',
            targets: [],
            action: 'reuse',
            values: [],
        },
    ],
    conflicts: [],
    runs: {
        total: 100,
        byStatus: { verified: 80, new: 20 },
        guests: 5,
        matched: 90,
        unmappable: 2,
    },
    ...over,
});

const props = { gameId: 12, gameSlug: 'sm64', jobId: 7 };

describe('PlanPreview', () => {
    afterEach(() => {
        cleanup();
        vi.clearAllMocks();
    });

    it('renders conflicts and the resolve note when the plan has conflicts', async () => {
        vi.mocked(getSrcImportPlanAction).mockResolvedValue({
            result: plan({
                conflicts: [
                    {
                        kind: 'category',
                        srcId: 'c1',
                        message: 'Name collides with an existing category',
                    },
                    {
                        kind: 'variable',
                        srcId: 'v1',
                        message: 'Ambiguous target',
                    },
                ],
            }),
        });
        render(<PlanPreview {...props} />);
        expect(
            await screen.findByText(
                /category c1: Name collides with an existing category/,
            ),
        ).toBeInTheDocument();
        expect(
            screen.getByText(/variable v1: Ambiguous target/),
        ).toBeInTheDocument();
        expect(
            screen.getByText(/Resolve these on the API before applying/),
        ).toBeInTheDocument();
    });

    it('renders counts with no conflict note when there are zero conflicts', async () => {
        vi.mocked(getSrcImportPlanAction).mockResolvedValue({
            result: plan(),
        });
        render(<PlanPreview {...props} />);
        await waitFor(() =>
            expect(getSrcImportPlanAction).toHaveBeenCalledWith({
                gameId: 12,
                gameSlug: 'sm64',
                jobId: 7,
            }),
        );
        expect(
            await screen.findByText('Categories: create'),
        ).toBeInTheDocument();
        expect(screen.getByText('Categories: reuse')).toBeInTheDocument();
        expect(screen.getByText('Categories: skip')).toBeInTheDocument();
        expect(screen.getByText('Runs total')).toBeInTheDocument();
        expect(
            screen.queryByText(/Resolve these on the API before applying/),
        ).not.toBeInTheDocument();
    });

    it('shows an inline error when the plan fails to load', async () => {
        vi.mocked(getSrcImportPlanAction).mockResolvedValue({
            error: 'Not found',
        });
        render(<PlanPreview {...props} />);
        expect(await screen.findByText('Not found')).toBeInTheDocument();
    });

    it('calls onPlanLoaded once the plan resolves', async () => {
        const onPlanLoaded = vi.fn();
        const loaded = plan();
        vi.mocked(getSrcImportPlanAction).mockResolvedValue({ result: loaded });
        render(<PlanPreview {...props} onPlanLoaded={onPlanLoaded} />);
        await waitFor(() => expect(onPlanLoaded).toHaveBeenCalledWith(loaded));
    });
});

describe('planHasConflicts', () => {
    it('is true iff conflicts is non-empty', () => {
        expect(planHasConflicts(plan())).toBe(false);
        expect(
            planHasConflicts(
                plan({
                    conflicts: [{ kind: 'level', srcId: 'l1', message: 'x' }],
                }),
            ),
        ).toBe(true);
    });
});
