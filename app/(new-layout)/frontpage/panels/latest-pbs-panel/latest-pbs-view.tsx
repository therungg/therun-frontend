'use client';

import Image from 'next/image';
import { Container } from 'react-bootstrap';
import { CardWithImage } from '~app/(new-layout)/components/card-with-image.component';
import { Run } from '~src/common/types';
import { UserGameCategoryLink, UserLink } from '~src/components/links/links';
import { DurationToFormatted, FromNow } from '~src/components/util/datetime';
import { UserData } from '~src/lib/get-session-data';
import styles from './latest-pbs-panel.module.scss';

interface LatestPbViewProps {
    runs: Run[];
    gameDataMap: Record<string, { image?: string; display?: string }>;
    userDataMap: Record<string, UserData>;
}

export const LatestPbView = ({
    runs,
    gameDataMap,
    userDataMap,
}: LatestPbViewProps) => {
    return (
        <Container
            fluid
            className={`h-100 p-3 rounded-4 overflow-hidden border shadow-sm ${styles.pbContainer}`}
        >
            {runs.map((run) => (
                <LatestPb
                    key={`${run.user}-${run.game}-${run.run}`}
                    run={run}
                    gameData={gameDataMap[run.game]}
                    userData={userDataMap[run.user]}
                />
            ))}
        </Container>
    );
};

interface LatestPbProps {
    run: Run;
    gameData: { image?: string; display?: string };
    userData: UserData;
}

const LatestPb = ({ run, gameData, userData }: LatestPbProps) => {
    const duration = run.hasGameTime
        ? (run.gameTimeData?.personalBest as string)
        : run.personalBest;

    const imageUrl =
        gameData?.image && gameData.image !== 'noimage'
            ? gameData.image
            : '/logo_dark_theme_no_text_transparent.png';

    return (
        <CardWithImage
            imageUrl={imageUrl}
            imageAlt={gameData?.display || run.game}
            className={styles.pbCard}
            imageWidth={70}
            imageHeight={90}
        >
            <div className={styles.pbContent}>
                {/* Row 1: Game + User */}
                <div className={styles.topRow}>
                    <div className={styles.gameName}>
                        <UserGameCategoryLink
                            url={run.url}
                            username={run.user}
                            game={run.game}
                            category={run.run}
                        >
                            {gameData?.display || run.game}
                        </UserGameCategoryLink>
                    </div>
                    <UserLink username={run.user}>
                        <div className={styles.userInfo}>
                            {userData?.picture && (
                                <div className={styles.userAvatar}>
                                    <Image
                                        src={userData.picture}
                                        alt={userData.username}
                                        fill
                                        style={{ objectFit: 'cover' }}
                                    />
                                </div>
                            )}
                            <span className={styles.username}>{run.user}</span>
                        </div>
                    </UserLink>
                </div>

                {/* Row 2: Category + User avatar duplicate? No, just category */}
                <div className={styles.middleRow}>
                    <span className={styles.categoryBadge}>{run.run}</span>
                </div>

                {/* Row 3: [spacer] Time badge (center) Timestamp (right) */}
                <div className={styles.bottomRow}>
                    <div />
                    <div className={styles.timeBadge}>
                        <DurationToFormatted duration={duration} />
                    </div>
                    <span className={styles.timestamp}>
                        <FromNow time={run.personalBestTime} />
                    </span>
                </div>
            </div>
        </CardWithImage>
    );
};
