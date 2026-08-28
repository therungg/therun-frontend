// @vitest-environment jsdom
import {
    act,
    fireEvent,
    render,
    screen,
    waitFor,
} from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type {
    LeaderboardEntry,
    LeaderboardResponse,
} from '../../../../../types/leaderboards.types';
import type { SelfAnonymizeState } from '../../../../../types/moderation.types';
import { LeaderboardPager } from './leaderboard-pager';

const mocks = vi.hoisted(() => ({
    /** Last props the table was rendered with — `onQuickModerate` is the
     * REAL gate under test (the row only decides whether to show a button). */
    tableProps: { current: null as null | Record<string, unknown> },
    dialogProps: { current: null as null | Record<string, unknown> },
    selfAnonymizeStateAction: vi.fn(),
    fetchLeaderboardPage: vi.fn(),
    findRunnerPage: vi.fn(),
}));

vi.mock('./leaderboard-table', () => ({
    LeaderboardTable: (props: Record<string, unknown>) => {
        mocks.tableProps.current = props;
        return <div data-testid="table" />;
    },
}));
// The board's quick-verify/remove surface, not the old inspector drawer —
// the shared dialog every mod pane reuses. Stubbed with Done/Close buttons
// so the un-hide-note tests below can drive its `onDone`.
vi.mock('../manage/moderation/shared/run-action-dialog', () => ({
    RunActionDialog: (props: Record<string, unknown>) => {
        mocks.dialogProps.current = props;
        return (
            <div data-testid="run-action-dialog">
                <button
                    type="button"
                    onClick={props.onDone as () => void}
                    data-testid="dialog-done"
                >
                    stub-done
                </button>
                <button
                    type="button"
                    onClick={props.onClose as () => void}
                    data-testid="dialog-close"
                >
                    stub-close
                </button>
            </div>
        );
    },
}));
vi.mock('./bulk-bar', () => ({ BoardBulkBar: () => null }));
vi.mock('./export-button', () => ({ ExportButton: () => null }));
vi.mock('../filters/filters-popover', () => ({ FiltersPopover: () => null }));
vi.mock('../shared/owner-hide-identity-dialog', () => ({
    OwnerHideIdentityDialog: (props: { open: boolean; onDone: () => void }) =>
        props.open ? (
            <button type="button" onClick={props.onDone}>
                stub-unhide-done
            </button>
        ) : null,
}));
vi.mock('../actions/fetch-page.action', () => ({
    fetchLeaderboardPage: mocks.fetchLeaderboardPage,
    findRunnerPage: mocks.findRunnerPage,
}));
vi.mock('~src/actions/run-user-actions.action', () => ({
    selfAnonymizeStateAction: mocks.selfAnonymizeStateAction,
}));

const entry = (over: Partial<LeaderboardEntry> = {}): LeaderboardEntry => ({
    runId: 55,
    rank: 1,
    runnerName: 'Joey',
    userId: 7,
    isGuest: false,
    time: 90_000,
    realTime: 90_000,
    gameTime: null,
    runDate: null,
    verificationStatus: 'verified',
    ...over,
});

const board = (entries: LeaderboardEntry[]): LeaderboardResponse => ({
    entries,
    page: 1,
    pageSize: 25,
    totalItems: entries.length,
    totalPages: 1,
    hideRealTime: false,
    hideGameTime: true,
});

function renderPager(over: {
    entries?: LeaderboardEntry[];
    canManage?: boolean;
    sessionUsername?: string | null;
    selfHidden?: SelfAnonymizeState | null;
}) {
    return render(
        <LeaderboardPager
            initial={board(over.entries ?? [entry()])}
            query={{
                gameSlug: 'celeste',
                categorySlug: 'any',
                timing: 'rt',
            }}
            sessionUsername={
                over.sessionUsername === undefined
                    ? 'joey'
                    : over.sessionUsername
            }
            canManage={over.canManage ?? false}
            gameSlug="celeste"
            gameId={12}
            gameDisplay="Celeste"
            selfHidden={over.selfHidden ?? null}
            variableKeys={[]}
            primaryTiming="rt"
            filtersActive={false}
            showMilliseconds={false}
            categorySlug="any"
            categoryDisplay="Any%"
            categoryId={4}
            subcategoryKey=""
            subcategoryDefKeys={[]}
            variableDefs={[]}
            selectedVarFilters={{}}
            builtins={{
                verified: false,
                video: null,
                from: null,
                to: null,
                country: null,
            }}
            facets={{ countries: [], minDate: null }}
        />,
    );
}

/** Fire the table's `onQuickModerate` — the gate a row's button would hit. */
function quickModerate(
    e: LeaderboardEntry,
    verb: 'remove' | 'approve' = 'remove',
) {
    const onQuickModerate = mocks.tableProps.current?.onQuickModerate as
        | ((e: LeaderboardEntry, verb: string) => void)
        | undefined;
    act(() => onQuickModerate?.(e, verb));
    return onQuickModerate;
}

beforeEach(() => {
    vi.clearAllMocks();
    mocks.tableProps.current = null;
    mocks.dialogProps.current = null;
});

describe('LeaderboardPager — quick-moderate gate', () => {
    it('mounts RunActionDialog in owner mode on the visitor’s own run', () => {
        renderPager({});
        quickModerate(entry());
        expect(screen.getByTestId('run-action-dialog')).toBeInTheDocument();
        expect(mocks.dialogProps.current?.verb).toBe('remove');
        expect(mocks.dialogProps.current?.gameSlug).toBe('celeste');
        const target = mocks.dialogProps.current?.target as {
            kind: string;
            runIds: number[];
        };
        expect(target.kind).toBe('runs');
        expect(target.runIds).toEqual([55]);
    });

    it('refuses another runner’s row', () => {
        renderPager({ entries: [entry({ runnerName: 'Someone' })] });
        quickModerate(entry({ runnerName: 'Someone' }));
        expect(screen.queryByTestId('run-action-dialog')).toBeNull();
    });

    // A guest run's runner name is self-reported free text, so a name match
    // proves nothing about who owns it.
    it('refuses a guest run bearing the visitor’s name', () => {
        const guest = entry({ isGuest: true, userId: null });
        renderPager({ entries: [guest] });
        quickModerate(guest);
        expect(screen.queryByTestId('run-action-dialog')).toBeNull();
    });

    // And the mirror: an anonymized placeholder can collide with a real name.
    it('refuses an anonymized row bearing the visitor’s name', () => {
        const anon = entry({ anonymized: true, userId: null });
        renderPager({ entries: [anon] });
        quickModerate(anon);
        expect(screen.queryByTestId('run-action-dialog')).toBeNull();
    });

    it('mounts RunActionDialog for the visitor’s own set time, targeting the manual time', () => {
        const manual = entry({
            runId: null,
            manualTimeId: 3,
            source: 'manual',
        });
        renderPager({ entries: [manual] });
        quickModerate(manual);
        expect(screen.getByTestId('run-action-dialog')).toBeInTheDocument();
        const target = mocks.dialogProps.current?.target as {
            kind: string;
            runIds: number[];
            manualTimeIds?: number[];
        };
        expect(target.kind).toBe('runs');
        expect(target.runIds).toEqual([]);
        expect(target.manualTimeIds).toEqual([3]);
    });

    it('refuses another runner’s set time', () => {
        const manual = entry({
            runId: null,
            manualTimeId: 3,
            source: 'manual',
            runnerName: 'Someone',
        });
        renderPager({ entries: [manual] });
        quickModerate(manual);
        expect(screen.queryByTestId('run-action-dialog')).toBeNull();
    });

    it('lets a moderator quick-moderate a set time, even someone else’s', () => {
        const manual = entry({
            runId: null,
            manualTimeId: 3,
            source: 'manual',
            runnerName: 'Someone',
        });
        renderPager({ canManage: true, entries: [manual] });
        quickModerate(manual);
        expect(screen.getByTestId('run-action-dialog')).toBeInTheDocument();
    });

    it('lets a moderator quick-moderate, even on their own run', () => {
        renderPager({ canManage: true });
        quickModerate(entry());
        expect(screen.getByTestId('run-action-dialog')).toBeInTheDocument();
    });

    it('hands the table no quick-moderate callback at all when signed out', () => {
        renderPager({ sessionUsername: null });
        expect(mocks.tableProps.current?.onQuickModerate).toBeUndefined();
    });

    it('closes the dialog and refetches the board on Done', async () => {
        mocks.fetchLeaderboardPage.mockResolvedValue(board([entry()]));
        renderPager({ canManage: true });
        quickModerate(entry());
        fireEvent.click(screen.getByTestId('dialog-done'));
        await waitFor(() =>
            expect(screen.queryByTestId('run-action-dialog')).toBeNull(),
        );
        expect(mocks.fetchLeaderboardPage).toHaveBeenCalled();
    });

    it('closes the dialog without refetching on Close', () => {
        renderPager({ canManage: true });
        quickModerate(entry());
        fireEvent.click(screen.getByTestId('dialog-close'));
        expect(screen.queryByTestId('run-action-dialog')).toBeNull();
        expect(mocks.fetchLeaderboardPage).not.toHaveBeenCalled();
    });
});

const hidden: SelfAnonymizeState = {
    hidden: true,
    selfApplied: true,
    ruleId: 4,
    displayName: 'Anonymous runner #2',
};

describe('LeaderboardPager — un-hide affordance', () => {
    // The realistic trap: an empty subcategory board with no active filters
    // suppresses the meta bar. The note must not inherit that condition, or
    // a hidden runner landing there has no way back.
    it('renders on an empty, unfiltered board', () => {
        renderPager({ entries: [], selfHidden: hidden });
        expect(screen.getByText(/shown on this board as/)).toBeInTheDocument();
        expect(
            screen.getByRole('button', { name: 'Unhide…' }),
        ).toBeInTheDocument();
    });

    // A moderator's rule is not the runner's to lift — state, no verb.
    it('states the fact but offers no Unhide for a moderator’s rule', () => {
        renderPager({
            entries: [],
            selfHidden: { ...hidden, selfApplied: false },
        });
        expect(screen.getByText(/shown on this board as/)).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Unhide…' })).toBeNull();
    });

    // A useState initial value would pin the first server answer forever.
    it('resyncs when the server sends a new state', () => {
        const { rerender } = renderPager({ entries: [] });
        expect(screen.queryByText(/shown on this board as/)).toBeNull();
        rerender(
            <LeaderboardPager
                initial={board([])}
                query={{
                    gameSlug: 'celeste',
                    categorySlug: 'any',
                    timing: 'rt',
                }}
                sessionUsername="joey"
                canManage={false}
                gameSlug="celeste"
                gameId={12}
                gameDisplay="Celeste"
                selfHidden={hidden}
                variableKeys={[]}
                primaryTiming="rt"
                filtersActive={false}
                showMilliseconds={false}
                categorySlug="any"
                categoryDisplay="Any%"
                categoryId={4}
                subcategoryKey=""
                subcategoryDefKeys={[]}
                variableDefs={[]}
                selectedVarFilters={{}}
                builtins={{
                    verified: false,
                    video: null,
                    from: null,
                    to: null,
                    country: null,
                }}
                facets={{ countries: [], minDate: null }}
            />,
        );
        expect(screen.getByText(/shown on this board as/)).toBeInTheDocument();
    });

    it('re-reads after the un-hide dialog acts, rather than assuming', async () => {
        mocks.selfAnonymizeStateAction.mockResolvedValue({
            ok: true,
            state: { ...hidden, hidden: false, displayName: null },
        });
        renderPager({ entries: [], selfHidden: hidden });
        fireEvent.click(screen.getByRole('button', { name: 'Unhide…' }));
        fireEvent.click(
            screen.getByRole('button', { name: 'stub-unhide-done' }),
        );
        await waitFor(() =>
            expect(screen.queryByText(/shown on this board as/)).toBeNull(),
        );
    });
});
