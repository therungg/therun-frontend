'use client';

import { NeedsVideoLine } from '~src/components/waiting-on-you/needs-video-line';
import { WaitingBanner } from '~src/components/waiting-on-you/waiting-banner';
import { sameBoard } from '~src/components/waiting-on-you/waiting-copy';
import {
    useWaitingOnYou,
    WaitingOnYouProvider,
} from '~src/components/waiting-on-you/waiting-on-you-provider';
import styles from './leaderboard.module.scss';

interface Board {
    gameId: number;
    categoryId: number;
    subcategoryKey: string;
}

/**
 * Above the board, for the signed-in runner only: their run that is off this
 * board until they add a video, fixable right here, and a line for anything
 * else of theirs waiting in this game. Loaded after mount, so the board itself
 * stays one cached page for everyone.
 */
export function BoardWaitingNotice(board: Board) {
    return (
        <WaitingOnYouProvider>
            <Notice {...board} />
        </WaitingOnYouProvider>
    );
}

function Notice(board: Board) {
    const { runs } = useWaitingOnYou();
    const here = runs.find((r) => r.kind === 'video' && sameBoard(r, board));
    const elsewhere = (r: (typeof runs)[number]) =>
        r.gameId === board.gameId && r.runId !== here?.runId;
    if (!here && !runs.some(elsewhere)) return null;
    return (
        <div className={styles.waitingNotice}>
            {here ? <NeedsVideoLine run={here} label="Your" /> : null}
            <WaitingBanner only={elsewhere} />
        </div>
    );
}
