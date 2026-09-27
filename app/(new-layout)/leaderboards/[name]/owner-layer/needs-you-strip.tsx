'use client';

import { type ReactNode, useState } from 'react';
import { GameImage } from '~src/components/image/gameimage';
import Link from '~src/components/link';
import {
    RUNNER_NEXT_STEP_LABEL,
    runnerStatusHint,
} from '~src/lib/moderation/run-status-copy';
import type { SubmissionItem } from '../../../../../types/runner-status.types';
import { RunnerAvatar } from '../../../games/[game]/leaderboard/runner-avatar';
import profileStyles from '../leaderboards-profile.module.scss';
import { itemBoardLabel } from './off-board-rows';
import styles from './owner-layer.module.scss';
import { type LayerGame, useOwnerLayer } from './owner-layer-provider';
import {
    EvidenceInline,
    type ItemBoard,
    itemHref,
    itemTime,
} from './row-status';

const pill = `${profileStyles.tab} ${profileStyles.tabActive}`;

function StripRow({
    item,
    game,
    board,
    owner,
}: {
    item: SubmissionItem;
    game: LayerGame | undefined;
    board: ItemBoard;
    owner: boolean;
}) {
    const [video, setVideo] = useState(false);
    const runPage = itemHref(board.gameRef, item);
    const hint = runnerStatusHint(item.status, item.reason);
    const what = game
        ? `${game.game} · ${itemBoardLabel(item)}`
        : itemBoardLabel(item);

    let action: ReactNode = null;
    if (owner && item.nextStep === 'add_video') {
        action = (
            <button
                type="button"
                className={pill}
                aria-expanded={video}
                onClick={() => setVideo((v) => !v)}
            >
                {RUNNER_NEXT_STEP_LABEL.add_video}
            </button>
        );
    } else if (owner && item.nextStep === 'submit') {
        action = (
            <Link href={`/submissions/${item.id}`} className={pill}>
                {RUNNER_NEXT_STEP_LABEL.submit}
            </Link>
        );
    } else if (owner && item.nextStep === 'fix_runners' && runPage) {
        action = (
            <Link href={runPage} className={pill}>
                {RUNNER_NEXT_STEP_LABEL.fix_runners}
            </Link>
        );
    } else if (runPage) {
        action = (
            <Link href={runPage} className={profileStyles.tab}>
                Open the run
            </Link>
        );
    }

    return (
        <div className={styles.stripRow}>
            <span className={styles.art}>
                <GameImage
                    src={game?.imageUrl ?? ''}
                    alt=""
                    quality="small"
                    width={36}
                    height={48}
                />
            </span>
            <span className={styles.stripWhat}>
                <span className={styles.stripBoard}>{what}</span>
                {hint ? <span className={styles.stripHint}>{hint}</span> : null}
            </span>
            <span className={styles.stripTime}>
                {itemTime(item, board.format)}
            </span>
            <span className={styles.stripAction}>{action}</span>
            {video ? (
                <div className={styles.stripEditor}>
                    <EvidenceInline item={item} board={board} />
                </div>
            ) : null}
        </div>
    );
}

/**
 * The runs waiting on the runner, on top of the tab. The runner gets the
 * action each one needs; a moderator or admin sees the same list with links
 * to the runs.
 */
export function NeedsYouStrip({
    picture,
}: {
    /** The runner's avatar, for the heading others see. */
    picture: string | null;
}) {
    const { overview, viewer, runnerName, games, formatFor, canSee } =
        useOwnerLayer();
    const needsYou = overview?.needsYou.filter((i) => canSee(i.gameId)) ?? [];
    if (needsYou.length === 0) return null;
    const owner = viewer === 'owner';
    const count = needsYou.length;

    return (
        <section
            className={styles.strip}
            aria-label="Runs waiting on the runner"
        >
            <div className={styles.stripHead}>
                {owner ? (
                    'Needs you'
                ) : (
                    <>
                        Needs
                        <RunnerAvatar
                            name={runnerName}
                            picture={picture}
                            size="xs"
                        />
                        {runnerName}
                    </>
                )}
                <span className={styles.stripCount}>{count}</span>
            </div>
            {needsYou.map((item) => {
                const game = games.get(item.gameId);
                return (
                    <StripRow
                        key={`${item.kind}-${item.id}`}
                        item={item}
                        game={game}
                        owner={owner}
                        board={{
                            gameId: item.gameId,
                            gameRef: game?.gameRef ?? '',
                            format: formatFor(item.gameId, item.categoryId),
                        }}
                    />
                );
            })}
        </section>
    );
}
