'use client';

import { useRef, useState } from 'react';
import {
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    X,
} from 'react-bootstrap-icons';
import Link from '~src/components/link';
import { buildBoardEntryHref } from '~src/lib/board-url';
import { statusLabel } from '~src/lib/moderation/run-status-copy';
import { formatTimeMs } from '~src/lib/run-view/time-format';
import {
    type ModerateVerb,
    VERB_KEY,
} from '../../manage/moderation/moderate/verbs';
import type { ModContext } from '../load-run-view';
import type { RunViewModel } from '../run-view';
import { currentEntryOf } from '../superseded-note';
import { ActionsMenu } from './actions-menu';
import styles from './decision-bar.module.scss';
import type { RunVerbs } from './use-run-verbs';

/**
 * The moderator's bar across the top of the run view: where the run
 * stands, where it sits in the queue, and the verdicts its state allows.
 * Everything else is under Actions.
 */
export function DecisionBar({
    model,
    mod,
    verbs,
    position,
    positionLabel,
    onPrev,
    onNext,
    onClose,
    keys = false,
    compact = null,
}: {
    model: RunViewModel;
    mod: ModContext;
    verbs: RunVerbs;
    position?: { index: number; total: number };
    /** Names the list the position counts through, e.g. 'Queue'. */
    positionLabel?: string;
    onPrev?: () => void;
    onNext?: () => void;
    onClose?: () => void;
    /** The review keys are on: the verdicts and Actions show their keys. */
    keys?: boolean;
    /** The run in a line (time, runner), for once the headline has
     * scrolled out from under the bar. Null while the headline shows. */
    compact?: React.ReactNode;
}): React.JSX.Element {
    const { status, excluded } = verbs.state;
    const off = excluded || status === 'rejected';
    const pillClass = off
        ? styles.pillRed
        : status === 'pending'
          ? styles.pillPending
          : status === 'verified'
            ? styles.pillVerified
            : styles.pillNeutral;
    // Where the run stands on its board, beside its status: its place, or,
    // for a run a newer PB replaced, that PB. A superseded verified run has
    // nothing to decide, so the bar leads with the run that counts.
    const ctx = model.boardContext;
    const current = off ? null : currentEntryOf(model);
    const currentHref = current
        ? buildBoardEntryHref(model.game.name, current)
        : null;
    const superseded = current != null && status === 'verified';
    const [menuOpen, setMenuOpen] = useState(false);
    const actionsRef = useRef<HTMLButtonElement>(null);
    const busy = verbs.busy;
    const keyOf = (verb: ModerateVerb) =>
        keys && VERB_KEY[verb] ? (
            <kbd className={styles.key} aria-hidden="true">
                {VERB_KEY[verb]}
            </kbd>
        ) : null;
    // The verdicts shown as buttons below; Actions does not repeat them.
    const inBar = new Set<ModerateVerb>(
        off
            ? ['restore']
            : status === 'pending'
              ? ['approve', 'decline']
              : superseded && currentHref
                ? []
                : ['send_back'],
    );

    return (
        <div className={styles.bar} role="toolbar" aria-label="Moderation">
            {onClose ? (
                <button
                    type="button"
                    className={styles.iconBtn}
                    onClick={onClose}
                    aria-label="Close"
                >
                    <X size={18} aria-hidden />
                </button>
            ) : null}
            <span className={pillClass}>{statusLabel(status, excluded)}</span>
            {ctx ? (
                <span className={styles.standing}>
                    #{ctx.rank} of {ctx.totalRunners.toLocaleString()}
                </span>
            ) : current ? (
                <span className={styles.standing}>
                    Not on the board · PB{' '}
                    <span className={styles.standingTime}>
                        {formatTimeMs(current.timeMs)}
                    </span>
                    {current.rank != null ? ` #${current.rank}` : null}
                </span>
            ) : null}
            <QueueNav
                position={position}
                positionLabel={positionLabel}
                onPrev={onPrev}
                onNext={onNext}
                keys={keys}
            />
            {compact ? <span className={styles.compact}>{compact}</span> : null}
            <span className={styles.grow} />
            <button
                ref={actionsRef}
                type="button"
                className={
                    menuOpen
                        ? `${styles.actions} ${styles.actionsOpen}`
                        : styles.actions
                }
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                onClick={() => setMenuOpen((o) => !o)}
            >
                Actions <ChevronDown size={14} aria-hidden />
            </button>
            <ActionsMenu
                open={menuOpen}
                anchorRef={actionsRef}
                onClose={() => setMenuOpen(false)}
                model={model}
                mod={mod}
                verbs={verbs}
                inBar={inBar}
                keys={keys}
            />
            {off ? (
                verbs.can('restore') ? (
                    <button
                        type="button"
                        className={styles.primary}
                        onClick={() => void verbs.restore()}
                        disabled={busy}
                    >
                        Restore
                    </button>
                ) : null
            ) : status === 'pending' ? (
                <>
                    {verbs.can('decline') ? (
                        <button
                            type="button"
                            className={styles.reject}
                            onClick={() => void verbs.openReject()}
                            disabled={busy}
                            aria-keyshortcuts={
                                keys ? VERB_KEY.decline : undefined
                            }
                        >
                            Reject
                            {keyOf('decline')}
                        </button>
                    ) : null}
                    {verbs.can('approve') ? (
                        <button
                            type="button"
                            className={styles.primary}
                            onClick={() => void verbs.verify()}
                            disabled={busy}
                            aria-keyshortcuts={
                                keys ? VERB_KEY.approve : undefined
                            }
                        >
                            Verify
                            {keyOf('approve')}
                        </button>
                    ) : null}
                </>
            ) : superseded && currentHref ? (
                <Link href={currentHref} className={styles.primary}>
                    Open current PB
                </Link>
            ) : verbs.can('send_back') ? (
                <button
                    type="button"
                    className={styles.secondary}
                    onClick={() => void verbs.sendBack()}
                    disabled={busy}
                >
                    Send back to pending
                </button>
            ) : null}
            {verbs.dialog}
        </div>
    );
}

/** Where the run sits in the list it was opened from, and the steps
 * through it. Also the loading and failed-load bar's (run-review-modal). */
export function QueueNav({
    position,
    positionLabel,
    onPrev,
    onNext,
    keys = false,
}: {
    position?: { index: number; total: number };
    /** Names the list the position counts through, e.g. 'Queue'. */
    positionLabel?: string;
    onPrev?: () => void;
    onNext?: () => void;
    /** j/k step through the list. */
    keys?: boolean;
}) {
    if (!position && !onPrev && !onNext) return null;
    return (
        <span className={styles.queue}>
            {position ? (
                <>
                    {positionLabel ? `${positionLabel} ` : null}
                    <span className={styles.queueCount}>
                        {position.index} / {position.total}
                    </span>
                </>
            ) : null}
            {onPrev ? (
                <button
                    type="button"
                    className={styles.iconBtn}
                    onClick={onPrev}
                    aria-label="Previous run"
                    aria-keyshortcuts={keys ? 'k' : undefined}
                    title={keys ? 'Previous run (k)' : undefined}
                >
                    <ChevronLeft size={16} aria-hidden />
                </button>
            ) : null}
            {onNext ? (
                <button
                    type="button"
                    className={styles.iconBtn}
                    onClick={onNext}
                    aria-label="Next run"
                    aria-keyshortcuts={keys ? 'j' : undefined}
                    title={keys ? 'Next run (j)' : undefined}
                >
                    <ChevronRight size={16} aria-hidden />
                </button>
            ) : null}
        </span>
    );
}
