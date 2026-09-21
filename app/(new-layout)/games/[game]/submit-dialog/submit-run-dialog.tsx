'use client';

import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { selfClaimTimeAction } from '~src/actions/self-claim.action';
import { GameImage } from '~src/components/image/gameimage';
import Link from '~src/components/link';
import {
    buildBoardHref,
    buildManualTimeHref,
    gameSegment,
} from '~src/lib/board-url';
import { otherTiming, validateRunTimes } from '~src/lib/run-times';
import type {
    ResolvedCategory,
    ResolvedGroup,
    VariableRow,
    VodReviewPatch,
} from '../../../../../types/leaderboards.types';
import type { ModTiming } from '../../../../../types/moderation.types';
import { detectVod } from '../leaderboard/vod-review/player/types';
import { createManualTimeAction } from '../manage/moderation/shared/actions/manual-times.action';
import type { EmulatorPolicy } from '../rules/rules-panel';
import { BoardDialog } from '../shared/board-dialog';
import { isSameRunner } from '../shared/is-same-runner';
import { loadVariablesAction } from '../submit/load-variables.action';
import { buildSubcategoryKey } from '../submit/subcategory-key';
import {
    type BoardPlayers,
    loadBoardPlayersAction,
} from './load-board-players.action';
import {
    applyRefusal,
    filledRows,
    initialPartnerRowCount,
    isRosterRefusal,
    newPartnerRow,
    type PartnerRow,
    partnerInputs,
    refusedName,
    rosterBlocker,
} from './partner-rows';
import type { RunnerChoice } from './runner-state';
import { StepBoard } from './step-board';
import { StepRunner } from './step-runner';
import { StepRunners } from './step-runners';
import { isValidHttpUrl, StepTime, todayISODate } from './step-time';
import styles from './submit-run-dialog.module.scss';

export interface SubmitDialogGame {
    id: number;
    name: string;
    display: string;
    /** IGDB cover, shown in the dialog header. */
    image?: string | null;
}

interface Props {
    game: SubmitDialogGame;
    /** Moderator-set cover, which wins over the IGDB one — as on the hero. */
    coverUrl?: string | null;
    /** Featured, non-archived categories — the same set the board shows. */
    categories: ResolvedCategory[];
    groups: ResolvedGroup[];
    gameRules?: string | null;
    emulatorPolicy?: EmulatorPolicy;
    /** Viewer moderates this game -> they get the runner step. */
    canModerate: boolean;
    /** Null when signed out; the dialog then asks them to sign in. */
    sessionUsername: string | null;
    /** Board the dialog was opened from — category slug and subcategory values. */
    initialCategorySlug?: string | null;
    initialSubcategoryValues?: Record<string, string>;
    open: boolean;
    onClose: () => void;
}

type StepId = 'board' | 'runner' | 'time';

function canonicalDefault(def: VariableRow): string {
    const idx = def.defaultValueIndex ?? 0;
    return def.values[idx]?.[0] ?? def.values[0]?.[0] ?? '';
}

/** Resolves `raw` against a subcategory def's value buckets (case-insensitive), or null. */
function canonicalMatch(def: VariableRow, raw: string): string | null {
    const bucket = def.values.find((aliases) =>
        aliases.some((alias) => alias.toLowerCase() === raw.toLowerCase()),
    );
    return bucket?.[0] ?? null;
}

/**
 * The dialog's header — the game it is about, then the action.
 *
 * The dialog can be opened from anywhere on a game's pages, and once it
 * covers the board there is nothing left on screen naming the game, so the
 * header carries it: cover art at the board's own 3:4, name above the title.
 */
function DialogHeader({
    game,
    coverUrl,
}: {
    game: SubmitDialogGame;
    coverUrl?: string | null;
}) {
    return (
        <div className={styles.header}>
            <div className={styles.headerGame}>
                <GameImage
                    src={coverUrl ?? game.image ?? 'noimage'}
                    alt={game.display}
                    quality="small"
                    width={36}
                    height={48}
                    // Inline, not the class: GameImage always adds Bootstrap's
                    // `img-fluid`, whose `height: auto` would otherwise win.
                    style={{ width: 36, height: 48, objectFit: 'cover' }}
                    className={styles.headerArt}
                />
                <div>
                    <div className={styles.headerGameName}>{game.display}</div>
                    <h2 id="submit-run-dialog-title" className={styles.title}>
                        Submit a run
                    </h2>
                </div>
            </div>
        </div>
    );
}

/** "A and B", "A, B and C" — the team, as a sentence reads it. */
function formatTeam(names: string[]): string {
    if (names.length <= 1) return names[0] ?? '';
    return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

const STEP_LABELS: Record<StepId, string> = {
    board: 'Board',
    runner: 'Runner',
    time: 'Time',
};

/**
 * Submitting a run, as a dialog on the board.
 *
 * Three steps, the middle one only for moderators: which board, who it is
 * for, and the time itself. Every submission — a runner's own or a mod's on
 * someone else's behalf — lands as a manual time; the two differ only in
 * which endpoint attributes it (see the step-time submit handler).
 */
export function SubmitRunDialog({
    game,
    coverUrl,
    categories,
    groups,
    gameRules,
    emulatorPolicy,
    canModerate,
    sessionUsername,
    initialCategorySlug,
    initialSubcategoryValues,
    open,
    onClose,
}: Props) {
    const steps: StepId[] = canModerate
        ? ['board', 'runner', 'time']
        : ['board', 'time'];

    const [stepIndex, setStepIndex] = useState(0);
    const step = steps[stepIndex];

    const [categoryId, setCategoryId] = useState<number>(() => {
        if (initialCategorySlug) {
            const match = categories.find(
                (c) =>
                    c.name.toLowerCase() === initialCategorySlug.toLowerCase(),
            );
            if (match) return match.id;
        }
        return categories[0]?.id ?? 0;
    });
    const category = useMemo(
        () => categories.find((c) => c.id === categoryId) ?? categories[0],
        [categories, categoryId],
    );

    const [variables, setVariables] = useState<VariableRow[]>([]);
    const [subcategory, setSubcategory] = useState<Record<string, string>>({});
    const [varsLoading, startVarsTransition] = useTransition();
    const [varsError, setVarsError] = useState(false);
    /** The category whose subcategory values are the ones in `subcategory`
     * right now — null while they are being loaded. */
    const [varsFor, setVarsFor] = useState<string | null>(null);
    const [rulesOpen, setRulesOpen] = useState(false);

    // The opening URL's subcategory params apply once, to whichever
    // category's variables load first — not on every later category switch.
    const appliedInitialSubcategory = useRef(false);

    useEffect(() => {
        setRulesOpen(false);
    }, [category?.id]);

    // Load variables whenever the category changes.
    useEffect(() => {
        if (!category) return;
        let cancelled = false;
        setVarsError(false);
        // The picked slice is not known until these land: an empty
        // `subcategory` is indistinguishable from a category that has no
        // subcategory variables at all, and the board probe below must not
        // ask about the wrong board.
        setVarsFor(null);
        startVarsTransition(async () => {
            try {
                const resp = await loadVariablesAction(
                    game.name,
                    category.name,
                );
                if (cancelled) return;
                setVariables(resp.variables);
                const sub: Record<string, string> = {};
                for (const def of resp.variables) {
                    if (def.role !== 'subcategory') continue;
                    let matched: string | null = null;
                    if (
                        !appliedInitialSubcategory.current &&
                        initialSubcategoryValues
                    ) {
                        const rawEntry = Object.entries(
                            initialSubcategoryValues,
                        ).find(
                            ([k]) =>
                                k.toLowerCase() ===
                                def.nameNormalized.toLowerCase(),
                        );
                        if (rawEntry)
                            matched = canonicalMatch(def, rawEntry[1]);
                    }
                    sub[def.nameNormalized] = matched ?? canonicalDefault(def);
                }
                appliedInitialSubcategory.current = true;
                setSubcategory(sub);
                setVarsFor(category.name);
            } catch {
                if (cancelled) return;
                setVariables([]);
                setSubcategory({});
                setVarsError(true);
            }
        });
        return () => {
            cancelled = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [game.name, category?.name]);

    const subcatDefs = variables.filter((v) => v.role === 'subcategory');
    const subcategoryKey = buildSubcategoryKey(subcategory);

    // ---- Runner step (moderators only) ----------------------------------
    const [choice, setChoice] = useState<RunnerChoice | null>(null);

    // ---- Time step -------------------------------------------------------
    // Two clocks, not one time and a question about which clock it was.
    const [timeMs, setTimeMs] = useState<number | null>(null);
    const [secondaryMs, setSecondaryMs] = useState<number | null>(null);
    const [runDate, setRunDate] = useState<string>(todayISODate());
    const [vodUrl, setVodUrl] = useState('');
    const [vodTouched, setVodTouched] = useState(false);
    const [vodReview, setVodReview] = useState<VodReviewPatch | null>(null);

    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<{
        applied: 'instant' | 'provisional';
        manualTimeId: number;
        /** Everyone the submission credited, lead first — so the success
         * screen names the team rather than only the person who filed it. */
        team: string[];
    } | null>(null);

    // ---- Runners (co-op boards only) -------------------------------------
    const [boardPlayers, setBoardPlayers] = useState<BoardPlayers | null>(null);
    const [partnerRows, setPartnerRows] = useState<PartnerRow[]>([]);
    const [rosterError, setRosterError] = useState<string | null>(null);
    // The count/duplicate blockers are checked on Submit, not while typing:
    // an untouched form should not scold.
    const [showBlocker, setShowBlocker] = useState(false);

    // A category's own clocks decide how many times this takes. When it shows
    // both, the board's primary is the first field and the other clock is the
    // second — there is nothing left to ask.
    const showRt = !category?.hideRealTime;
    const showGt = !category?.hideGameTime;
    const showSecondary = showRt && showGt;
    const primaryTiming: ModTiming = showSecondary
        ? category?.primaryTiming === 'gt'
            ? 'gametime'
            : 'realtime'
        : showGt
          ? 'gametime'
          : 'realtime';

    // A board change invalidates a runner already resolved against the old
    // one — "no run on this board yet" was an answer about a different board.
    // This lives here, not in StepRunner: that component unmounts every time
    // the mod steps away from it, so a mount-time reset would also wipe a
    // resolved runner on a plain Back-then-Next.
    useEffect(() => {
        setChoice(null);
    }, [categoryId, subcategoryKey]);

    // A board change can swap which clock is primary, and the entered times
    // belong to the old board's clocks — not to the new one's.
    useEffect(() => {
        setSecondaryMs(null);
    }, [category?.primaryTiming, showSecondary]);

    // What the picked board credits. Read per slice, because that is the
    // only scope whose answer may be acted on: a combined view answers for
    // the category and says nothing about any one board (guide §5).
    //
    // Gated on `open`, and this matters: the provider mounts this dialog on
    // every game and board page whether or not anybody asked for it, and the
    // early return for a closed dialog sits below the hooks — so an ungated
    // effect would fire a server action on every pageview, signed-out
    // visitors included. Gated on `varsFor` too, because until the
    // variables land there is no slice to ask about.
    useEffect(() => {
        if (!open || !category || varsFor !== category.name) return;
        let cancelled = false;
        setBoardPlayers(null);
        setPartnerRows([]);
        setRosterError(null);
        setShowBlocker(false);
        (async () => {
            const answer = await loadBoardPlayersAction(
                game.name,
                category.name,
                subcategory,
                primaryTiming === 'gametime' ? 'gt' : 'rt',
            );
            if (cancelled) return;
            setBoardPlayers(answer);
            if (answer.coopBoard && answer.playersScope === 'slice') {
                setPartnerRows(
                    Array.from(
                        { length: initialPartnerRowCount(answer.players) },
                        newPartnerRow,
                    ),
                );
            }
        })();
        return () => {
            cancelled = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        open,
        varsFor,
        game.name,
        category?.name,
        subcategoryKey,
        primaryTiming,
    ]);

    // Partner fields belong only to a board somebody configured for co-op,
    // and only when the answer is about THIS board. Everywhere else the
    // dialog files exactly the submission it filed before: no `participants`
    // key at all, and anything typed before the board changed is gone with
    // the section.
    const coopBoard =
        boardPlayers !== null &&
        boardPlayers.coopBoard &&
        boardPlayers.playersScope === 'slice'
            ? boardPlayers
            : null;
    const teamLeadName = choice ? choice.displayName : (sessionUsername ?? '');
    const rosterBlock = coopBoard
        ? rosterBlocker(partnerRows, teamLeadName, coopBoard.players)
        : null;

    const boardStepValid = !varsLoading && !!category;
    const runnerStepValid = choice !== null && choice.canProceed;
    const vodInvalid =
        vodUrl.trim().length > 0 && !isValidHttpUrl(vodUrl.trim());
    const timesVerdict = validateRunTimes({
        primaryTiming,
        showSecondary,
        primaryMs: timeMs,
        secondaryMs,
    });
    const timeStepValid = timesVerdict.ok && !vodInvalid && !submitting;

    const stepValid =
        step === 'board'
            ? boardStepValid
            : step === 'runner'
              ? runnerStepValid
              : timeStepValid;

    const reset = () => {
        setStepIndex(0);
        setChoice(null);
        setTimeMs(null);
        setSecondaryMs(null);
        setRunDate(todayISODate());
        setVodUrl('');
        setVodTouched(false);
        setVodReview(null);
        setError(null);
        setResult(null);
        setRosterError(null);
        setShowBlocker(false);
        setPartnerRows(
            coopBoard
                ? Array.from(
                      { length: initialPartnerRowCount(coopBoard.players) },
                      newPartnerRow,
                  )
                : [],
        );
    };

    /** A refusal, put where the person who caused it is looking: on the row
     * holding the name it refuses, else in the Runners section when it is
     * about who this credits, else under the time fields. */
    const takeRefusal = (message: string) => {
        // The refusal can be about the FIXED first row: a moderator filing
        // under a guest name that case-folds to an account's username gets
        // the same `no account named <lead>` sentence (guide §2's guest
        // door), and no partner row holds that value — so it would otherwise
        // land in the section as a bare server fragment about a field that
        // is not on this step. Say what it means about the runner instead.
        const refused = refusedName(message);
        if (
            refused &&
            choice?.kind === 'name-only' &&
            isSameRunner(refused, teamLeadName)
        ) {
            const sentence = `“${refused}” belongs to a therun account, so this time can’t be filed under that name as a guest. Go back and pick the account.`;
            // In the Runners section when there is one — it is about the row
            // shown there — and under the time fields when there is not, so
            // it is never said into a section that does not render.
            setRosterError(coopBoard ? sentence : null);
            setError(coopBoard ? null : sentence);
            return;
        }
        if (coopBoard) {
            const placed = applyRefusal(partnerRows, message);
            if (placed.placed) {
                setPartnerRows(placed.rows);
                setRosterError(null);
                setError(null);
                return;
            }
            if (isRosterRefusal(message)) {
                setRosterError(message);
                setError(null);
                return;
            }
        }
        setError(message);
    };

    const submit = async () => {
        if (!category || timeMs === null) return;
        if (coopBoard && rosterBlock) {
            setShowBlocker(true);
            return;
        }
        setSubmitting(true);
        setError(null);
        setRosterError(null);

        // A board that credits teams takes the partners with the time; every
        // other board's body is the one it always was — no `participants`
        // key, present or empty. The two clocks of a paired submission are
        // two rows and one team, so this rides the request once.
        const roster = coopBoard ? partnerInputs(partnerRows) : [];
        const rosterField =
            roster.length > 0 ? { participants: roster } : undefined;
        const team = [
            teamLeadName,
            ...filledRows(coopBoard ? partnerRows : []).map((r) =>
                r.value.trim(),
            ),
        ];

        // The other clock rides along as a second row when it was filled in.
        const secondary =
            secondaryMs !== null
                ? { timing: otherTiming(primaryTiming), timeMs: secondaryMs }
                : null;

        // A lone start (or end) marker isn't worth storing — only a matched
        // pair produces a retime a moderator can act on.
        const pinnedReview =
            vodReview &&
            vodReview.markers.some((m) => m.kind === 'start') &&
            vodReview.markers.some((m) => m.kind === 'end')
                ? vodReview
                : undefined;

        // A non-moderator never reaches the runner step, so `choice` is null
        // and they always take the self path. A moderator submitting for
        // themselves goes through the mod path with their own user id — same
        // board outcome, and the mod log records who entered it.
        if (choice) {
            const res = await createManualTimeAction(game.name, {
                runnerRef: choice.ref,
                categoryId: category.id,
                subcategoryKey,
                timing: primaryTiming,
                timeMs,
                secondary,
                evidenceUrl: vodUrl.trim() || null,
                runDate: runDate || null,
                vodReview: pinnedReview,
                ...rosterField,
                reason: 'Added via Submit a run',
            });
            setSubmitting(false);
            if ('error' in res) {
                takeRefusal(res.error);
                return;
            }
            // A moderator entering a time is the verification — it lands on
            // the board directly, which is why this path carries no `applied`.
            setResult({
                applied: 'instant',
                manualTimeId: res.result.id,
                team,
            });
            return;
        }

        const res = await selfClaimTimeAction({
            gameId: game.id,
            categoryId: category.id,
            timing: primaryTiming,
            timeMs,
            secondary,
            subcategoryKey:
                subcategoryKey.length > 0 ? subcategoryKey : undefined,
            evidenceUrl: vodUrl.trim() || null,
            runDate: runDate || null,
            vodReview: pinnedReview,
            ...rosterField,
        });
        setSubmitting(false);
        if ('error' in res) {
            takeRefusal(res.error);
            return;
        }
        setResult({
            applied: res.applied,
            manualTimeId: res.manualTimeId,
            team,
        });
    };

    if (!open) return null;

    if (!sessionUsername) {
        return (
            <BoardDialog
                open={open}
                onClose={onClose}
                labelledBy="submit-run-dialog-title"
                themed
                size="md"
            >
                <DialogHeader game={game} coverUrl={coverUrl} />
                <div className={styles.body}>
                    <p className="mb-0">Sign in with Twitch to submit a run.</p>
                </div>
                <div className={styles.footer}>
                    <button
                        type="button"
                        className={styles.btnSecondary}
                        onClick={onClose}
                    >
                        Close
                    </button>
                </div>
            </BoardDialog>
        );
    }

    if (!category) {
        return (
            <BoardDialog
                open={open}
                onClose={onClose}
                labelledBy="submit-run-dialog-title"
                themed
                size="md"
            >
                <DialogHeader game={game} coverUrl={coverUrl} />
                <div className={styles.body}>
                    <p className="mb-0">
                        This game has no categories to submit to yet.
                    </p>
                </div>
                <div className={styles.footer}>
                    <button
                        type="button"
                        className={styles.btnSecondary}
                        onClick={onClose}
                    >
                        Close
                    </button>
                </div>
            </BoardDialog>
        );
    }

    return (
        <BoardDialog
            open={open}
            onClose={onClose}
            labelledBy="submit-run-dialog-title"
            themed
            size="lg"
        >
            <DialogHeader game={game} coverUrl={coverUrl} />

            {result ? (
                <>
                    <div className={styles.body}>
                        <p className="mb-0">
                            {result.applied === 'instant'
                                ? 'The run is on the board.'
                                : 'The run is submitted and awaiting verification. It appears on the board marked unverified.'}
                        </p>
                        {result.team.length > 1 && (
                            <>
                                <p className="mb-0 mt-2">
                                    It credits {formatTeam(result.team)}
                                    {'. '}
                                    Everyone with an account has been told.
                                </p>
                                {/* A different roster files a SECOND time
                                    rather than correcting this one (guide
                                    §11.9), so nothing here may read as
                                    "submit it again to fix the runners". */}
                                <p className={styles.hint}>
                                    To change who this time credits, open it and
                                    edit its runners.
                                </p>
                            </>
                        )}
                        <div className={styles.successActions}>
                            <Link
                                href={buildBoardHref(game.name, {
                                    categorySlug: category.name,
                                    subcategoryKey,
                                })}
                                className={styles.btnPrimary}
                            >
                                See it on the board
                            </Link>
                            <Link
                                href={buildManualTimeHref(
                                    game.name,
                                    result.manualTimeId,
                                )}
                                className={styles.btnSecondary}
                            >
                                View the run
                            </Link>
                            <button
                                type="button"
                                className={styles.btnSecondary}
                                onClick={reset}
                            >
                                Submit another
                            </button>
                        </div>
                    </div>
                    <div className={styles.footer}>
                        <button
                            type="button"
                            className={styles.btnSecondary}
                            onClick={onClose}
                        >
                            Close
                        </button>
                    </div>
                </>
            ) : (
                <>
                    <div className={styles.body}>
                        <ol className={styles.rail}>
                            {steps.map((s, i) => (
                                <li
                                    key={s}
                                    className={`${styles.railStep} ${
                                        i === stepIndex
                                            ? styles.railStepActive
                                            : ''
                                    }`}
                                    aria-current={
                                        i === stepIndex ? 'step' : undefined
                                    }
                                >
                                    <span
                                        className={`${styles.railDot} ${
                                            i === stepIndex
                                                ? styles.railDotActive
                                                : i < stepIndex
                                                  ? styles.railDotDone
                                                  : ''
                                        }`}
                                    >
                                        {i + 1}
                                    </span>
                                    {STEP_LABELS[s]}
                                    {i < steps.length - 1 && (
                                        <span className={styles.railSep} />
                                    )}
                                </li>
                            ))}
                        </ol>

                        {step === 'runner' && (
                            <StepRunner
                                gameId={game.id}
                                gameSlug={game.name}
                                board={{
                                    categoryId: category.id,
                                    subcategoryKey,
                                }}
                                choice={choice}
                                onChoice={setChoice}
                                coopBoard={coopBoard !== null}
                            />
                        )}

                        {step === 'time' && (
                            <StepTime
                                primaryTiming={primaryTiming}
                                showSecondary={showSecondary}
                                gameTimeLabel={category.gameTimeLabel ?? 'igt'}
                                timeMs={timeMs}
                                onTimeChange={setTimeMs}
                                secondaryMs={secondaryMs}
                                onSecondaryChange={setSecondaryMs}
                                runDate={runDate}
                                onRunDateChange={setRunDate}
                                vodUrl={vodUrl}
                                onVodChange={(v) => {
                                    if (
                                        detectVod(v)?.id !==
                                        detectVod(vodUrl)?.id
                                    ) {
                                        setVodReview(null);
                                    }
                                    setVodUrl(v);
                                    setVodTouched(true);
                                }}
                                vodTouched={vodTouched}
                                onVodBlur={() => setVodTouched(true)}
                                vodReview={vodReview}
                                onVodReviewChange={setVodReview}
                            />
                        )}

                        {step === 'time' && coopBoard && (
                            <StepRunners
                                teamLeadName={teamLeadName}
                                teamLeadIsGuest={
                                    choice ? choice.kind === 'name-only' : false
                                }
                                players={coopBoard.players}
                                rows={partnerRows}
                                onRowsChange={(rows) => {
                                    setPartnerRows(rows);
                                    setRosterError(null);
                                    setShowBlocker(false);
                                }}
                                sectionError={rosterError}
                                blocker={showBlocker ? rosterBlock : null}
                                pending={submitting}
                            />
                        )}

                        {error && (
                            <div className={styles.errorAlert} role="alert">
                                {error}
                            </div>
                        )}

                        {step === 'board' && (
                            <StepBoard
                                categories={categories}
                                groups={groups}
                                categoryId={categoryId}
                                onCategoryChange={setCategoryId}
                                subcatDefs={subcatDefs}
                                subcategory={subcategory}
                                onSubcategoryChange={(name, value) =>
                                    setSubcategory((prev) => ({
                                        ...prev,
                                        [name]: value,
                                    }))
                                }
                                varsLoading={varsLoading}
                                varsError={varsError}
                                gameRules={gameRules}
                                categoryRules={category.rules}
                                emulatorPolicy={emulatorPolicy}
                                rulesOpen={rulesOpen}
                                onToggleRules={() => setRulesOpen((o) => !o)}
                            />
                        )}
                    </div>

                    <div className={styles.footer}>
                        {stepIndex > 0 && (
                            <button
                                type="button"
                                className={styles.btnSecondary}
                                onClick={() => setStepIndex((i) => i - 1)}
                            >
                                Back
                            </button>
                        )}
                        <button
                            type="button"
                            className={styles.btnSecondary}
                            onClick={onClose}
                        >
                            Cancel
                        </button>
                        {stepIndex < steps.length - 1 ? (
                            <button
                                type="button"
                                className={styles.btnPrimary}
                                disabled={!stepValid}
                                onClick={() => setStepIndex((i) => i + 1)}
                            >
                                Next
                            </button>
                        ) : (
                            <button
                                type="button"
                                className={styles.btnPrimary}
                                disabled={!stepValid}
                                onClick={submit}
                            >
                                {submitting ? 'Submitting…' : 'Submit run'}
                            </button>
                        )}
                    </div>
                </>
            )}
        </BoardDialog>
    );
}
