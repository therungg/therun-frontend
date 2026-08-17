'use client';

import moment from 'moment';
import { useEffect, useId, useRef, useState, useTransition } from 'react';
import {
    BoxArrowUpRight,
    CameraVideoOff,
    ChevronDown,
    ChevronUp,
    ExclamationTriangle,
} from 'react-bootstrap-icons';
import { createPortal } from 'react-dom';
import { toast } from 'react-toastify';
import type { ModVerb } from '~app/(new-layout)/games-v2/[game]/manage/moderation/shared/action-model';
import {
    RunActionForm,
    VERB_TITLE,
} from '~app/(new-layout)/games-v2/[game]/manage/moderation/shared/run-action-dialog';
import {
    loadRunHistoryAction,
    loadSelfEligibleRunsAction,
    selfMoveRunAction,
} from '~src/actions/run-user-actions.action';
import Link from '~src/components/link';
import { Vod } from '~src/components/run/dashboard/vod';
import { DurationToFormatted } from '~src/components/util/datetime';
import { formatRunDate } from '~src/lib/format-run-date';
import { describeEvent } from '~src/lib/run-view/describe-event';
import { isEmbeddableVod } from '~src/lib/vod-url';
import type {
    GameTimeLabel,
    LeaderboardEntry,
    ResolvedCategory,
    VariableRow,
} from '../../../../../types/leaderboards.types';
import type {
    HistoryEvent,
    UserEligibleRunRow,
} from '../../../../../types/moderation.types';
import { AdjustDialog } from '../manage/boards/adjust-dialog';
import { MoveDialog } from '../manage/boards/move-dialog';
import { loadUserEligibleRunsAction } from '../manage/moderation/shared/actions/eligible-runs.action';
import { excludeAction } from '../manage/moderation/shared/actions/exclude.action';
import { markRunsAction } from '../manage/moderation/shared/actions/marks.action';
import { restoreRunsAction } from '../manage/moderation/shared/actions/restore.action';
import { applyVerdictsAction } from '../manage/moderation/shared/actions/verdicts.action';
import { useDialogBehavior } from '../shared/board-dialog';
import { OwnerRemoveForm } from '../shared/owner-remove-form';
import {
    SelfRunVerdictDialog,
    useSelfRunVerdict,
} from '../shared/self-run-verdict';
import { buildSubcategoryKey } from '../submit/subcategory-key';
import { attachVodAction } from './actions/attach-vod.action';
import { loadModBoardContextAction } from './actions/load-mod-board-context.action';
import { loadOwnerBoardContextAction } from './actions/load-owner-board-context.action';
import { HideIdentityDialog } from './hide-identity-dialog';
import {
    type HistoryUndoPlan,
    historyUndoPlan,
    historyUndoReason,
} from './history-undo';
import { entryToRosterRow } from './mod-row';
import { relativeDate } from './relative-date';
import { isOutlierImprovement, runBoardContext } from './run-context';
import styles from './run-inspector.module.scss';
import type { TimingKey } from './timing-columns';
import { detectVod } from './vod-review/player/types';
import { ReviewVodPanel } from './vod-review/review-vod-panel';

/**
 * Who is looking. `'mod'` is the full moderation surface; `'owner'` is the
 * reduced one a runner gets on their OWN row and nobody else's. A moderator
 * keeps `'mod'` even on their own run — the mod surface is a superset of the
 * owner's, so downgrading it would take verbs away from someone who has them.
 */
export type InspectorMode = 'mod' | 'owner';

interface Props {
    /** The inspected row — always a real run (runId != null). */
    entry: LeaderboardEntry;
    gameSlug: string;
    /** Numeric game id — the owner verbs are all game-scoped `/v1/me/*` calls. */
    gameId: number;
    /** Human game name, for the owner's hide-identity copy ("across {game}"). */
    gameDisplay?: string;
    mode?: InspectorMode;
    categorySlug: string;
    /** Human name for this board — shown, and used to match the runner's
     * other runs (eligible-runs rows key categories by display name). */
    categoryDisplay: string;
    /** The board's category id — Remove's runner-scope and custom-time
     * options are built from it. A prop, not the lazily-fetched mod
     * context: the choices must exist the instant the form opens. */
    categoryId?: number;
    /** category.requireVideo — turns a missing VOD into a stated blocker. */
    requireVideo?: boolean;
    /** Which clock this board ranks on. Decides which time reads primary. */
    primaryTiming: TimingKey;
    /**
     * `category.rtaFallback` — a game-time board that also ranks RTA-only
     * runs, by their real time. The owner hide wizard has to know, or it drops
     * the runner's RTA-only runs from its roster and mis-states what is left
     * standing. See OwnerRemoveFormProps.
     */
    rtaFallback?: boolean;
    /** Subcategory-role variable names — builds this run's own subcategory
     * key for the Move/Adjust/Hide-identity dialogs. */
    subcategoryDefKeys: string[];
    gameTimeLabel?: GameTimeLabel;
    showMilliseconds: boolean;
    onClose: () => void;
    /** Board page refetch after any verb lands (or is undone). */
    onMutated: () => void;
    /**
     * Owner mode: open the host's game-wide "hide my identity" dialog.
     *
     * The dialog is deliberately NOT rendered in here. Anything it lands
     * triggers the host's board refetch, the runner's row comes back
     * anonymized, the host's own owner-mode render guard stops matching it,
     * and this whole drawer — dialog included — unmounts mid-read. Owning the
     * dialog at the host level is what lets it survive to report what actually
     * happened (a lift can leave a moderator's rule standing), and it is also
     * where the board-level un-hide note lives.
     *
     * Absent in owner mode = no host affordance to open, so the control is not
     * offered at all rather than rendered dead.
     */
    onOpenHideIdentity?: () => void;
    /** Step to the adjacent run row without closing — j/k also bind to these. */
    onPrev?: () => void;
    onNext?: () => void;
    /** Open with this verb form already expanded (the row's Remove/`x`
     * routes here instead of a standalone dialog, so the board stays
     * visible behind the judgement). */
    initialVerb?: ModVerb;
}

interface ModBoardContext {
    gameDisplay: string;
    categories: ResolvedCategory[];
    variables: VariableRow[];
}

type ModDialogKind = 'move' | 'adjust' | 'hide-identity';

/** Inline Undo on the timeline's latest event — runs the mapped inverse. */
function TimelineUndoButton({
    gameSlug,
    runId,
    event,
    plan,
    onUndone,
}: {
    gameSlug: string;
    runId: number;
    event: HistoryEvent;
    plan: HistoryUndoPlan;
    onUndone: () => void;
}) {
    const [isPending, startTransition] = useTransition();

    const undo = () => {
        startTransition(async () => {
            const reason = historyUndoReason(event);
            const res =
                plan.kind === 'verdict'
                    ? await applyVerdictsAction(
                          gameSlug,
                          plan.action,
                          [runId],
                          reason,
                      )
                    : plan.kind === 'restore'
                      ? await restoreRunsAction(gameSlug, [runId], reason)
                      : plan.kind === 'exclude'
                        ? await excludeAction(gameSlug, {
                              runIds: [runId],
                              reason,
                          })
                        : await markRunsAction(gameSlug, [runId], plan.marked);
            if ('error' in res) {
                toast.error(res.error);
                return;
            }
            toast.success('Undone.');
            onUndone();
        });
    };

    return (
        <button
            type="button"
            className={styles.timelineUndo}
            onClick={undo}
            disabled={isPending}
        >
            {isPending ? 'Undoing…' : '↩ Undo'}
        </button>
    );
}

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
    pending: { label: 'Pending', className: 'text-bg-warning' },
    verified: { label: 'Verified', className: 'text-bg-success' },
    rejected: { label: 'Rejected', className: 'text-bg-danger' },
};

/** The verbs the footer offers for a run in this verification state. The
 * first is the constructive one (and takes the primary button). */
export function verbsForStatus(
    status: LeaderboardEntry['verificationStatus'],
): ModVerb[] {
    const verbs: ModVerb[] = [];
    if (status === 'pending') verbs.push('approve');
    if (status === 'verified') verbs.push('unverify');
    if (status === 'rejected') verbs.push('restore');
    verbs.push('remove');
    return verbs;
}

/**
 * The verbs the footer offers, given who is looking.
 *
 * The owner gets exactly one, and it is never a judgement on the run: a
 * rejected run of yours can be brought back, anything else can be taken off
 * the board. Approve/Unverify are moderator verdicts on someone's work and
 * have no owner-facing meaning — a runner verifying their own run is the
 * thing verification exists to prevent.
 */
export function inspectorVerbs(
    mode: InspectorMode,
    status: LeaderboardEntry['verificationStatus'],
): ModVerb[] {
    if (mode === 'owner') {
        return [status === 'rejected' ? 'restore' : 'remove'];
    }
    return verbsForStatus(status);
}

/** Owner-facing labels for the two verbs `inspectorVerbs` can return. The
 * vocabulary is "hide", not "remove" — it matches the wizard this button
 * expands (`OwnerRemoveForm`) and its sibling `SelfRunVerdictDialog`, and it
 * is the truthful word: a hidden run is restorable, it is not deleted. */
const OWNER_VERB_TITLE: Partial<Record<ModVerb, string>> = {
    restore: 'Restore my run',
    remove: 'Hide my run…',
};

/** Keyboard shortcut per verb, shown on the button and bound below. `v` is
 * the verification key in both directions — the statuses make approve and
 * unverify mutually exclusive, so it never means both at once. */
const VERB_KEY: Partial<Record<ModVerb, string>> = {
    approve: 'v',
    unverify: 'v',
    restore: 'v',
    remove: 'x',
};

/**
 * The evidence block — the video, or the fact that there isn't one, and in
 * either case a way to fix that from here.
 *
 * A moderator who finds a run with no VOD used to have to go somewhere else
 * to attach one (or bounce it back to the runner). Missing evidence is the
 * single most common reason a run stalls, so the "no video" state is itself
 * the control: click it, paste a link, done. No reason field — the mod log
 * records who attached what, and the server action stamps the sentence.
 */
function EvidenceSection({
    vodUrl,
    requireVideo,
    gameSlug,
    runId,
    categorySlug,
    subcategoryKey,
    onMutated,
    editable = true,
}: {
    vodUrl: string | null;
    requireVideo: boolean;
    gameSlug: string;
    runId: number;
    categorySlug: string;
    subcategoryKey: string;
    onMutated: () => void;
    /** False in owner mode: `attachVodAction` is moderator-gated, so the
     * paste-a-link affordances would offer a 403. The evidence still shows;
     * only the editing controls go. */
    editable?: boolean;
}) {
    // What we last saved, held locally so the block updates the instant the
    // action returns rather than waiting on the board refetch behind it.
    // Remounted per run (`key={runId}`), so it never leaks across rows.
    const [saved, setSaved] = useState<string | null | undefined>(undefined);
    const url = saved === undefined ? vodUrl : saved;

    const [editing, setEditing] = useState(false);
    const [text, setText] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();
    const [reviewing, setReviewing] = useState(false);
    const inputId = useId();

    const openEditor = () => {
        setText(url ?? '');
        setError(null);
        setEditing(true);
    };

    const save = (next: string | null) => {
        setError(null);
        startTransition(async () => {
            const res = await attachVodAction(gameSlug, runId, next, {
                categorySlug,
                subcategoryKey,
            });
            if ('error' in res) {
                setError(res.error);
                return;
            }
            setSaved(res.url);
            setEditing(false);
            toast.success(res.url ? 'Video attached.' : 'Video link removed.');
            onMutated();
        });
    };

    if (editing && editable) {
        return (
            <div className={styles.evidence}>
                <form
                    className={styles.vodForm}
                    onSubmit={(e) => {
                        e.preventDefault();
                        save(text);
                    }}
                >
                    <label className={styles.vodFormLabel} htmlFor={inputId}>
                        Video link
                    </label>
                    <div className={styles.vodFormRow}>
                        {/* autoFocus is safe here: the field only mounts on
                            an explicit click asking to type into it. */}
                        <input
                            id={inputId}
                            type="url"
                            className={`form-control ${styles.vodInput}`}
                            placeholder="https://twitch.tv/videos/…"
                            value={text}
                            autoFocus
                            disabled={isPending}
                            onChange={(e) => setText(e.target.value)}
                        />
                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={isPending || text.trim() === ''}
                        >
                            {isPending ? 'Saving…' : 'Attach'}
                        </button>
                        <button
                            type="button"
                            className={styles.secondaryBtn}
                            disabled={isPending}
                            onClick={() => setEditing(false)}
                        >
                            Cancel
                        </button>
                    </div>
                    {error != null && (
                        <p className="text-danger small mb-0">{error}</p>
                    )}
                    <p className={styles.vodHint}>
                        YouTube and Twitch links play inline here. Anything else
                        is saved as a link. Changing the link clears any saved
                        frame markers.
                    </p>
                    {url != null && (
                        <button
                            type="button"
                            className={styles.vodRemove}
                            disabled={isPending}
                            onClick={() => save(null)}
                        >
                            Remove the current link
                        </button>
                    )}
                </form>
            </div>
        );
    }

    if (url == null) {
        if (!editable) {
            // Owner mode. `attachVodAction` is moderator-gated, so the runner
            // has no control here — stating a bare requirement with the
            // Add-a-link affordance stripped would be a blocker with no route
            // out of it. Name the route instead.
            return (
                <div className={styles.evidence}>
                    <span className={styles.noVod}>
                        <CameraVideoOff size={16} aria-hidden />
                        <span className={styles.noVodText}>
                            {requireVideo
                                ? 'No video attached. This board requires one, so a moderator has to add the link to this run for you.'
                                : 'No video attached.'}
                        </span>
                    </span>
                </div>
            );
        }
        return (
            <div className={styles.evidence}>
                <button
                    type="button"
                    className={`${styles.noVod} ${
                        requireVideo ? styles.noVodRequired : ''
                    }`}
                    onClick={openEditor}
                >
                    <CameraVideoOff size={16} aria-hidden />
                    <span className={styles.noVodText}>
                        {requireVideo
                            ? 'No video attached. This board requires one.'
                            : 'No video attached.'}
                    </span>
                    <span className={styles.noVodCta}>Add a link</span>
                </button>
            </div>
        );
    }

    const reviewable = editable && detectVod(url) != null;

    return (
        <div className={styles.evidence}>
            {reviewing ? (
                <ReviewVodPanel
                    url={url}
                    target={{ kind: 'run', runId }}
                    gameSlug={gameSlug}
                    onSaved={onMutated}
                />
            ) : isEmbeddableVod(url) ? (
                <div className={styles.vodFrame}>
                    <Vod vod={url} />
                </div>
            ) : (
                <a
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    className={styles.vodLinkCard}
                >
                    <BoxArrowUpRight size={14} aria-hidden />
                    <span>
                        Video attached, opens on another host
                        <span className={styles.vodUrl}>{url}</span>
                    </span>
                </a>
            )}
            <div className={styles.vodActions}>
                <a
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    className={styles.factLink}
                >
                    <BoxArrowUpRight size={12} aria-hidden /> Open in a new tab
                </a>
                {editable && (
                    <button
                        type="button"
                        className={styles.vodEditBtn}
                        onClick={openEditor}
                    >
                        Change link
                    </button>
                )}
                {reviewable && (
                    <button
                        type="button"
                        className={styles.vodEditBtn}
                        onClick={() => setReviewing((v) => !v)}
                    >
                        {reviewing ? 'Close review' : 'Review VOD'}
                    </button>
                )}
            </div>
        </div>
    );
}

/**
 * Run inspector — the board's single-run moderation surface. A right-side
 * drawer over the table, ordered the way the decision is actually made:
 * the evidence (VOD, or its stated absence) first, then the time in the
 * board's own clock with the rank and the runner's own history to judge it
 * against, then the moderation timeline, then the verbs. Verbs expand into
 * the shared RunActionForm inline; v/x fire them, j/k (and the footer
 * arrows) step through the page's run rows without closing.
 */
export function RunInspector({
    entry,
    gameSlug,
    gameId,
    gameDisplay,
    mode = 'mod',
    categorySlug,
    categoryDisplay,
    categoryId,
    requireVideo = false,
    primaryTiming,
    rtaFallback = false,
    subcategoryDefKeys,
    gameTimeLabel = 'igt',
    showMilliseconds,
    onClose,
    onMutated,
    onOpenHideIdentity,
    onPrev,
    onNext,
    initialVerb,
}: Props) {
    const ownerMode = mode === 'owner';
    const runId = entry.runId as number;
    const panelRef = useRef<HTMLDivElement>(null);
    // Portal target isn't available during SSR — mount client-side only,
    // same guard board-dialog.tsx uses.
    const [portalReady, setPortalReady] = useState(false);
    useEffect(() => {
        setPortalReady(true);
    }, []);
    const [activeVerb, setActiveVerb] = useState<ModVerb | null>(
        initialVerb ?? null,
    );
    // A row's Remove/`x` opens the drawer straight onto the verb form; the
    // effect also covers clicking another row's Remove while the drawer is
    // already open (new runId, same verb). Stepping j/k never re-applies —
    // the parent clears its verb on prev/next.
    useEffect(() => {
        if (initialVerb) setActiveVerb(initialVerb);
    }, [initialVerb, runId]);

    const [history, setHistory] = useState<HistoryEvent[] | null>(null);
    const [historyError, setHistoryError] = useState<string | null>(null);
    // Bumped after a timeline undo — some inverses (mark, exclude/include)
    // don't change verificationStatus, so the status-keyed reload below
    // wouldn't fire on its own.
    const [historyReload, setHistoryReload] = useState(0);

    // Runner track record, from the same eligible-runs read the console's
    // Adjust dialog uses — game-wide, so the counts mean "in this game",
    // not "on this page".
    const [runnerRuns, setRunnerRuns] = useState<UserEligibleRunRow[] | null>(
        null,
    );

    // Move/Adjust/Hide-identity need the game's board context (categories +
    // variable defs) — loaded lazily on first use, same as the old kebab, so
    // opening the drawer alone stays cheap.
    const [modCtx, setModCtx] = useState<ModBoardContext | null>(null);
    const [modDialog, setModDialog] = useState<ModDialogKind | null>(null);
    const [_ctxPending, startCtxLoad] = useTransition();

    // Owner mode's "Restore my run" — the same confirm + mutation the run
    // page uses, so the two surfaces can't drift. Unused in mod mode (which
    // restores through the shared RunActionForm), but hooks are
    // unconditional, so it is created either way.
    const selfVerdict = useSelfRunVerdict();
    const selfConfirmOpen = selfVerdict.confirmState != null;
    // The hook closes its confirmation on success and calls router.refresh(),
    // which re-renders the route but does NOT reseed the pager's client-side
    // `board` state — so the drawer would keep showing the run it just
    // restored. Watch the confirmation close and run the board refetch too.
    // Cancel closes it the same way, hence the flag: only a non-cancelled
    // close is a landed mutation.
    const selfCancelled = useRef(false);
    const prevSelfConfirm = useRef(selfVerdict.confirmState);
    useEffect(() => {
        const was = prevSelfConfirm.current;
        prevSelfConfirm.current = selfVerdict.confirmState;
        if (was == null || selfVerdict.confirmState != null) return;
        if (selfCancelled.current) {
            selfCancelled.current = false;
            return;
        }
        onMutated();
        // onMutated is the parent's refetch closure and is recreated per
        // render — depending on it would re-run this on every render.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selfVerdict.confirmState]);

    // While a Move/Adjust/Hide-identity dialog is stacked on top, hand the
    // focus trap + Escape + scroll lock over to it — two live traps on
    // `document` would fight, and the drawer's Escape would close both. The
    // owner's restore confirmation is the same kind of stacked dialog.
    useDialogBehavior({
        open: modDialog == null && !selfConfirmOpen,
        onClose,
        panelRef,
    });

    const entrySubcategoryKey = buildSubcategoryKey(
        Object.fromEntries(
            Object.entries(entry.variables ?? {}).filter(([k]) =>
                subcategoryDefKeys.includes(k),
            ),
        ),
    );
    const rosterRow = entryToRosterRow(entry, entrySubcategoryKey);
    const modCategory =
        modCtx?.categories.find((c) => c.name === categorySlug) ?? null;
    /**
     * The board this run is on, for the owner wizard's roster filter. Null
     * means genuinely unknown — never coerced to a number, because every id
     * that isn't this board's matches none of the runner's runs and turns
     * "we don't know" into a confident "you have no other times here".
     */
    const ownerCategoryId = categoryId ?? modCategory?.id ?? null;

    const openModDialog = (kind: ModDialogKind) => {
        // The owner's hide-identity dialog lives on the host (see the
        // onOpenHideIdentity prop doc) — it is game-scoped, reads its own
        // state from `/v1/me/anonymize`, and needs no board context, so
        // nothing here has to load first.
        if (ownerMode && kind === 'hide-identity') {
            onOpenHideIdentity?.();
            return;
        }
        if (modCtx != null) {
            if (modCategory == null) {
                toast.error("Could not resolve this board's category.");
                return;
            }
            setModDialog(kind);
            return;
        }
        startCtxLoad(async () => {
            // Same shape, different authority: the mod loader 403s for a
            // non-mod, so owner mode reads the public per-category variables
            // instead (see load-owner-board-context.action.ts). The owner
            // loader takes the board's category id, not its slug — this is
            // always the board currently being viewed, so `categoryId` is
            // reliably this run's own category (the `-1` fallback only
            // matters if the page ever fails to pass it; the post-load
            // `categorySlug` check below still catches that).
            const res = ownerMode
                ? await loadOwnerBoardContextAction(gameSlug, categoryId ?? -1)
                : await loadModBoardContextAction(gameSlug);
            if ('error' in res) {
                toast.error(res.error);
                return;
            }
            const ctx = {
                gameDisplay: res.gameDisplay,
                categories: res.categories,
                variables: res.variables,
            };
            setModCtx(ctx);
            if (!ctx.categories.some((c) => c.name === categorySlug)) {
                toast.error("Could not resolve this board's category.");
                return;
            }
            setModDialog(kind);
        });
    };

    const onModDialogMutated = () => {
        setModDialog(null);
        setHistoryReload((n) => n + 1);
        onMutated();
    };

    // Stepping to another row abandons a half-open verb form — that's the
    // point of the guard in the key handler below, and the explicit arrows
    // reset it so a stale form never applies to the wrong run.
    const step = (dir: 'prev' | 'next') => {
        setActiveVerb(null);
        (dir === 'prev' ? onPrev : onNext)?.();
    };

    // j/k row navigation and v/x verbs. All inert while a verb form is open
    // (typed reasons must not be lost to a stray key), while a stacked
    // dialog owns the keyboard, and while focus sits in any text field.
    const verbs = inspectorVerbs(mode, entry.verificationStatus);
    // Owner "restore" is a confirm dialog, not an inline form — the button
    // and the `v` key both route here instead of through `activeVerb`.
    const startVerb = (verb: ModVerb) => {
        if (ownerMode && verb === 'restore') {
            selfCancelled.current = false;
            selfVerdict.requestVerdict(runId, 'unreject');
            return;
        }
        setActiveVerb(verb);
    };
    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if (activeVerb != null || modDialog != null || selfConfirmOpen)
                return;
            if (e.metaKey || e.ctrlKey || e.altKey) return;
            const t = e.target as HTMLElement | null;
            if (
                t &&
                (t.tagName === 'INPUT' ||
                    t.tagName === 'TEXTAREA' ||
                    t.tagName === 'SELECT' ||
                    t.isContentEditable)
            ) {
                return;
            }
            if (e.key === 'j' && onNext) {
                e.preventDefault();
                step('next');
            } else if (e.key === 'k' && onPrev) {
                e.preventDefault();
                step('prev');
            } else {
                const hit = verbs.find((v) => VERB_KEY[v] === e.key);
                if (hit) {
                    e.preventDefault();
                    startVerb(hit);
                }
            }
        };
        document.addEventListener('keydown', onKeyDown);
        return () => document.removeEventListener('keydown', onKeyDown);
        // step is stable enough — it only wraps the two props below.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        activeVerb,
        modDialog,
        selfConfirmOpen,
        onNext,
        onPrev,
        entry.verificationStatus,
        mode,
    ]);

    // History reloads on run change and after a verdict lands (the parent's
    // refetch hands back an entry whose status reflects the action).
    useEffect(() => {
        let stale = false;
        setHistory(null);
        setHistoryError(null);
        loadRunHistoryAction(runId).then((res) => {
            if (stale) return;
            if ('error' in res) setHistoryError(res.error);
            else setHistory(res.events);
        });
        return () => {
            stale = true;
        };
    }, [runId, entry.verificationStatus, historyReload]);

    // The same roster, read through whichever route the viewer is entitled
    // to: the mod one takes an arbitrary userId and is moderator-gated; the
    // owner one is scoped to the caller. In owner mode the inspected run IS
    // the caller's, so the two return the same rows.
    useEffect(() => {
        const userId = entry.userId;
        if (!ownerMode && userId == null) {
            setRunnerRuns(null);
            return;
        }
        let stale = false;
        setRunnerRuns(null);
        const load = ownerMode
            ? loadSelfEligibleRunsAction(gameId)
            : loadUserEligibleRunsAction(gameSlug, userId as number);
        load.then((res) => {
            if (stale || 'error' in res) return;
            setRunnerRuns(res.rows);
        });
        return () => {
            stale = true;
        };
    }, [gameSlug, gameId, ownerMode, entry.userId]);

    const badge =
        entry.source === 'manual'
            ? null
            : (STATUS_BADGE[entry.verificationStatus] ?? null);
    const variableValues = Object.values(entry.variables ?? {});
    const gtLabel = gameTimeLabel === 'lrt' ? 'Load-removed time' : 'Game time';

    // Which number this board actually ranks on reads primary; the other
    // clock stays as a quiet cross-check. On a game-time board a run with no
    // game time ranks by its real time (rtaFallback) — say so rather than
    // showing an unlabelled number in the primary slot.
    const rankedOnFallback =
        primaryTiming === 'gt' &&
        entry.gameTime == null &&
        entry.realTime != null;
    const primaryMs =
        primaryTiming === 'gt'
            ? (entry.gameTime ?? entry.realTime)
            : entry.realTime;
    const primaryLabel =
        primaryTiming === 'gt'
            ? rankedOnFallback
                ? `Real time, ranked in place of ${gtLabel.toLowerCase()}`
                : gtLabel
            : 'Real time';
    const secondaryMs =
        primaryTiming === 'gt'
            ? rankedOnFallback
                ? null
                : entry.realTime
            : entry.gameTime;
    const secondaryLabel = primaryTiming === 'gt' ? 'Real time' : gtLabel;

    const ctx = runBoardContext(runnerRuns, {
        runId,
        categoryDisplay,
        subcategoryKey: entrySubcategoryKey,
        timing: primaryTiming,
        timeMs: primaryMs,
        runDate: entry.runDate,
    });
    const rank = ctx.rank ?? entry.rank;
    const outlier = isOutlierImprovement(ctx);

    const modCategoryTimeMs =
        modCategory?.primaryTiming === 'gt'
            ? (rosterRow?.gameTime ?? null)
            : (rosterRow?.time ?? null);

    const verbDone = () => {
        setActiveVerb(null);
        onMutated();
    };

    if (!portalReady) return null;

    // Portalled to <body>, and this is not cosmetic. The site shell puts
    // `.main` at `position: relative; z-index: 1` under a `.background` at
    // `z-index: 0` (layout.module.scss), so everything the board page renders
    // is sealed inside `.main`'s stacking context. A drawer left in that
    // subtree cannot out-stack anything outside it at any z-index — the
    // header at z-index 10 covers it outright, and it competes with the
    // sidebar rail (position: sticky, its own stacking context) on terms it
    // never asked for. Dialogs already escape this way (board-dialog.tsx);
    // the drawer was the outlier.
    return createPortal(
        <>
            <button
                type="button"
                aria-label="Close run inspector"
                className={`position-fixed top-0 start-0 w-100 h-100 border-0 p-0 ${styles.backdrop}`}
                onClick={onClose}
            />
            <div
                ref={panelRef}
                className={`position-fixed top-0 end-0 h-100 bg-body shadow-lg d-flex flex-column ${styles.panel}`}
                role="dialog"
                aria-modal="true"
                aria-label={
                    ownerMode
                        ? 'Manage your run'
                        : `Moderate ${entry.runnerName}'s run`
                }
            >
                {/* The header carries the run's identity — a static
                    "Moderate run" title spent a whole bar saying what the
                    footer's buttons already say. */}
                <div className={styles.header}>
                    <div className={styles.headerMain}>
                        <div className={styles.headerTop}>
                            <span className={styles.runnerName}>
                                {entry.runnerName}
                            </span>
                            {badge && (
                                <span className={`badge ${badge.className}`}>
                                    {badge.label}
                                </span>
                            )}
                        </div>
                        <div className={styles.headerSub}>
                            {categoryDisplay}
                            {variableValues.length > 0 &&
                                ` · ${variableValues.join(' / ')}`}
                            {entry.runDate && (
                                <>
                                    {' · '}
                                    <span title={formatRunDate(entry.runDate)}>
                                        {relativeDate(entry.runDate)}
                                    </span>
                                </>
                            )}
                        </div>
                    </div>
                    <button
                        type="button"
                        className="btn-close"
                        aria-label="Close"
                        onClick={onClose}
                    />
                </div>

                <div className="flex-grow-1 overflow-auto">
                    {/* Evidence. Verification means watching the run, so the
                        video (or the fact that there isn't one) leads. */}
                    <EvidenceSection
                        key={runId}
                        vodUrl={entry.vodUrl ?? null}
                        requireVideo={requireVideo}
                        gameSlug={gameSlug}
                        runId={runId}
                        categorySlug={categorySlug}
                        subcategoryKey={entrySubcategoryKey}
                        onMutated={onMutated}
                        editable={!ownerMode}
                    />

                    {/* The time, in the clock this board ranks on, with what
                        it takes to judge it: its rank, and the runner's own
                        previous best. */}
                    <div className={styles.timeBlock}>
                        <div className={styles.primaryTimeRow}>
                            <span className={styles.primaryTime}>
                                {primaryMs != null ? (
                                    <DurationToFormatted
                                        duration={primaryMs}
                                        withMillis={showMilliseconds}
                                    />
                                ) : (
                                    '—'
                                )}
                            </span>
                            {rank != null && rank > 0 && (
                                <span className={styles.rankChip}>
                                    #{rank}
                                    {ctx.totalRunners != null &&
                                        ctx.totalRunners > 0 &&
                                        ` of ${ctx.totalRunners}`}
                                </span>
                            )}
                        </div>
                        <div className={styles.primaryTimeLabel}>
                            {primaryLabel}
                        </div>

                        {secondaryMs != null && (
                            <div className={styles.secondaryTime}>
                                {secondaryLabel}{' '}
                                <DurationToFormatted
                                    duration={secondaryMs}
                                    withMillis={showMilliseconds}
                                />
                            </div>
                        )}

                        <div className={styles.record}>
                            {runnerRuns == null ? (
                                <span className="text-muted">
                                    {ownerMode
                                        ? 'Loading your other runs…'
                                        : "Loading the runner's history…"}
                                </span>
                            ) : ctx.previousBestMs == null ? (
                                <span className="text-muted">
                                    {ownerMode
                                        ? 'Your first run on this board.'
                                        : 'First run by this runner on this board.'}
                                </span>
                            ) : (
                                <>
                                    <span className="text-muted">
                                        Previous best{' '}
                                    </span>
                                    <DurationToFormatted
                                        duration={ctx.previousBestMs}
                                        withMillis={showMilliseconds}
                                    />
                                    {ctx.deltaMs != null && (
                                        <span
                                            className={
                                                ctx.deltaMs < 0
                                                    ? styles.deltaFaster
                                                    : styles.deltaSlower
                                            }
                                        >
                                            {' '}
                                            {ctx.deltaMs < 0 ? '−' : '+'}
                                            <DurationToFormatted
                                                duration={Math.abs(ctx.deltaMs)}
                                                withMillis={showMilliseconds}
                                            />
                                        </span>
                                    )}
                                    <span className="text-muted">
                                        {` · ${ctx.previousRunCount} earlier run${
                                            ctx.previousRunCount === 1
                                                ? ''
                                                : 's'
                                        } here`}
                                    </span>
                                </>
                            )}
                        </div>

                        {/* "Worth watching before verifying" is a note to the
                            person doing the verifying. In owner mode the same
                            fact is just a fact about the runner's own time. */}
                        {outlier && (
                            <div className={styles.outlier}>
                                <ExclamationTriangle size={14} aria-hidden />
                                <span>
                                    {ownerMode
                                        ? 'Cuts more than 15% off your own best on this board.'
                                        : "Cuts more than 15% off this runner's own best on this board. Worth watching before verifying."}
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Runner strip — context only. Runner-scoped verbs (ban,
                        anonymize lifting, …) live on the runner page, not
                        here. */}
                    <div className={styles.runnerStrip}>
                        {entry.userId != null ? (
                            <>
                                <span className="small text-muted">
                                    {runnerRuns == null
                                        ? ' '
                                        : `${ownerMode ? "You're on" : 'On'} ${
                                              ctx.boardCount
                                          } board${
                                              ctx.boardCount === 1 ? '' : 's'
                                          } in this game`}
                                </span>
                                {/* Moderator-only route — an owner following
                                    it would land on a 403. */}
                                {!ownerMode && (
                                    <Link
                                        href={`/games-v2/${encodeURIComponent(gameSlug)}/manage/moderation/runner/${entry.userId}?from=board`}
                                        className={styles.factLink}
                                    >
                                        Runner page →
                                    </Link>
                                )}
                            </>
                        ) : (
                            <span className="text-muted small">
                                {entry.isGuest
                                    ? 'Guest submission, with no runner account.'
                                    : 'Runner identity is hidden.'}
                            </span>
                        )}
                        <Link
                            href={`/games-v2/${encodeURIComponent(gameSlug)}/run/${runId}`}
                            className={styles.factLink}
                        >
                            <BoxArrowUpRight size={12} aria-hidden /> Run page
                        </Link>
                    </div>

                    {/* History timeline */}
                    <div className={styles.historyBlock}>
                        <h3 className={styles.sectionTitle}>
                            Moderation history
                        </h3>
                        {historyError != null && (
                            <p className="text-danger small mb-0">
                                {historyError}
                            </p>
                        )}
                        {historyError == null && history === null && (
                            <p className="text-muted small mb-0">Loading…</p>
                        )}
                        {history !== null && history.length === 0 && (
                            <p className="text-muted small mb-0">
                                This run has never been actioned.
                            </p>
                        )}
                        {history !== null && history.length > 0 && (
                            <ul className={styles.historyList}>
                                {history.map((event, i) => {
                                    const plan = historyUndoPlan(
                                        event,
                                        i === history.length - 1,
                                    );
                                    return (
                                        <li
                                            key={`${event.at}-${i}`}
                                            className={styles.historyItem}
                                        >
                                            <div
                                                className="d-flex align-items-baseline
                                                    justify-content-between gap-2"
                                            >
                                                <span
                                                    className={
                                                        styles.historyEvent
                                                    }
                                                >
                                                    {describeEvent(event)}
                                                </span>
                                                {/* Undo runs moderator
                                                    verbs — never offered to
                                                    an owner. */}
                                                {plan && !ownerMode && (
                                                    <TimelineUndoButton
                                                        gameSlug={gameSlug}
                                                        runId={runId}
                                                        event={event}
                                                        plan={plan}
                                                        onUndone={() => {
                                                            setHistoryReload(
                                                                (n) => n + 1,
                                                            );
                                                            onMutated();
                                                        }}
                                                    />
                                                )}
                                            </div>
                                            <div className="text-muted small">
                                                {event.by?.name ?? event.byRole}{' '}
                                                · {moment(event.at).fromNow()}
                                            </div>
                                            {event.reason && (
                                                <div
                                                    className={
                                                        styles.historyReason
                                                    }
                                                >
                                                    “{event.reason}”
                                                </div>
                                            )}
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </div>
                </div>

                {/* Verb footer — buttons for the run's state; picking one
                    expands the shared action form in place. The constructive
                    verb leads and takes the width; removal is deliberately
                    quieter than the thing it undoes. "…" is reserved for the
                    controls that open a separate dialog. */}
                <div className="border-top">
                    {activeVerb == null ? (
                        <>
                            <div className={styles.actionBar}>
                                {verbs.map((verb, i) => (
                                    <button
                                        key={verb}
                                        type="button"
                                        className={`btn ${styles.verbBtn} ${
                                            // Unverify never takes the green
                                            // primary slot even when it leads:
                                            // it's a neutral "back to the
                                            // queue", not an endorsement.
                                            i === 0 &&
                                            verb !== 'remove' &&
                                            verb !== 'unverify'
                                                ? `btn-success ${styles.verbPrimary}`
                                                : verb === 'remove'
                                                  ? 'btn-outline-danger'
                                                  : 'btn-outline-secondary'
                                        }`}
                                        onClick={() => startVerb(verb)}
                                    >
                                        {ownerMode
                                            ? (OWNER_VERB_TITLE[verb] ??
                                              VERB_TITLE[verb])
                                            : VERB_TITLE[verb]}
                                        {VERB_KEY[verb] && (
                                            <kbd className={styles.verbKey}>
                                                {VERB_KEY[verb]}
                                            </kbd>
                                        )}
                                    </button>
                                ))}
                            </div>
                            <div className={styles.secondaryBar}>
                                {/* Owner-mode Move has nowhere to move a
                                    rejected run from — same status gate the
                                    run page's "Move my run…" applies
                                    (run-actions.tsx's `canMove`). Moderator
                                    Move is unaffected: a mod can still place
                                    a rejected run onto a board. */}
                                {(!ownerMode ||
                                    entry.verificationStatus !==
                                        'rejected') && (
                                    <button
                                        type="button"
                                        className={styles.secondaryBtn}
                                        onClick={() => openModDialog('move')}
                                    >
                                        Move…
                                    </button>
                                )}
                                {/* Correcting a time is a moderator edit
                                    (`editRun`); a runner's own route to the
                                    same outcome is the hide wizard's "set a
                                    time instead". */}
                                {!ownerMode && (
                                    <button
                                        type="button"
                                        className={styles.secondaryBtn}
                                        onClick={() => openModDialog('adjust')}
                                    >
                                        Adjust time…
                                    </button>
                                )}
                                {/* Same dialog on both owner surfaces, so the
                                    same name as the run page's control
                                    (run-actions.tsx). In owner mode the host
                                    owns the dialog; with no host handler there
                                    is nothing to open. */}
                                {(!ownerMode || onOpenHideIdentity != null) && (
                                    <button
                                        type="button"
                                        className={styles.secondaryBtn}
                                        onClick={() =>
                                            openModDialog('hide-identity')
                                        }
                                    >
                                        {ownerMode
                                            ? 'Hide my identity…'
                                            : 'Hide identity…'}
                                    </button>
                                )}
                            </div>
                        </>
                    ) : (
                        <div className={styles.verbForm}>
                            <div className={styles.verbFormTitle}>
                                {ownerMode
                                    ? 'Hide my run'
                                    : `${VERB_TITLE[activeVerb]} — ${entry.runnerName}’s run`}
                            </div>
                            {ownerMode ? (
                                // The board's own category — the wizard
                                // filters the runner's other times to exactly
                                // this board. Falls back to the lazily-loaded
                                // context only if the page didn't pass one;
                                // with NEITHER there is no board to filter by,
                                // and a `0` would match no run and render a
                                // confident "You have no other times on this
                                // board". Say we can't open it instead.
                                ownerCategoryId == null ? (
                                    <p className={styles.verbFormNote}>
                                        We couldn&apos;t work out which board
                                        this run is on, so we can&apos;t show
                                        what hiding it would change. Reload the
                                        page and try again.
                                    </p>
                                ) : (
                                    <OwnerRemoveForm
                                        gameId={gameId}
                                        gameSlug={gameSlug}
                                        runId={runId}
                                        categoryId={ownerCategoryId}
                                        subcategoryKey={entrySubcategoryKey}
                                        primaryTiming={primaryTiming}
                                        rtaFallback={rtaFallback}
                                        runTimeMs={primaryMs}
                                        onDone={verbDone}
                                        onClose={() => setActiveVerb(null)}
                                    />
                                )
                            ) : (
                                <RunActionForm
                                    gameSlug={gameSlug}
                                    verb={activeVerb}
                                    target={{
                                        kind: 'runs',
                                        runIds: [runId],
                                        label: `${entry.runnerName}'s run`,
                                        runTimeMs: primaryMs,
                                        runDate: entry.runDate ?? null,
                                        // Unlocks Remove's "every run on this
                                        // board" option and its custom-time
                                        // replacement. Built from props the
                                        // board page already holds — never from
                                        // the lazily-loaded mod context, so the
                                        // choices render the instant the form
                                        // opens instead of arriving after a
                                        // fetch and reshaping the form.
                                        runner:
                                            entry.userId != null &&
                                            categoryId != null
                                                ? {
                                                      id: entry.userId,
                                                      name: entry.runnerName,
                                                      categoryId,
                                                      categoryDisplay:
                                                          categoryDisplay,
                                                      subcategoryKey:
                                                          entrySubcategoryKey,
                                                      primaryTiming,
                                                  }
                                                : undefined,
                                    }}
                                    onDone={verbDone}
                                    onClose={() => setActiveVerb(null)}
                                    onUndoComplete={onMutated}
                                    autoFocus
                                />
                            )}
                        </div>
                    )}
                    {(onPrev || onNext) && activeVerb == null && (
                        <div className={styles.stepBar}>
                            {onPrev ? (
                                <button
                                    type="button"
                                    className={styles.stepBtn}
                                    onClick={() => step('prev')}
                                >
                                    <ChevronUp size={14} aria-hidden /> Previous
                                    run <kbd>k</kbd>
                                </button>
                            ) : (
                                <span className={styles.stepEdge}>
                                    First run on this page
                                </span>
                            )}
                            {onNext ? (
                                <button
                                    type="button"
                                    className={styles.stepBtn}
                                    onClick={() => step('next')}
                                >
                                    Next run <kbd>j</kbd>{' '}
                                    <ChevronDown size={14} aria-hidden />
                                </button>
                            ) : (
                                <span className={styles.stepEdge}>
                                    Last run on this page
                                </span>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Stacked mod dialogs (their own BoardDialog chrome). While one
                is open the drawer's dialog behavior is suspended — see the
                useDialogBehavior call above. */}
            {modCtx != null && modCategory != null && rosterRow != null && (
                <MoveDialog
                    open={modDialog === 'move'}
                    onClose={() => setModDialog(null)}
                    row={rosterRow}
                    category={modCategory}
                    categories={modCtx.categories}
                    variables={modCtx.variables}
                    subcategoryKey={entrySubcategoryKey}
                    gameSlug={gameSlug}
                    onMutated={onModDialogMutated}
                    ownerMode={ownerMode}
                    // The dialog doesn't thread the run's current board, so
                    // the origin side of the cache bust is closed over here
                    // — same pair the mod path passes to `moveRunAction`.
                    onSubmitOwner={
                        ownerMode
                            ? (target) =>
                                  selfMoveRunAction(
                                      gameSlug,
                                      gameId,
                                      runId,
                                      {
                                          categoryId:
                                              categoryId ?? modCategory.id,
                                          subcategoryKey: entrySubcategoryKey,
                                      },
                                      target,
                                  )
                            : undefined
                    }
                />
            )}
            {ownerMode && (
                <SelfRunVerdictDialog
                    confirmState={selfVerdict.confirmState}
                    pending={selfVerdict.pending}
                    error={selfVerdict.error}
                    onCancel={() => {
                        selfCancelled.current = true;
                        selfVerdict.cancel();
                    }}
                    onConfirm={selfVerdict.confirm}
                />
            )}
            {!ownerMode &&
                modCtx != null &&
                modCategory != null &&
                rosterRow != null && (
                    <>
                        <AdjustDialog
                            open={modDialog === 'adjust'}
                            onClose={() => setModDialog(null)}
                            row={rosterRow}
                            category={modCategory}
                            gameSlug={gameSlug}
                            subcategoryKey={entrySubcategoryKey}
                            timeMs={modCategoryTimeMs}
                            onMutated={onModDialogMutated}
                        />
                        <HideIdentityDialog
                            open={modDialog === 'hide-identity'}
                            onClose={() => setModDialog(null)}
                            onDone={onModDialogMutated}
                            gameSlug={gameSlug}
                            gameDisplay={modCtx.gameDisplay}
                            runnerName={entry.runnerName}
                            runId={runId}
                            userId={entry.userId ?? null}
                            categoryId={modCategory.id}
                            categoryDisplay={modCategory.display}
                            subcategoryKey={entrySubcategoryKey}
                        />
                    </>
                )}
        </>,
        document.body,
    );
}
