'use client';

import { useRef, useState } from 'react';
import {
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    X,
} from 'react-bootstrap-icons';
import { statusLabel } from '~src/lib/moderation/run-status-copy';
import type { ModContext } from '../load-run-view';
import type { RunViewModel } from '../run-view';
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
}): React.JSX.Element {
    const { status, excluded } = verbs.state;
    const off = excluded || status === 'rejected';
    const pillClass = off
        ? styles.pillRed
        : status === 'pending'
          ? styles.pillPending
          : styles.pillNeutral;
    const [menuOpen, setMenuOpen] = useState(false);
    const actionsRef = useRef<HTMLButtonElement>(null);
    const busy = verbs.busy;

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
            {position ? (
                <span className={styles.queue}>
                    {positionLabel ? `${positionLabel} ` : null}
                    <span className={styles.queueCount}>
                        {position.index} / {position.total}
                    </span>
                    {onPrev ? (
                        <button
                            type="button"
                            className={styles.iconBtn}
                            onClick={onPrev}
                            aria-label="Previous run"
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
                        >
                            <ChevronRight size={16} aria-hidden />
                        </button>
                    ) : null}
                </span>
            ) : null}
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
                        >
                            Reject
                        </button>
                    ) : null}
                    {verbs.can('approve') ? (
                        <button
                            type="button"
                            className={styles.primary}
                            onClick={() => void verbs.verify()}
                            disabled={busy}
                        >
                            Verify
                        </button>
                    ) : null}
                </>
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
