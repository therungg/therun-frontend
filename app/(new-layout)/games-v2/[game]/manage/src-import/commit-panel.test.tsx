// @vitest-environment jsdom
import {
    cleanup,
    fireEvent,
    render,
    screen,
    waitFor,
} from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type {
    SrcCommitPlan,
    SrcImportJob,
} from '../../../../../../types/src-import.types';

vi.mock('./src-import-actions', () => ({
    applyConfigAction: vi.fn(async () => ({ result: { jobId: 7 } })),
    importRunsAction: vi.fn(async () => ({ result: { jobId: 7 } })),
    undoRunsAction: vi.fn(async () => ({ result: { jobId: 7 } })),
    undoConfigAction: vi.fn(async () => ({ result: { jobId: 7 } })),
    reconcileAction: vi.fn(async () => ({ result: { jobId: 7 } })),
    reconcileUndoAction: vi.fn(async () => ({ result: { jobId: 7 } })),
    setSrcOnlyAction: vi.fn(async () => ({
        result: { jobId: 7, srcOnlyLeaderboard: true },
    })),
    getSrcImportPlanAction: vi.fn(async () => ({ result: emptyPlan() })),
}));

import { CommitPanel, getCommitViewModel } from './commit-panel';
import {
    applyConfigAction,
    getSrcImportPlanAction,
    importRunsAction,
    reconcileAction,
    reconcileUndoAction,
} from './src-import-actions';

function emptyPlan(over: Partial<SrcCommitPlan> = {}): SrcCommitPlan {
    return {
        categories: [],
        levels: [],
        variables: [],
        conflicts: [],
        runs: {
            total: 0,
            byStatus: { verified: 0, new: 0 },
            guests: 0,
            matched: 0,
            unmappable: 0,
        },
        ...over,
    };
}

const job = (over: Partial<SrcImportJob> = {}): SrcImportJob => ({
    id: 7,
    gameId: 12,
    srcGameId: 'o1y9wo6q',
    srcGameAbbreviation: 'sm64',
    srcGameName: 'Super Mario 64',
    srcUrl: 'https://www.speedrun.com/sm64',
    requestedBy: 1,
    status: 'done',
    phase: 'done',
    checkpoint: null,
    categoriesCount: 6,
    levelsCount: 0,
    variablesCount: 2,
    runsCount: 1234,
    playersCount: 0,
    playersMatchedCount: 0,
    requestsMade: 90,
    estimatedRequests: null,
    error: null,
    startedAt: '2026-08-19T08:00:00.000Z',
    finishedAt: '2026-08-19T08:30:00.000Z',
    createdAt: '2026-08-19T08:00:00.000Z',
    commitStatus: null,
    commitPhase: null,
    importedRunsCount: 0,
    importSkippedCount: 0,
    configAppliedAt: null,
    runsImportedAt: null,
    srcOnlyLeaderboard: false,
    ...over,
});

const props = { gameId: 12, gameSlug: 'sm64', onChanged: vi.fn() };

describe('CommitPanel', () => {
    afterEach(() => {
        cleanup();
        vi.clearAllMocks();
    });

    it('shows Apply config when done + no commitStatus', () => {
        render(<CommitPanel job={job()} {...props} />);
        expect(
            screen.getByRole('button', { name: /apply config/i }),
        ).toBeEnabled();
    });

    it('calls applyConfigAction and onChanged on Apply config', async () => {
        const onChanged = vi.fn();
        render(
            <CommitPanel
                job={job()}
                gameId={12}
                gameSlug="sm64"
                onChanged={onChanged}
            />,
        );
        fireEvent.click(screen.getByRole('button', { name: /apply config/i }));
        await waitFor(() =>
            expect(applyConfigAction).toHaveBeenCalledWith({
                gameId: 12,
                gameSlug: 'sm64',
                jobId: 7,
            }),
        );
        await waitFor(() => expect(onChanged).toHaveBeenCalled());
    });

    it('shows a spinner while applying', () => {
        render(
            <CommitPanel job={job({ commitStatus: 'applying' })} {...props} />,
        );
        expect(screen.getByText(/applying configuration/i)).toBeInTheDocument();
        expect(
            screen.queryByRole('button', { name: /apply config/i }),
        ).not.toBeInTheDocument();
    });

    it('shows Import runs + the SRC-only checkbox when applied', () => {
        render(
            <CommitPanel
                job={job({
                    commitStatus: 'applied',
                    configAppliedAt: '2026-08-19T09:00:00.000Z',
                })}
                {...props}
            />,
        );
        expect(
            screen.getByRole('button', { name: /import runs/i }),
        ).toBeEnabled();
        expect(
            screen.getByRole('checkbox', {
                name: /only use the speedrun\.com leaderboard/i,
            }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('button', { name: /undo config/i }),
        ).toBeEnabled();
    });

    it('shows import progress while importing', () => {
        render(
            <CommitPanel job={job({ commitStatus: 'importing' })} {...props} />,
        );
        expect(screen.getByText(/importing runs/i)).toBeInTheDocument();
    });

    it('shows Undo runs when imported', () => {
        render(
            <CommitPanel
                job={job({
                    commitStatus: 'imported',
                    runsImportedAt: '2026-08-19T09:30:00.000Z',
                })}
                {...props}
            />,
        );
        expect(
            screen.getByRole('button', { name: /undo runs/i }),
        ).toBeEnabled();
    });

    it('shows Reverse SRC-only when reconciled', () => {
        render(
            <CommitPanel
                job={job({ commitStatus: 'reconciled' })}
                {...props}
            />,
        );
        expect(
            screen.getByRole('button', {
                name: /reverse src-only leaderboard/i,
            }),
        ).toBeEnabled();
    });

    it('blocks Undo runs while reconciled with the reverse-first hint', () => {
        render(
            <CommitPanel
                job={job({ commitStatus: 'reconciled' })}
                {...props}
            />,
        );
        expect(
            screen.getByRole('button', { name: /undo runs/i }),
        ).toBeDisabled();
        expect(
            screen.getByText(/reverse the src-only leaderboard first/i),
        ).toBeInTheDocument();
    });

    it('calls reconcileUndoAction on Reverse SRC-only leaderboard', async () => {
        const onChanged = vi.fn();
        render(
            <CommitPanel
                job={job({ commitStatus: 'reconciled' })}
                gameId={12}
                gameSlug="sm64"
                onChanged={onChanged}
            />,
        );
        fireEvent.click(
            screen.getByRole('button', {
                name: /reverse src-only leaderboard/i,
            }),
        );
        await waitFor(() =>
            expect(reconcileUndoAction).toHaveBeenCalledWith({
                gameId: 12,
                gameSlug: 'sm64',
                jobId: 7,
            }),
        );
        await waitFor(() => expect(onChanged).toHaveBeenCalled());
    });

    it('shows reconcile progress while reconciling', () => {
        render(
            <CommitPanel
                job={job({ commitStatus: 'reconciling' })}
                {...props}
            />,
        );
        expect(screen.getByText(/reconciling/i)).toBeInTheDocument();
    });

    it('shows the error and the retry button for the failed phase', async () => {
        render(
            <CommitPanel
                job={job({
                    commitStatus: 'failed',
                    commitPhase: 'runs',
                    error: 'speedrun.com timed out',
                })}
                {...props}
            />,
        );
        expect(screen.getByText('speedrun.com timed out')).toBeInTheDocument();
        const retry = screen.getByRole('button', {
            name: /retry import runs/i,
        });
        expect(retry).toBeEnabled();
        fireEvent.click(retry);
        await waitFor(() =>
            expect(importRunsAction).toHaveBeenCalledWith({
                gameId: 12,
                gameSlug: 'sm64',
                jobId: 7,
            }),
        );
    });

    it('surfaces an action error inline without crashing', async () => {
        vi.mocked(applyConfigAction).mockResolvedValueOnce({
            error: 'Plan has conflicts',
        });
        render(<CommitPanel job={job()} {...props} />);
        fireEvent.click(screen.getByRole('button', { name: /apply config/i }));
        expect(
            await screen.findByText('Plan has conflicts'),
        ).toBeInTheDocument();
    });

    it('renders PlanPreview and disables Apply when the plan has conflicts', async () => {
        vi.mocked(getSrcImportPlanAction).mockResolvedValueOnce({
            result: emptyPlan({
                conflicts: [
                    { kind: 'category', srcId: 'cat1', message: 'ambiguous' },
                ],
            }),
        });
        render(<CommitPanel job={job()} {...props} />);
        await screen.findByText(/ambiguous/i);
        expect(
            screen.getByRole('button', { name: /apply config/i }),
        ).toBeDisabled();
    });

    it('enables Apply when the loaded plan has no conflicts', async () => {
        vi.mocked(getSrcImportPlanAction).mockResolvedValueOnce({
            result: emptyPlan(),
        });
        render(<CommitPanel job={job()} {...props} />);
        await waitFor(() => expect(getSrcImportPlanAction).toHaveBeenCalled());
        expect(
            await screen.findByRole('button', { name: /apply config/i }),
        ).toBeEnabled();
    });

    it('auto-fires reconcile exactly once for a src-only imported job', async () => {
        const onChanged = vi.fn();
        const { rerender } = render(
            <CommitPanel
                job={job({
                    commitStatus: 'imported',
                    srcOnlyLeaderboard: true,
                })}
                gameId={12}
                gameSlug="sm64"
                onChanged={onChanged}
            />,
        );
        await waitFor(() =>
            expect(reconcileAction).toHaveBeenCalledWith({
                gameId: 12,
                gameSlug: 'sm64',
                jobId: 7,
            }),
        );
        await waitFor(() => expect(onChanged).toHaveBeenCalled());

        // A re-render with the same still-'imported' job (as the poll would
        // produce before commitStatus flips to 'reconciling') must not
        // re-fire the action.
        rerender(
            <CommitPanel
                job={job({
                    commitStatus: 'imported',
                    srcOnlyLeaderboard: true,
                })}
                gameId={12}
                gameSlug="sm64"
                onChanged={onChanged}
            />,
        );
        await new Promise((r) => setTimeout(r, 0));
        expect(reconcileAction).toHaveBeenCalledTimes(1);
    });

    it('does not auto-fire reconcile when srcOnlyLeaderboard is false', async () => {
        render(
            <CommitPanel
                job={job({
                    commitStatus: 'imported',
                    srcOnlyLeaderboard: false,
                })}
                {...props}
            />,
        );
        await new Promise((r) => setTimeout(r, 0));
        expect(reconcileAction).not.toHaveBeenCalled();
    });
});

describe('getCommitViewModel', () => {
    it('maps every commitStatus to a distinct primary/progress state', () => {
        expect(getCommitViewModel(job()).primary?.action).toBe('apply-config');
        expect(
            getCommitViewModel(job({ commitStatus: 'applying' })).progressLabel,
        ).toMatch(/applying/i);
        expect(
            getCommitViewModel(job({ commitStatus: 'applied' })).showCheckbox,
        ).toBe(true);
        expect(
            getCommitViewModel(job({ commitStatus: 'importing' }))
                .progressLabel,
        ).toMatch(/importing/i);
        expect(
            getCommitViewModel(job({ commitStatus: 'imported' })).primary
                ?.action,
        ).toBe('undo-runs');
        expect(
            getCommitViewModel(job({ commitStatus: 'reconciling' }))
                .progressLabel,
        ).toMatch(/reconciling/i);
        const reconciled = getCommitViewModel(
            job({ commitStatus: 'reconciled' }),
        );
        expect(reconciled.primary?.action).toBe('reconcile-undo');
        expect(reconciled.secondary[0]).toEqual({
            action: 'undo-runs',
            label: 'Undo runs',
            disabled: true,
        });
    });

    it('picks the retry action from commitPhase when failed', () => {
        expect(
            getCommitViewModel(
                job({ commitStatus: 'failed', commitPhase: 'config' }),
            ).primary?.action,
        ).toBe('apply-config');
        expect(
            getCommitViewModel(
                job({ commitStatus: 'failed', commitPhase: 'runs' }),
            ).primary?.action,
        ).toBe('import-runs');
        expect(
            getCommitViewModel(
                job({ commitStatus: 'failed', commitPhase: 'reconcile' }),
            ).primary?.action,
        ).toBe('reconcile');
    });
});
