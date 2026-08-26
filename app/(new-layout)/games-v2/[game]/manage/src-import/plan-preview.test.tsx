// @vitest-environment jsdom
import {
    cleanup,
    fireEvent,
    render,
    screen,
    waitFor,
} from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { SrcCommitPlan } from '../../../../../../types/src-import.types';

vi.mock('./src-import-actions', () => ({
    getSrcImportPlanAction: vi.fn(),
    setSrcImportOverridesAction: vi.fn(),
}));

import { PlanPreview, planHasConflicts } from './plan-preview';
import {
    getSrcImportPlanAction,
    setSrcImportOverridesAction,
} from './src-import-actions';

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

    it('shows conflict entity names and substitutes embedded SRC ids for names', async () => {
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
                        message:
                            "bound to SRC category 'c3', which is not being imported",
                    },
                ],
            }),
        });
        render(<PlanPreview {...props} />);
        // Conflict entity id -> name: c1 -> Any%, v1 -> Platform.
        expect(await screen.findByText(/category “Any%”/)).toBeInTheDocument();
        expect(screen.getByText(/variable “Platform”/)).toBeInTheDocument();
        // Embedded id inside the message -> name: c3 -> Glitchless, and the
        // "not being imported" clause is rewritten in plain words.
        expect(
            screen.getByText(/is scoped to “Glitchless”, which isn’t part/),
        ).toBeInTheDocument();
        // Raw ids no longer leak into the rendered text.
        expect(screen.queryByText(/'c3'/)).not.toBeInTheDocument();
        // New honest footer; the dead-end "on the API" line is gone.
        expect(screen.getByText(/blocks? this import/)).toBeInTheDocument();
        expect(
            screen.queryByText(/Resolve these on the API before applying/),
        ).not.toBeInTheDocument();
    });

    it('rewrites an unresolvable "not being imported" conflict into plain words', async () => {
        // zzz999 is not a staged category, so it is in neither the plan nor the
        // backend's data — its id must not leak into the UI.
        vi.mocked(getSrcImportPlanAction).mockResolvedValue({
            result: plan({
                conflicts: [
                    {
                        kind: 'variable',
                        srcId: 'v1',
                        message:
                            "bound to SRC category 'zzz999', which is not being imported",
                    },
                ],
            }),
        });
        render(<PlanPreview {...props} />);
        expect(
            await screen.findByText(
                /is scoped to a category that isn’t part of this import/,
            ),
        ).toBeInTheDocument();
        expect(screen.queryByText(/zzz999/)).not.toBeInTheDocument();
        expect(screen.queryByText(/SRC category/)).not.toBeInTheDocument();
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

    it('skips a conflict by storing a skip override and reloads the plan', async () => {
        const withConflict = plan({
            conflicts: [
                {
                    kind: 'variable',
                    srcId: 'v1',
                    message:
                        "bound to SRC category 'c3', which is not being imported",
                },
            ],
        });
        const cleared = plan({ conflicts: [] });
        vi.mocked(getSrcImportPlanAction).mockResolvedValue({
            result: withConflict,
        });
        vi.mocked(setSrcImportOverridesAction).mockResolvedValue({
            result: cleared,
        });
        const onPlanLoaded = vi.fn();

        render(<PlanPreview {...props} onPlanLoaded={onPlanLoaded} />);
        const btn = await screen.findByRole('button', {
            name: /Skip & don’t import/,
        });
        fireEvent.click(btn);

        await waitFor(() =>
            expect(setSrcImportOverridesAction).toHaveBeenCalledWith({
                gameId: 12,
                gameSlug: 'sm64',
                jobId: 7,
                overrides: { variables: { v1: { action: 'skip' } } },
            }),
        );
        // Plan reloaded with no conflicts -> the block is gone and Apply's gate
        // (onPlanLoaded) sees the cleared plan.
        await waitFor(() =>
            expect(
                screen.queryByText(/blocks? this import/),
            ).not.toBeInTheDocument(),
        );
        expect(onPlanLoaded).toHaveBeenLastCalledWith(cleared);
    });

    it('surfaces an error and keeps the conflict when the skip fails', async () => {
        vi.mocked(getSrcImportPlanAction).mockResolvedValue({
            result: plan({
                conflicts: [
                    { kind: 'variable', srcId: 'v1', message: 'blocked' },
                ],
            }),
        });
        vi.mocked(setSrcImportOverridesAction).mockResolvedValue({
            error: 'Only the latest import job can be committed',
        });

        render(<PlanPreview {...props} />);
        fireEvent.click(
            await screen.findByRole('button', { name: /Skip & don’t import/ }),
        );

        expect(
            await screen.findByText(
                /Only the latest import job can be committed/,
            ),
        ).toBeInTheDocument();
        // Conflict still present.
        expect(screen.getByText(/blocks? this import/)).toBeInTheDocument();
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
