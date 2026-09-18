'use client';

import { LiveRunsForGame } from '~src/components/game/live-runs-for-game';
import { BoardDialog } from '../shared/board-dialog';
import styles from './live-drawer.module.scss';

interface Props {
    show: boolean;
    onHide: () => void;
    gameDisplay: string;
}

export function LiveDrawer({ show, onHide, gameDisplay }: Props) {
    return (
        <BoardDialog
            open={show}
            onClose={onHide}
            labelledBy="live-drawer-title"
            size="xl"
        >
            <div className={styles.header}>
                <h5 className={styles.title} id="live-drawer-title">
                    Live runners — {gameDisplay}
                </h5>
                <button
                    type="button"
                    className="btn-close"
                    aria-label="Close"
                    onClick={onHide}
                />
            </div>
            <div className={styles.body}>
                <LiveRunsForGame game={gameDisplay} category={null} />
            </div>
        </BoardDialog>
    );
}
