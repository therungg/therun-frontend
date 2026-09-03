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
import type { SrcImportJob } from '../../../../../../types/src-import.types';

vi.mock('./src-import-actions', () => ({
    getSrcImportJobAction: vi.fn(),
    resyncAction: vi.fn(async () => ({ result: { jobId: 8 } })),
    startSrcImportAction: vi.fn(async () => ({ result: { jobId: 9 } })),
}));

import {
    getSrcImportJobAction,
    resyncAction,
    startSrcImportAction,
} from './src-import-actions';
import { SrcImportPane } from './src-import-pane';

const job = (over: Partial<SrcImportJob>): SrcImportJob => ({
    id: 7,
    gameId: 12,
    srcGameId: 'x',
    srcGameAbbreviation: 'sm64',
    srcGameName: 'Super Mario 64',
    srcUrl: 'https://www.speedrun.com/sm64',
    requestedBy: 1,
    status: 'done',
    phase: 'done',
    checkpoint: null,
    categoriesCount: 0,
    levelsCount: 0,
    variablesCount: 0,
    runsCount: 0,
    playersCount: 0,
    playersMatchedCount: 0,
    requestsMade: 0,
    estimatedRequests: null,
    error: null,
    startedAt: null,
    finishedAt: '2026-09-03T14:02:00Z',
    createdAt: '2026-09-03T14:00:00Z',
    commitStatus: 'applied',
    commitPhase: 'config',
    importedRunsCount: 0,
    importSkippedCount: 0,
    configAppliedAt: '2026-09-03T14:02:00Z',
    runsImportedAt: null,
    srcOnlyLeaderboard: false,
    kind: 'settings',
    changeSummary: null,
    commitFlags: null,
    ...over,
});

const settingsDone = job({
    changeSummary: {
        added: 0,
        updated: 0,
        removed: 0,
        archived: 0,
        config: {
            categoriesCreated: 3,
            categoriesUpdated: 12,
            categoriesUnfeatured: 0,
            levelsCreated: 0,
            levelsUpdated: 0,
            variablesCreated: 0,
            variablesUpdated: 0,
            themeApplied: false,
            gameFields: [
                { field: 'emulatorPolicy', from: 'allowed', to: 'banned' },
            ],
            moderatorsAssigned: 0,
            minTimeFloors: 0,
        },
    },
});

const runsDone = job({
    id: 6,
    kind: 'resync',
    commitStatus: 'pruned',
    commitPhase: 'prune',
    playersMatchedCount: 17,
    importSkippedCount: 5,
    changeSummary: { added: 41, updated: 3, removed: 0, archived: 0 },
});

/** getSrcImportJobAction is called per kind; answer by kind. */
function answer(by: {
    settings: SrcImportJob | null;
    resync: SrcImportJob | null;
    any?: SrcImportJob | null;
}) {
    vi.mocked(getSrcImportJobAction).mockImplementation(async ({ kind }) => ({
        result:
            kind === 'settings'
                ? by.settings
                : kind === 'resync'
                  ? by.resync
                  : (by.any ?? by.settings ?? by.resync),
    }));
}

const props = {
    gameId: 12,
    gameSlug: 'sm64',
    gameDisplay: 'Super Mario 64',
    isAdmin: false,
};

describe('SrcImportPane', () => {
    beforeEach(() => vi.clearAllMocks());
    afterEach(cleanup);

    it('renders both sections with their last import and reports', async () => {
        answer({ settings: settingsDone, resync: runsDone });
        render(<SrcImportPane {...props} />);
        expect(
            await screen.findByRole('heading', { name: 'Settings' }),
        ).toBeTruthy();
        expect(screen.getByRole('heading', { name: 'Runs' })).toBeTruthy();
        expect(screen.getAllByText(/Last import/).length).toBe(2);
        expect(screen.getByText('3 added · 12 updated')).toBeTruthy();
        expect(screen.getByText('Allowed → Banned')).toBeTruthy();
        expect(screen.getByText('41 added · 3 updated')).toBeTruthy();
        expect(screen.getByText('17 matched · 5 skipped')).toBeTruthy();
    });

    it('says never imported and no changes where that applies', async () => {
        answer({
            settings: job({
                changeSummary: {
                    added: 0,
                    updated: 0,
                    removed: 0,
                    archived: 0,
                    config: {
                        // biome-ignore lint/style/noNonNullAssertion: fixture
                        ...settingsDone.changeSummary!.config!,
                        categoriesCreated: 0,
                        categoriesUpdated: 0,
                        gameFields: [],
                    },
                },
            }),
            resync: null,
        });
        render(<SrcImportPane {...props} />);
        expect(
            await screen.findByText('Everything already matched the source.'),
        ).toBeTruthy();
        expect(screen.getByText('Never imported')).toBeTruthy();
    });

    it('starts a settings import with the chosen options and refreshes', async () => {
        answer({
            settings: job({ createdAt: '2020-01-01T00:00:00Z' }),
            resync: null,
        });
        render(<SrcImportPane {...props} />);
        const btn = await screen.findByRole('button', {
            name: 'Import settings',
        });
        fireEvent.click(screen.getByText('Options'));
        fireEvent.click(screen.getByLabelText(/Import board theme/));
        fireEvent.click(btn);
        await waitFor(() =>
            expect(resyncAction).toHaveBeenCalledWith({
                gameId: 12,
                gameSlug: 'sm64',
                kind: 'settings',
                commitFlags: expect.objectContaining({ importTheme: false }),
            }),
        );
        await waitFor(() =>
            expect(
                vi.mocked(getSrcImportJobAction).mock.calls.length,
            ).toBeGreaterThanOrEqual(6),
        );
    });

    it('disables both buttons while either import runs and shows progress', async () => {
        answer({
            settings: job({ createdAt: '2020-01-01T00:00:00Z' }),
            resync: job({
                id: 9,
                kind: 'resync',
                status: 'running',
                phase: 'runs',
                commitStatus: null,
                requestsMade: 40,
                estimatedRequests: 100,
            }),
        });
        render(<SrcImportPane {...props} />);
        const settings = await screen.findByRole('button', {
            name: 'Import settings',
        });
        const runs = screen.getByRole('button', { name: 'Import runs' });
        expect((settings as HTMLButtonElement).disabled).toBe(true);
        expect((runs as HTMLButtonElement).disabled).toBe(true);
        expect(
            screen.getByRole('progressbar').getAttribute('aria-valuenow'),
        ).toBe('40');
        expect(screen.getByText('Fetching runs')).toBeTruthy();
    });

    it('throttles a kind imported in the last 24h unless admin', async () => {
        const recent = job({ createdAt: new Date().toISOString() });
        answer({ settings: recent, resync: null });
        const { unmount } = render(<SrcImportPane {...props} />);
        const btn = await screen.findByRole('button', {
            name: 'Import settings',
        });
        expect((btn as HTMLButtonElement).disabled).toBe(true);
        expect(screen.getByText(/Available again in/)).toBeTruthy();
        unmount();

        render(<SrcImportPane {...props} isAdmin />);
        const adminBtn = await screen.findByRole('button', {
            name: 'Import settings',
        });
        expect((adminBtn as HTMLButtonElement).disabled).toBe(false);
    });

    it('shows the failure and re-enables the button', async () => {
        answer({
            settings: job({
                status: 'failed',
                error: 'source 500',
                createdAt: '2020-01-01T00:00:00Z',
            }),
            resync: null,
        });
        render(<SrcImportPane {...props} />);
        expect(
            await screen.findByText('Import failed: source 500'),
        ).toBeTruthy();
        const btn = screen.getByRole('button', { name: 'Import settings' });
        expect((btn as HTMLButtonElement).disabled).toBe(false);
    });

    it('shows the link card when the game has no import at all', async () => {
        answer({ settings: null, resync: null, any: null });
        render(<SrcImportPane {...props} />);
        const input = await screen.findByLabelText(/game URL/);
        fireEvent.change(input, {
            target: { value: 'https://www.speedrun.com/sm64' },
        });
        fireEvent.click(
            screen.getByRole('button', { name: 'Link and import settings' }),
        );
        await waitFor(() =>
            expect(startSrcImportAction).toHaveBeenCalledWith({
                gameId: 12,
                gameSlug: 'sm64',
                url: 'https://www.speedrun.com/sm64',
                kind: 'settings',
            }),
        );
    });

    it('polls a running job', async () => {
        vi.useFakeTimers();
        answer({
            settings: job({
                status: 'running',
                phase: 'meta',
                commitStatus: null,
            }),
            resync: null,
        });
        render(<SrcImportPane {...props} />);
        await act(async () => {});
        const before = vi.mocked(getSrcImportJobAction).mock.calls.length;
        await act(async () => {
            vi.advanceTimersByTime(5000);
        });
        expect(
            vi.mocked(getSrcImportJobAction).mock.calls.length,
        ).toBeGreaterThan(before);
        vi.useRealTimers();
    });
});
