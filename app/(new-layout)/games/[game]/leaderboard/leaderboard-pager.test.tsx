// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type {
    LeaderboardEntry,
    LeaderboardResponse,
} from '../../../../../types/leaderboards.types';
import type { SelfAnonymizeState } from '../../../../../types/moderation.types';
import { LeaderboardPager } from './leaderboard-pager';

const mocks = vi.hoisted(() => ({
    selfAnonymizeStateAction: vi.fn(),
    fetchLeaderboardPage: vi.fn(),
    findRunnerPage: vi.fn(),
}));

vi.mock('./leaderboard-table', () => ({
    LeaderboardTable: () => <div data-testid="table" />,
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
// The review target now reads `?run=`/`?manual=` through useRunParam
// (useSearchParams), which throws outside an app router — mocked the same
// way board-curation.test.tsx does it.
vi.mock('next/navigation', () => ({
    useSearchParams: () => new URLSearchParams(),
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
                playedon: [],
            }}
            facets={{ countries: [], minDate: null }}
        />,
    );
}

beforeEach(() => {
    vi.clearAllMocks();
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
                    playedon: [],
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
