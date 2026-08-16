'use client';

import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { selfClaimTimeAction } from '~src/actions/self-claim.action';
import { GameImage } from '~src/components/image/gameimage';
import Link from '~src/components/link';
import { buildBoardHref, gameSegment } from '~src/lib/board-url';
import { otherTiming, validateRunTimes } from '~src/lib/run-times';
import type {
    ResolvedCategory,
    ResolvedGroup,
    VariableRow,
} from '../../../../../types/leaderboards.types';
import type { ModTiming } from '../../../../../types/moderation.types';
import { createManualTimeAction } from '../manage/moderation/shared/actions/manual-times.action';
import type { EmulatorPolicy } from '../rules/rules-panel';
import { BoardDialog } from '../shared/board-dialog';
import { loadVariablesAction } from '../submit/load-variables.action';
import { buildSubcategoryKey } from '../submit/subcategory-key';
import type { RunnerChoice } from './runner-state';
import { StepBoard } from './step-board';
import { StepRunner } from './step-runner';
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

    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<{
        applied: 'instant' | 'provisional';
        manualTimeId: number;
    } | null>(null);

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
        setError(null);
        setResult(null);
    };

    const submit = async () => {
        if (!category || timeMs === null) return;
        setSubmitting(true);
        setError(null);

        // The other clock rides along as a second row when it was filled in.
        const secondary =
            secondaryMs !== null
                ? { timing: otherTiming(primaryTiming), timeMs: secondaryMs }
                : null;

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
                reason: 'Added via Submit a run',
            });
            setSubmitting(false);
            if ('error' in res) {
                setError(res.error);
                return;
            }
            // A moderator entering a time is the verification — it lands on
            // the board directly, which is why this path carries no `applied`.
            setResult({ applied: 'instant', manualTimeId: res.result.id });
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
        });
        setSubmitting(false);
        if ('error' in res) {
            setError(res.error);
            return;
        }
        setResult({ applied: res.applied, manualTimeId: res.manualTimeId });
    };

    if (!open) return null;

    if (!sessionUsername) {
        return (
            <BoardDialog
                open={open}
                onClose={onClose}
                labelledBy="submit-run-dialog-title"
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
                                href={`/games-v2/${gameSegment(game.name)}/manual/${result.manualTimeId}`}
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
                                    setVodUrl(v);
                                    setVodTouched(true);
                                }}
                                vodTouched={vodTouched}
                                onVodBlur={() => setVodTouched(true)}
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
