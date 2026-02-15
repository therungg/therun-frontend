'use client';

import Image from 'next/image';
import { Panel } from '~app/(new-layout)/components/panel.component';
import { UserLink } from '~src/components/links/links';
import {
    DurationToFormatted,
    FromNow,
    getFormattedString,
} from '~src/components/util/datetime';
import type { FinishedRunPB } from '~src/lib/highlights';
import styles from './pb-feed.module.scss';

const FALLBACK_IMAGE = '/logo_dark_theme_no_text_transparent.png';

interface PbFeedClientProps {
    pbs: FinishedRunPB[];
    gameImages: Record<string, string>;
}

export const PbFeedClient = ({ pbs, gameImages }: PbFeedClientProps) => {
    return (
        <Panel title="Personal Bests" subtitle="Recent PBs" className="p-0">
            <div className={styles.feedContainer}>
                {pbs.map((pb) => (
                    <PbFeedItem
                        key={pb.id}
                        pb={pb}
                        imageUrl={gameImages[pb.game] ?? FALLBACK_IMAGE}
                    />
                ))}
            </div>
        </Panel>
    );
};

const PbFeedItem = ({
    pb,
    imageUrl,
}: {
    pb: FinishedRunPB;
    imageUrl: string;
}) => {
    const improvement = pb.previousPb !== null ? pb.previousPb - pb.time : null;
    const hasImprovement = improvement !== null && improvement > 0;

    return (
        <div className={styles.feedItem}>
            <Image
                src={imageUrl}
                alt={pb.game}
                width={28}
                height={28}
                className={styles.feedGameIcon}
                unoptimized
            />
            <div className={styles.feedItemContent}>
                <div className={styles.feedItemTopRow}>
                    <span className={styles.feedRunnerName}>
                        <UserLink username={pb.username} />
                    </span>
                    <span className={styles.feedGameCategory}>
                        {pb.game} &middot; {pb.category}
                    </span>
                </div>
                <div className={styles.feedItemBottomRow}>
                    <span className={styles.feedTime}>
                        <DurationToFormatted duration={pb.time} />
                    </span>
                    {hasImprovement ? (
                        <span className={styles.improvementDelta}>
                            -
                            {getFormattedString(
                                improvement.toString(),
                                improvement < 60000,
                            )}
                        </span>
                    ) : pb.previousPb === null ? (
                        <span className={styles.firstPbBadge}>First PB!</span>
                    ) : null}
                    <span className={styles.feedTimestamp}>
                        <FromNow time={pb.endedAt} />
                    </span>
                </div>
            </div>
        </div>
    );
};
