'use client';

import styles from './worklist-pane.module.scss';

export type TrustCandidate = {
    userId: number;
    runnerName: string;
    categoryId: number;
    categoryDisplay: string;
};

export function TrustPrompt({
    runner,
    busy,
    onYes,
    onOnlyBoard,
    onNo,
    onLater,
}: {
    runner: TrustCandidate;
    busy: boolean;
    onYes: () => void;
    onOnlyBoard: () => void;
    onNo: () => void;
    onLater: () => void;
}) {
    return (
        <div className={styles.trustPrompt} role="status">
            <p>
                You've approved {runner.runnerName} twice without a decline.
                Always accept their runs on this game?
            </p>
            <div className={styles.trustActions}>
                <button
                    type="button"
                    className="btn btn-sm btn-primary"
                    disabled={busy}
                    onClick={onYes}
                >
                    Yes, on this game
                </button>
                <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary"
                    disabled={busy}
                    onClick={onOnlyBoard}
                >
                    Only on {runner.categoryDisplay}
                </button>
                <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary"
                    disabled={busy}
                    onClick={onNo}
                >
                    No, don't ask again
                </button>
                <button
                    type="button"
                    className={styles.linkButton}
                    disabled={busy}
                    onClick={onLater}
                >
                    Not now
                </button>
            </div>
        </div>
    );
}
