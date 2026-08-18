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
    /** Last props the table was rendered with — `onModerate` is the REAL
     * gate under test (the row only decides whether to show a button). */
    tableProps: { current: null as null | Record<string, unknown> },
    inspectorProps: { current: null as null | Record<string, unknown> },
    manualInspectorProps: { current: null as null | Record<string, unknown> },
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
vi.mock('./run-inspector', () => ({
    RunInspector: (props: Record<string, unknown>) => {
        mocks.inspectorProps.current = props;
        return <div data-testid="inspector" />;
    },
}));
vi.mock('./manual-inspector', () => ({
    ManualInspector: (props: Record<string, unknown>) => {
        mocks.manualInspectorProps.current = props;
        return <div data-testid="manual-inspector" />;
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

/** Fire the table's `onModerate` — the gate a row's button would hit. */
function moderate(e: LeaderboardEntry) {
    const onModerate = mocks.tableProps.current?.onModerate as
        | ((e: LeaderboardEntry) => void)
        | undefined;
    act(() => onModerate?.(e));
    return onModerate;
}

beforeEach(() => {
    vi.clearAllMocks();
    mocks.tableProps.current = null;
    mocks.inspectorProps.current = null;
    mocks.manualInspectorProps.current = null;
});

describe('LeaderboardPager — owner gate', () => {
    it('opens the inspector in owner mode on the visitor’s own run', () => {
        renderPager({});
        moderate(entry());
        expect(screen.getByTestId('inspector')).toBeInTheDocument();
        expect(mocks.inspectorProps.current?.mode).toBe('owner');
        expect(mocks.inspectorProps.current?.gameId).toBe(12);
    });

    it('refuses another runner’s row', () => {
        renderPager({ entries: [entry({ runnerName: 'Someone' })] });
        moderate(entry({ runnerName: 'Someone' }));
        expect(screen.queryByTestId('inspector')).toBeNull();
    });

    // A guest run's runner name is self-reported free text, so a name match
    // proves nothing about who owns it.
    it('refuses a guest run bearing the visitor’s name', () => {
        const guest = entry({ isGuest: true, userId: null });
        renderPager({ entries: [guest] });
        moderate(guest);
        expect(screen.queryByTestId('inspector')).toBeNull();
    });

    // And the mirror: an anonymized placeholder can collide with a real name.
    it('refuses an anonymized row bearing the visitor’s name', () => {
        const anon = entry({ anonymized: true, userId: null });
        renderPager({ entries: [anon] });
        moderate(anon);
        expect(screen.queryByTestId('inspector')).toBeNull();
    });

    it('opens ManualInspector in owner mode on the visitor’s own set time', () => {
        const manual = entry({
            runId: null,
            manualTimeId: 3,
            source: 'manual',
        });
        renderPager({ entries: [manual] });
        moderate(manual);
        expect(screen.queryByTestId('inspector')).toBeNull();
        expect(screen.getByTestId('manual-inspector')).toBeInTheDocument();
        expect(mocks.manualInspectorProps.current?.mode).toBe('owner');
        // A single row is in scope for an owner — no stepping to a
        // stranger's set time.
        expect(mocks.manualInspectorProps.current?.onPrev).toBeUndefined();
        expect(mocks.manualInspectorProps.current?.onNext).toBeUndefined();
    });

    it('refuses another runner’s set time', () => {
        const manual = entry({
            runId: null,
            manualTimeId: 3,
            source: 'manual',
            runnerName: 'Someone',
        });
        renderPager({ entries: [manual] });
        moderate(manual);
        expect(screen.queryByTestId('manual-inspector')).toBeNull();
    });

    it('gives a moderator mod mode on a set time, even someone else’s', () => {
        const manual = entry({
            runId: null,
            manualTimeId: 3,
            source: 'manual',
            runnerName: 'Someone',
        });
        renderPager({ canManage: true, entries: [manual] });
        moderate(manual);
        expect(mocks.manualInspectorProps.current?.mode).toBe('mod');
    });

    it('gives a moderator mod mode, even on their own run', () => {
        renderPager({ canManage: true });
        moderate(entry());
        expect(mocks.inspectorProps.current?.mode).toBe('mod');
    });

    it('hands the table no moderate callback at all when signed out', () => {
        renderPager({ sessionUsername: null });
        expect(mocks.tableProps.current?.onModerate).toBeUndefined();
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

    /** Open the hoisted dialog the way the drawer does. */
    function openHideIdentityFromDrawer() {
        const open = mocks.inspectorProps.current
            ?.onOpenHideIdentity as () => void;
        expect(open).toBeTypeOf('function');
        act(() => open());
    }

    // Hiding from inside the drawer redacts the row and takes the drawer's
    // own entry point with it — without this re-read the note (the only
    // remaining way back) would not appear until a full page load.
    it('appears after a hide started from the drawer', async () => {
        mocks.selfAnonymizeStateAction.mockResolvedValue({
            ok: true,
            state: hidden,
        });
        mocks.fetchLeaderboardPage.mockResolvedValue(board([entry()]));
        renderPager({});
        moderate(entry());
        openHideIdentityFromDrawer();
        fireEvent.click(
            screen.getByRole('button', { name: 'stub-unhide-done' }),
        );
        await waitFor(() =>
            expect(
                screen.getByText(/shown on this board as/),
            ).toBeInTheDocument(),
        );
    });

    // The whole reason the dialog lives here and not in the drawer. Its own
    // success triggers the board refetch; the refetched row comes back
    // anonymized, which fails `isOwnEntry` and unmounts the drawer. A dialog
    // rendered inside the drawer would be torn off screen before the runner
    // read its answer — which can be "a moderator's rule still hides you".
    it('survives the board refetch its own success triggers, even as the drawer unmounts', async () => {
        mocks.selfAnonymizeStateAction.mockResolvedValue({
            ok: true,
            state: hidden,
        });
        // What the board returns once the runner is hidden: the same row,
        // anonymized and stripped of its userId.
        mocks.fetchLeaderboardPage.mockResolvedValue(
            board([
                entry({
                    runnerName: 'Anonymous runner #2',
                    userId: null,
                    anonymized: true,
                }),
            ]),
        );
        renderPager({});
        moderate(entry());
        expect(screen.getByTestId('inspector')).toBeInTheDocument();
        openHideIdentityFromDrawer();

        fireEvent.click(
            screen.getByRole('button', { name: 'stub-unhide-done' }),
        );

        // The drawer goes, exactly as designed…
        await waitFor(() =>
            expect(screen.queryByTestId('inspector')).toBeNull(),
        );
        // …and the dialog is still on screen, still the runner's to close.
        expect(
            screen.getByRole('button', { name: 'stub-unhide-done' }),
        ).toBeInTheDocument();
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
