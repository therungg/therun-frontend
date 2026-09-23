'use client';

import { useEffect, useRef, useState } from 'react';
import { BoardDialog } from '../../shared/board-dialog';
import { loadModRunViewAction } from '../actions/load-mod-run-view.action';
import pageStyles from '../run-page.module.scss';
import { ModRunView } from './mod-run-view';
import styles from './run-review-modal.module.scss';
import type { ReviewTarget } from './use-run-param';
import type { VerdictOutcome } from './use-run-verbs';

type Loaded = Awaited<ReturnType<typeof loadModRunViewAction>>;

const LOAD_FAILED = 'This run could not be loaded.';

function keyOf(target: ReviewTarget) {
    return `${target.kind}:${target.id}`;
}

/**
 * Whether the dialog holding `root` is the top layer: no other dialog or
 * menu was opened after it. Layers portal to the end of the body, so a
 * later one in document order sits on top.
 */
function isTopLayer(root: HTMLElement | null): boolean {
    const own = root?.closest('[role="dialog"]');
    if (!own) return false;
    const layers = document.querySelectorAll('[role="dialog"], [role="menu"]');
    for (const layer of layers) {
        if (layer === own || own.contains(layer)) continue;
        if (
            own.compareDocumentPosition(layer) &
            Node.DOCUMENT_POSITION_FOLLOWING
        ) {
            return false;
        }
    }
    return true;
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
    onPrev,
    onNext,
    onClose,
    onDecided,
}: {
    gameSlug: string;
    /** Null = closed. */
    target: ReviewTarget | null;
    position?: { index: number; total: number };
    onPrev?: () => void;
    onNext?: () => void;
    onClose: () => void;
    onDecided: (target: ReviewTarget, o: VerdictOutcome) => void;
}): React.JSX.Element | null {
    const rootRef = useRef<HTMLDivElement>(null);
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

    if (target == null) return null;

    // Escape and the backdrop stand down while a verb dialog or menu sits
    // on top, or while typing in a field of the view.
    const closeFromDialog = () => {
        const root = rootRef.current;
        if (isTopLayer(root) && !isTypingIn(root)) onClose();
    };

    const current = loaded?.key === targetKey ? loaded.result : null;

    let body: React.ReactNode;
    if (current == null) {
        body = <ReviewSkeleton />;
    } else if ('error' in current || current.data.mod == null) {
        body = (
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
                onPrev={onPrev}
                onNext={onNext}
                onClose={onClose}
                onDecided={(o) => onDecided(target, o)}
                onChanged={() => setReloads((n) => n + 1)}
                keysLive={() => isTopLayer(rootRef.current)}
            />
        );
    }

    return (
        <BoardDialog
            open
            onClose={closeFromDialog}
            title="Run review"
            size="full"
            themed
            initialFocusRef={rootRef}
        >
            <div ref={rootRef} className={styles.body} tabIndex={-1}>
                {body}
            </div>
        </BoardDialog>
    );
}

/** Blocks in the run view's shape while the run loads. */
function ReviewSkeleton() {
    return (
        <div className={styles.skeleton} aria-busy="true">
            <div className={styles.skeletonBar} />
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
