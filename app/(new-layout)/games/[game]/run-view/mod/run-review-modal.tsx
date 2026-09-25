'use client';

import { useEffect, useEffectEvent, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, X } from 'react-bootstrap-icons';
import { isTriageInert } from '../../manage/moderation/shared/triage-keyboard';
import { useBoardArt } from '../../shared/board-art';
import { BoardDialog } from '../../shared/board-dialog';
import { WearOwnPortalTheme } from '../../shared/portal-theme';
import { isTopLayer } from '../../shared/top-layer';
import { loadModRunViewAction } from '../actions/load-mod-run-view.action';
import pageStyles from '../run-page.module.scss';
import barStyles from './decision-bar.module.scss';
import { ModRunView } from './mod-run-view';
import styles from './run-review-modal.module.scss';
import type { ReviewTarget } from './use-run-param';
import type { VerdictOutcome } from './use-run-verbs';

type Loaded = Awaited<ReturnType<typeof loadModRunViewAction>>;

const LOAD_FAILED = 'This run could not be loaded.';

function keyOf(target: ReviewTarget) {
    return `${target.kind}:${target.id}`;
}

/** Whether focus sits in a field inside `root` that should keep Escape. */
function isTypingIn(root: HTMLElement | null): boolean {
    const active = document.activeElement as HTMLElement | null;
    if (!root || !active || !root.contains(active)) return false;
    if (active.isContentEditable) return true;
    const tag = active.tagName.toLowerCase();
    return tag === 'input' || tag === 'textarea' || tag === 'select';
}

/**
 * Any run or manual time opened for review in place, over the list it was
 * picked from. The list owns the target (usually from `useRunParam`), what
 * a verdict does next, and the undo toast; the modal loads the run, shows
 * the moderator's run view, and reloads it after any other change.
 */
export function RunReviewModal({
    gameSlug,
    target,
    position,
    positionLabel,
    onPrev,
    onNext,
    onClose,
    onDecided,
    onOpenRun,
    onChanged,
    initialVerb,
}: {
    gameSlug: string;
    /** Null = closed. */
    target: ReviewTarget | null;
    position?: { index: number; total: number };
    /** Names the list the position counts through, e.g. 'Queue'. */
    positionLabel?: string;
    onPrev?: () => void;
    onNext?: () => void;
    onClose: () => void;
    onDecided: (target: ReviewTarget, o: VerdictOutcome) => void;
    /** Another run picked from inside the view ("Also pending"). Without
     * it those links go to the run's page. */
    onOpenRun?: (target: ReviewTarget) => void;
    /** A non-verdict change (ask for video, mark, move, retime, note, set
     * time…) — the modal always re-reads the run itself; this lets the list
     * or board it's opened over stay in step too. */
    onChanged?: () => void;
    /** Opens this step once the run has loaded (`r` on a list row). */
    initialVerb?: 'reject';
}): React.JSX.Element | null {
    const rootRef = useRef<HTMLDivElement>(null);
    const art = useBoardArt();
    const [loaded, setLoaded] = useState<{
        key: string;
        result: Loaded;
    } | null>(null);
    const [reloads, setReloads] = useState(0);
    const seq = useRef(0);

    const kind = target?.kind ?? null;
    const id = target?.id ?? null;
    // A new target (or closing) drops what was loaded, so reopening never
    // flashes a run as it stood before.
    const targetKey = target ? keyOf(target) : null;
    const [shownKey, setShownKey] = useState(targetKey);
    if (shownKey !== targetKey) {
        setShownKey(targetKey);
        setLoaded(null);
    }

    useEffect(() => {
        if (kind == null || id == null) return;
        const mine = ++seq.current;
        const key = keyOf({ kind, id });
        loadModRunViewAction(gameSlug, kind, id)
            .catch((): Loaded => ({ error: LOAD_FAILED }))
            .then((result) => {
                if (seq.current === mine) setLoaded({ key, result });
            });
        // `reloads` re-reads the same run after a change made in the view.
    }, [gameSlug, kind, id, reloads]);

    const current = loaded?.key === targetKey ? loaded.result : null;
    const showsView =
        current != null && !('error' in current) && current.data.mod != null;

    // While loading or after a failed load the view isn't there to take
    // j/k, so the modal does: a run that won't load can still be skipped.
    const onKey = useEffectEvent((e: KeyboardEvent) => {
        if (showsView || e.ctrlKey || e.metaKey || e.altKey || e.repeat) {
            return;
        }
        const active = document.activeElement as HTMLElement | null;
        const inert = isTriageInert({
            activeTag: active?.tagName ?? null,
            isContentEditable: active?.isContentEditable ?? false,
            dialogOpen: !isTopLayer(rootRef.current),
        });
        if (inert) return;
        if (e.key === 'j' && onNext) onNext();
        else if (e.key === 'k' && onPrev) onPrev();
        else return;
        e.preventDefault();
    });
    const open = target != null;
    useEffect(() => {
        if (!open) return;
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [open]);

    if (target == null) return null;

    // BoardDialog calls this for Escape, and only when the modal is the top
    // layer (takeEscape there). Typing in a field of the view keeps the
    // Escape; a backdrop click always closes.
    const escapeFromDialog = () => {
        if (!isTypingIn(rootRef.current)) onClose();
    };

    const nav = (
        <ReviewNav
            position={position}
            positionLabel={positionLabel}
            onPrev={onPrev}
            onNext={onNext}
            onClose={onClose}
        />
    );

    let body: React.ReactNode;
    if (current == null) {
        body = <ReviewSkeleton nav={nav} />;
    } else if ('error' in current || current.data.mod == null) {
        body = (
            <div className={styles.skeleton}>
                {nav}
                <div className={styles.error}>
                    <p className={styles.errorLine}>
                        {'error' in current ? current.error : LOAD_FAILED}
                    </p>
                    <button
                        type="button"
                        className={styles.close}
                        onClick={onClose}
                    >
                        Close
                    </button>
                </div>
            </div>
        );
    } else {
        body = (
            <ModRunView
                key={targetKey}
                model={current.data.model}
                history={current.data.history}
                sessionUsername={current.sessionUsername}
                mod={current.data.mod}
                position={position}
                positionLabel={positionLabel}
                onPrev={onPrev}
                onNext={onNext}
                onClose={onClose}
                onDecided={(o) => onDecided(target, o)}
                onChanged={() => {
                    setReloads((n) => n + 1);
                    onChanged?.();
                }}
                onOpenRun={
                    onOpenRun
                        ? (runId) => onOpenRun({ kind: 'run', id: runId })
                        : undefined
                }
                keysLive={() => isTopLayer(rootRef.current)}
                initialVerb={initialVerb}
            />
        );
    }

    // The modal wears the board's theme wherever it opens: over a public
    // page it takes the page's theme, in the console it brings its own, and so
    // does every dialog and menu opened from inside it.
    return (
        <WearOwnPortalTheme>
            <BoardDialog
                open
                onClose={onClose}
                onEscape={escapeFromDialog}
                title="Run review"
                size="full"
                themed
                initialFocusRef={rootRef}
            >
                {/* The game's art behind the run, as on the board: the
                    panels are translucent over it. */}
                {art ? (
                    <div
                        className={styles.art}
                        style={{
                            backgroundImage: `url(${JSON.stringify(art)})`,
                        }}
                        aria-hidden
                    />
                ) : null}
                <div ref={rootRef} className={styles.body} tabIndex={-1}>
                    {body}
                </div>
            </BoardDialog>
        </WearOwnPortalTheme>
    );
}

/** The decision bar's navigation half, for when there is no run to decide
 * on yet (loading) or at all (failed to load). */
function ReviewNav({
    position,
    positionLabel,
    onPrev,
    onNext,
    onClose,
}: {
    position?: { index: number; total: number };
    /** Names the list the position counts through, e.g. 'Queue'. */
    positionLabel?: string;
    onPrev?: () => void;
    onNext?: () => void;
    onClose: () => void;
}) {
    return (
        <div className={barStyles.bar} role="toolbar" aria-label="Moderation">
            <button
                type="button"
                className={barStyles.iconBtn}
                onClick={onClose}
                aria-label="Close"
            >
                <X size={18} aria-hidden />
            </button>
            {position || onPrev || onNext ? (
                <span className={barStyles.queue}>
                    {position ? (
                        <>
                            {positionLabel ? `${positionLabel} ` : null}
                            <span className={barStyles.queueCount}>
                                {position.index} / {position.total}
                            </span>
                        </>
                    ) : null}
                    {onPrev ? (
                        <button
                            type="button"
                            className={barStyles.iconBtn}
                            onClick={onPrev}
                            aria-label="Previous run"
                        >
                            <ChevronLeft size={16} aria-hidden />
                        </button>
                    ) : null}
                    {onNext ? (
                        <button
                            type="button"
                            className={barStyles.iconBtn}
                            onClick={onNext}
                            aria-label="Next run"
                        >
                            <ChevronRight size={16} aria-hidden />
                        </button>
                    ) : null}
                </span>
            ) : null}
        </div>
    );
}

/** Blocks in the run view's shape while the run loads. */
function ReviewSkeleton({ nav }: { nav: React.ReactNode }) {
    return (
        <div className={styles.skeleton} aria-busy="true">
            {nav}
            <div className={pageStyles.grid}>
                <div className={pageStyles.main}>
                    <div className={styles.skeletonHero} />
                    <div className={styles.skeletonMedia} />
                </div>
                <div className={pageStyles.side}>
                    <div className={styles.skeletonCard} />
                    <div className={styles.skeletonLine} />
                    <div className={styles.skeletonLine} />
                </div>
            </div>
        </div>
    );
}
