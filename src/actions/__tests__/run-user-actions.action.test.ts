import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AffectedLeaderboard } from '../../../types/moderation.types';

/**
 * The owner self-moderation server actions. Three things are worth a test
 * here, and all three are invisible to the component suites that mock this
 * module wholesale:
 *
 *  1. Every action is signed-in-only. These wrap `/v1/me/*` routes that act on
 *     "whoever the bearer token is" — a missing guard doesn't fail loudly, it
 *     calls the backend with `undefined` as a session id.
 *  2. `selfMoveRunAction` busts BOTH the origin and the target board. Delete
 *     the `from` argument and every component test still passes; the only
 *     symptom is a stale entry on the board the run left.
 *  3. The anonymize actions bust the whole GAME (rule scope), not one board —
 *     the rule is `categoryId: null` and covers every category in the game.
 */

const mocks = vi.hoisted(() => ({
    getSession: vi.fn(),
    createReport: vi.fn(),
    appealRun: vi.fn(),
    getRunHistory: vi.fn(),
    selfRunVerdict: vi.fn(),
    selfEligibleRuns: vi.fn(),
    selfMoveRun: vi.fn(),
    selfAnonymizeState: vi.fn(),
    selfAnonymizeApply: vi.fn(),
    selfAnonymizeLift: vi.fn(),
    revalidateAffectedBoards: vi.fn(),
    revalidateBoardsForRuleScope: vi.fn(),
    revalidateRunDetails: vi.fn(),
}));

vi.mock('~src/actions/session.action', () => ({
    getSession: mocks.getSession,
}));
vi.mock('~src/lib/moderation/reports', () => ({
    createReport: mocks.createReport,
}));
vi.mock('~src/lib/moderation/runs', () => ({
    appealRun: mocks.appealRun,
    getRunHistory: mocks.getRunHistory,
}));
vi.mock('~src/lib/moderation/self-service', () => ({
    selfRunVerdict: mocks.selfRunVerdict,
    selfEligibleRuns: mocks.selfEligibleRuns,
    selfMoveRun: mocks.selfMoveRun,
    selfAnonymizeState: mocks.selfAnonymizeState,
    selfAnonymizeApply: mocks.selfAnonymizeApply,
    selfAnonymizeLift: mocks.selfAnonymizeLift,
}));
vi.mock('~src/lib/moderation/revalidate-boards', () => ({
    revalidateAffectedBoards: mocks.revalidateAffectedBoards,
    revalidateBoardsForRuleScope: mocks.revalidateBoardsForRuleScope,
    revalidateRunDetails: mocks.revalidateRunDetails,
}));

import { ModError } from '~src/lib/moderation/mod-fetch';
import {
    appealRunAction,
    loadSelfEligibleRunsAction,
    reportRunAction,
    revalidateSelfBoardsAction,
    selfAnonymizeApplyAction,
    selfAnonymizeLiftAction,
    selfAnonymizeStateAction,
    selfMoveRunAction,
    selfRunVerdictAction,
} from '../run-user-actions.action';

const SIGNED_IN = { username: 'joey', id: 'sess-1' };

const STATE = {
    hidden: true,
    selfApplied: true,
    ruleId: 3,
    displayName: 'Anonymous runner #3',
};

beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSession.mockResolvedValue(SIGNED_IN);
    mocks.createReport.mockResolvedValue({ reported: true });
    mocks.appealRun.mockResolvedValue(undefined);
    mocks.selfRunVerdict.mockResolvedValue({ applied: 'instant' });
    mocks.selfEligibleRuns.mockResolvedValue([]);
    mocks.selfMoveRun.mockResolvedValue({ moved: true, reverify: false });
    mocks.selfAnonymizeState.mockResolvedValue(STATE);
    mocks.selfAnonymizeApply.mockResolvedValue({
        hidden: true,
        displayName: 'Anonymous runner #3',
        alreadyExists: false,
    });
    mocks.selfAnonymizeLift.mockResolvedValue({
        ...STATE,
        hidden: false,
        selfApplied: false,
        ruleId: null,
        displayName: null,
    });
});

const from: AffectedLeaderboard = { categoryId: 10, subcategoryKey: '' };
const target: AffectedLeaderboard = { categoryId: 11, subcategoryKey: 'nmg' };

describe('run-user-actions — the session guard', () => {
    /**
     * Each case: the call, and the backend helper it must NOT have reached.
     * Every one of these routes acts on "whoever the token belongs to", so an
     * unguarded action doesn't 403 — it calls with `undefined`.
     */
    const cases: [string, () => Promise<unknown>, () => unknown][] = [
        [
            'reportRunAction',
            () => reportRunAction(1, 'a reason'),
            () => mocks.createReport,
        ],
        [
            'appealRunAction',
            () => appealRunAction(1, 'a reason'),
            () => mocks.appealRun,
        ],
        [
            'selfRunVerdictAction',
            () => selfRunVerdictAction(1, 'reject'),
            () => mocks.selfRunVerdict,
        ],
        [
            'revalidateSelfBoardsAction',
            () => revalidateSelfBoardsAction('mario64', 5, [from]),
            () => mocks.revalidateAffectedBoards,
        ],
        [
            'loadSelfEligibleRunsAction',
            () => loadSelfEligibleRunsAction(5),
            () => mocks.selfEligibleRuns,
        ],
        [
            'selfMoveRunAction',
            () => selfMoveRunAction('mario64', 5, 1, from, target),
            () => mocks.selfMoveRun,
        ],
        [
            'selfAnonymizeStateAction',
            () => selfAnonymizeStateAction(5),
            () => mocks.selfAnonymizeState,
        ],
        [
            'selfAnonymizeApplyAction',
            () => selfAnonymizeApplyAction('mario64', 5),
            () => mocks.selfAnonymizeApply,
        ],
        [
            'selfAnonymizeLiftAction',
            () => selfAnonymizeLiftAction('mario64', 5),
            () => mocks.selfAnonymizeLift,
        ],
    ];

    it.each(cases)(
        '%s refuses a signed-out caller',
        async (_name, call, helper) => {
            mocks.getSession.mockResolvedValue({ username: '', id: '' });
            const res = (await call()) as { error?: string };
            expect(res.error).toBeTypeOf('string');
            expect(helper()).not.toHaveBeenCalled();
        },
    );

    // A session row with a username but no bearer token is the shape a
    // half-expired session takes; it must not pass either.
    it.each(cases)(
        '%s refuses a session with no bearer id',
        async (_name, call, helper) => {
            mocks.getSession.mockResolvedValue({ username: 'joey', id: '' });
            const res = (await call()) as { error?: string };
            expect(res.error).toBeTypeOf('string');
            expect(helper()).not.toHaveBeenCalled();
        },
    );
});

describe('selfMoveRunAction', () => {
    it('busts BOTH the origin and the target board', async () => {
        const res = await selfMoveRunAction('mario64', 5, 42, from, target);
        expect(res).toEqual({ ok: true, reverify: false });
        expect(mocks.selfMoveRun).toHaveBeenCalledWith('sess-1', 42, target);
        // The origin side is the one nothing else covers: a cross-category
        // move leaves a stale entry on the board the run left.
        expect(mocks.revalidateAffectedBoards).toHaveBeenCalledWith(
            5,
            'mario64',
            [from, target],
        );
        expect(mocks.revalidateRunDetails).toHaveBeenCalledWith([42]);
    });

    it('reports the backend’s message verbatim and busts nothing on failure', async () => {
        mocks.selfMoveRun.mockRejectedValue(
            new ModError(
                403,
                'this run was placed by a moderator — appeal instead of moving it',
            ),
        );
        const res = await selfMoveRunAction('mario64', 5, 42, from, target);
        expect(res).toEqual({
            error: 'this run was placed by a moderator — appeal instead of moving it',
        });
        expect(mocks.revalidateAffectedBoards).not.toHaveBeenCalled();
    });

    // A cache bust is best-effort: the move already landed server-side, so a
    // failure here must not turn a successful move into an error.
    it('still reports success when the cache bust throws', async () => {
        mocks.revalidateAffectedBoards.mockRejectedValue(
            new Error('tag failure'),
        );
        const res = await selfMoveRunAction('mario64', 5, 42, from, target);
        expect(res).toEqual({ ok: true, reverify: false });
    });
});

describe('the anonymize actions bust the whole game, not one board', () => {
    // The rule is game-scoped (`categoryId: null`) and covers every board in
    // the game, current and future — a per-board bust would leave the runner's
    // name on every category they didn't happen to be looking at.
    it('apply uses revalidateBoardsForRuleScope(gameId, gameSlug, null)', async () => {
        const res = await selfAnonymizeApplyAction('mario64', 5);
        expect(res).toEqual({ ok: true, displayName: 'Anonymous runner #3' });
        expect(mocks.selfAnonymizeApply).toHaveBeenCalledWith('sess-1', 5);
        expect(mocks.revalidateBoardsForRuleScope).toHaveBeenCalledWith(
            5,
            'mario64',
            null,
        );
        expect(mocks.revalidateAffectedBoards).not.toHaveBeenCalled();
    });

    it('lift uses revalidateBoardsForRuleScope(gameId, gameSlug, null) and returns the resulting state', async () => {
        const res = await selfAnonymizeLiftAction('mario64', 5);
        expect(res).toEqual({
            ok: true,
            state: {
                hidden: false,
                selfApplied: false,
                ruleId: null,
                displayName: null,
            },
        });
        expect(mocks.revalidateBoardsForRuleScope).toHaveBeenCalledWith(
            5,
            'mario64',
            null,
        );
    });

    it('does not bust anything when the backend refuses', async () => {
        mocks.selfAnonymizeLift.mockRejectedValue(
            new ModError(
                403,
                'identity was hidden by a moderator — contact an admin to lift it',
            ),
        );
        const res = await selfAnonymizeLiftAction('mario64', 5);
        expect(res).toEqual({
            error: 'identity was hidden by a moderator — contact an admin to lift it',
        });
        expect(mocks.revalidateBoardsForRuleScope).not.toHaveBeenCalled();
    });

    // Anything that isn't a ModError is a bug or a network fault, and its
    // message is not something to put in front of a runner.
    it('hides a non-ModError behind a generic message', async () => {
        mocks.selfAnonymizeApply.mockRejectedValue(
            new Error('ECONNREFUSED 10.0.0.1:5432'),
        );
        const res = await selfAnonymizeApplyAction('mario64', 5);
        expect(res).toEqual({
            error: 'Something went wrong. Please try again.',
        });
    });
});
