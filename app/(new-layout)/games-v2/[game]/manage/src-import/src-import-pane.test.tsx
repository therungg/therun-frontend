// @vitest-environment jsdom
import {
    act,
    cleanup,
    fireEvent,
    render,
    screen,
    waitFor,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type {
    SrcImportJob,
    SrcImportRun,
} from '../../../../../../types/src-import.types';

vi.mock('./src-import-actions', () => ({
    getSrcImportJobAction: vi.fn(),
    startSrcImportAction: vi.fn(),
    listSrcImportCategoriesAction: vi.fn(async () => ({ result: [] })),
    listSrcImportLevelsAction: vi.fn(async () => ({ result: [] })),
    listSrcImportVariablesAction: vi.fn(async () => ({ result: [] })),
    listSrcImportPlayersAction: vi.fn(async () => ({
        result: { items: [], total: 0 },
    })),
    listSrcImportRunsAction: vi.fn(async () => ({
        result: { items: [], total: 0 },
    })),
    getSrcImportPlanAction: vi.fn(async () => ({
        result: {
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
        },
    })),
    applyConfigAction: vi.fn(async () => ({ result: { jobId: 7 } })),
    importRunsAction: vi.fn(async () => ({ result: { jobId: 7 } })),
    undoRunsAction: vi.fn(async () => ({ result: { jobId: 7 } })),
    undoConfigAction: vi.fn(async () => ({ result: { jobId: 7 } })),
    reconcileAction: vi.fn(async () => ({ result: { jobId: 7 } })),
    reconcileUndoAction: vi.fn(async () => ({ result: { jobId: 7 } })),
}));

import { primaryTime, runPlayerLabel } from './review-tabs';
import {
    getSrcImportJobAction,
    listSrcImportCategoriesAction,
    listSrcImportRunsAction,
    startSrcImportAction,
} from './src-import-actions';
import { SrcImportPane, srcUrlFromInput } from './src-import-pane';
import { POLL_MS } from './use-src-import-job';

const job = (over: Partial<SrcImportJob> = {}): SrcImportJob => ({
    id: 7,
    gameId: 12,
    srcGameId: 'o1y9wo6q',
    srcGameAbbreviation: 'sm64',
    srcGameName: 'Super Mario 64',
    srcUrl: 'https://www.speedrun.com/sm64',
    requestedBy: 1,
    status: 'running',
    phase: 'runs',
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
    finishedAt: null,
    createdAt: '2026-08-19T08:00:00.000Z',
    commitStatus: null,
    commitPhase: null,
    importedRunsCount: 0,
    importSkippedCount: 0,
    configAppliedAt: null,
    runsImportedAt: null,
    srcOnlyLeaderboard: false,
    kind: 'manual',
    changeSummary: null,
    commitFlags: null,
    ...over,
});

const props = { gameId: 12, gameSlug: 'sm64', gameDisplay: 'Super Mario 64' };

describe('SrcImportPane', () => {
    beforeEach(() => {
        vi.mocked(getSrcImportJobAction).mockResolvedValue({ result: null });
        vi.mocked(startSrcImportAction).mockReset();
    });
    afterEach(() => {
        cleanup();
        vi.clearAllMocks();
        vi.useRealTimers();
    });

    it('offers the URL form when the game has no import yet', async () => {
        render(<SrcImportPane {...props} />);
        await waitFor(() =>
            expect(getSrcImportJobAction).toHaveBeenCalledWith({
                gameId: 12,
                gameSlug: 'sm64',
            }),
        );
        expect(
            screen.getByRole('button', { name: 'Fetch board' }),
        ).toBeDisabled();
        fireEvent.change(screen.getByLabelText('speedrun.com game URL'), {
            target: { value: 'sm64' },
        });
        expect(
            screen.getByRole('button', { name: 'Fetch board' }),
        ).toBeEnabled();
        expect(
            screen.getByText(/reviewing the board below is a dry run/i),
        ).toBeInTheDocument();
    });

    it('starts an import and shows the resulting job', async () => {
        vi.mocked(startSrcImportAction).mockResolvedValue({
            result: { jobId: 7 },
        });
        vi.mocked(getSrcImportJobAction)
            .mockResolvedValueOnce({ result: null })
            .mockResolvedValue({ result: job({ status: 'queued' }) });
        render(<SrcImportPane {...props} />);
        await waitFor(() => expect(getSrcImportJobAction).toHaveBeenCalled());

        fireEvent.change(screen.getByLabelText('speedrun.com game URL'), {
            target: { value: 'sm64' },
        });
        fireEvent.click(screen.getByRole('button', { name: 'Fetch board' }));

        await waitFor(() =>
            expect(startSrcImportAction).toHaveBeenCalledWith({
                gameId: 12,
                gameSlug: 'sm64',
                url: 'https://www.speedrun.com/sm64',
            }),
        );
        await screen.findByText('queued');
        expect(screen.getByText('Super Mario 64')).toBeInTheDocument();
        // A queued/running job disables a second submit.
        expect(
            screen.getByRole('button', { name: 'Fetch board' }),
        ).toBeDisabled();
    });

    it('surfaces the backend refusal inline', async () => {
        vi.mocked(startSrcImportAction).mockResolvedValue({
            error: 'Not a speedrun.com moderator of this game',
        });
        render(<SrcImportPane {...props} />);
        await waitFor(() => expect(getSrcImportJobAction).toHaveBeenCalled());
        fireEvent.change(screen.getByLabelText('speedrun.com game URL'), {
            target: { value: 'sm64' },
        });
        fireEvent.click(screen.getByRole('button', { name: 'Fetch board' }));
        expect(
            await screen.findByText(
                'Not a speedrun.com moderator of this game',
            ),
        ).toBeInTheDocument();
    });

    it('polls a running job until it finishes, then shows the review tabs', async () => {
        vi.useFakeTimers({ shouldAdvanceTime: true });
        vi.mocked(getSrcImportJobAction)
            .mockResolvedValueOnce({ result: job({ status: 'running' }) })
            .mockResolvedValue({
                result: job({
                    status: 'done',
                    phase: 'done',
                    finishedAt: '2026-08-19T08:30:00.000Z',
                }),
            });
        render(<SrcImportPane {...props} />);
        expect(await screen.findByText('running')).toBeInTheDocument();
        expect(getSrcImportJobAction).toHaveBeenCalledTimes(1);

        await act(async () => {
            await vi.advanceTimersByTimeAsync(POLL_MS + 50);
        });
        expect(getSrcImportJobAction).toHaveBeenCalledTimes(2);
        expect(await screen.findByText('done')).toBeInTheDocument();
        // Terminal: no further polls.
        await act(async () => {
            await vi.advanceTimersByTimeAsync(POLL_MS * 2);
        });
        expect(getSrcImportJobAction).toHaveBeenCalledTimes(2);

        // Review tabs mount and load categories for the finished job.
        await waitFor(() =>
            expect(listSrcImportCategoriesAction).toHaveBeenCalledWith({
                gameId: 12,
                gameSlug: 'sm64',
                jobId: 7,
            }),
        );
        expect(screen.getByRole('radio', { name: 'Runs' })).toBeInTheDocument();

        // CommitPanel mounts alongside the review tabs.
        expect(
            await screen.findByRole('button', { name: /apply config/i }),
        ).toBeInTheDocument();
    });

    it('shows percentage + time left while running, from the request estimate', async () => {
        vi.mocked(getSrcImportJobAction).mockResolvedValue({
            result: job({ status: 'running', estimatedRequests: 600 }),
        });
        render(<SrcImportPane {...props} />);
        // 90 of 600 requests → 15%, 510 requests ≈ 510s ≈ 9m left.
        expect(await screen.findByText('15%')).toBeInTheDocument();
        expect(screen.getByText('~9m left')).toBeInTheDocument();
        expect(screen.getByRole('progressbar')).toHaveAttribute(
            'aria-valuenow',
            '15',
        );
    });

    it('shows no percentage when the estimate is missing', async () => {
        vi.mocked(getSrcImportJobAction).mockResolvedValue({
            result: job({ status: 'running' }),
        });
        render(<SrcImportPane {...props} />);
        await screen.findByText(/Phase:/);
        expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    });

    it('labels the players and runs phases', async () => {
        vi.useFakeTimers({ shouldAdvanceTime: true });
        vi.mocked(getSrcImportJobAction)
            .mockResolvedValueOnce({
                result: job({ status: 'running', phase: 'players' }),
            })
            .mockResolvedValue({
                result: job({
                    status: 'running',
                    phase: 'runs',
                    playersMatchedCount: 3,
                }),
            });
        render(<SrcImportPane {...props} />);
        expect(
            await screen.findByText(/finding runners on the board/i),
        ).toBeInTheDocument();

        await act(async () => {
            await vi.advanceTimersByTimeAsync(POLL_MS + 50);
        });
        expect(
            await screen.findByText(/fetching runs of 3 runners/i),
        ).toBeInTheDocument();
    });

    it('shows the failure reason for a failed job and allows a retry', async () => {
        vi.mocked(getSrcImportJobAction).mockResolvedValue({
            result: job({ status: 'failed', error: 'SRC returned 500' }),
        });
        render(<SrcImportPane {...props} />);
        expect(
            await screen.findByText(/Import failed: SRC returned 500/),
        ).toBeInTheDocument();
        fireEvent.change(screen.getByLabelText('speedrun.com game URL'), {
            target: { value: 'sm64' },
        });
        expect(
            screen.getByRole('button', { name: 'Fetch board' }),
        ).toBeEnabled();
    });

    it('fetches runs with the chosen category and status filters', async () => {
        vi.mocked(getSrcImportJobAction).mockResolvedValue({
            result: job({ status: 'done', phase: 'done' }),
        });
        vi.mocked(listSrcImportCategoriesAction).mockResolvedValue({
            result: [
                {
                    id: 1,
                    jobId: 7,
                    srcId: 'cat120',
                    name: '120 Star',
                    rules: null,
                    type: 'per-game',
                    defaultTiming: 'realtime',
                    misc: false,
                    sortOrder: 0,
                    skipped: false,
                },
            ],
        });
        render(<SrcImportPane {...props} />);
        await screen.findByText('120 Star');
        fireEvent.click(screen.getByRole('radio', { name: 'Runs' }));
        await waitFor(() =>
            expect(listSrcImportRunsAction).toHaveBeenCalledWith(
                expect.objectContaining({
                    jobId: 7,
                    query: {
                        categoryId: undefined,
                        levelId: undefined,
                        status: undefined,
                        page: 1,
                        pageSize: 100,
                    },
                }),
            ),
        );
        fireEvent.change(screen.getByLabelText('Category'), {
            target: { value: 'cat120' },
        });
        fireEvent.click(screen.getByRole('radio', { name: 'Verified' }));
        await waitFor(() =>
            expect(listSrcImportRunsAction).toHaveBeenLastCalledWith(
                expect.objectContaining({
                    query: {
                        categoryId: 'cat120',
                        levelId: undefined,
                        status: 'verified',
                        page: 1,
                        pageSize: 100,
                    },
                }),
            ),
        );
    });
});

describe('primaryTime', () => {
    const run = (over: Partial<SrcImportRun>): SrcImportRun =>
        ({
            realtimeMs: null,
            realtimeNoloadsMs: null,
            ingameMs: null,
            ...over,
        }) as SrcImportRun;

    it('prefers real time, then in-game, then no-loads', () => {
        expect(primaryTime(run({ realtimeMs: 61000, ingameMs: 1 }))).toBe(
            primaryTime(run({ realtimeMs: 61000 })),
        );
        expect(primaryTime(run({ ingameMs: 61000 }))).not.toBe('—');
        expect(primaryTime(run({ realtimeNoloadsMs: 61000 }))).not.toBe('—');
        expect(primaryTime(run({}))).toBe('—');
    });
});

describe('srcUrlFromInput', () => {
    it('joins the abbreviation onto the canonical prefix', () => {
        expect(srcUrlFromInput('sm64')).toBe('https://www.speedrun.com/sm64');
        expect(srcUrlFromInput('  /sm64 ')).toBe(
            'https://www.speedrun.com/sm64',
        );
    });

    it('accepts a pasted full URL without doubling the host', () => {
        expect(srcUrlFromInput('https://www.speedrun.com/sm64')).toBe(
            'https://www.speedrun.com/sm64',
        );
        expect(srcUrlFromInput('speedrun.com/sm64/full_game')).toBe(
            'https://www.speedrun.com/sm64/full_game',
        );
    });

    it('is empty when nothing useful was typed', () => {
        expect(srcUrlFromInput('')).toBe('');
        expect(srcUrlFromInput('https://www.speedrun.com/')).toBe('');
    });
});

describe('runPlayerLabel', () => {
    it('shows the staged name, falls back to the SRC id, flags guests', () => {
        expect(
            runPlayerLabel({
                srcUserId: 'j59qw1qx',
                name: 'Averge',
                twitchLogin: 'averge',
                therunUsername: null,
            }),
        ).toBe('Averge');
        expect(
            runPlayerLabel({
                srcUserId: 'j59qw1qx',
                name: null,
                twitchLogin: null,
                therunUsername: null,
            }),
        ).toBe('j59qw1qx');
        expect(runPlayerLabel({ guestName: 'Bob' })).toBe('Bob (guest)');
    });
});
