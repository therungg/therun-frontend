'use client';

import Image from 'next/image';
import { Container } from 'react-bootstrap';
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
            className={`h-100 p-3 rounded-4 overflow-hidden border shadow-sm bg-body ${styles.pbContainer}`}
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

    const gameTimeLabel = run.hasGameTime ? (
        <span className="fs-smaller fst-italic"> (IGT)</span>
    ) : (
        ''
    );

    const imageUrl =
        gameData?.image && gameData.image !== 'noimage'
            ? gameData.image
            : '/logo_dark_theme_no_text_transparent.png';

    return (
        <div
            className={`d-flex gap-2 align-items-start p-1 border-start border-4 border-secondary rounded-2 ${styles.pbItem}`}
        >
            <div className={styles.gameImageWrapper}>
                <Image
                    src={imageUrl}
                    alt={gameData?.display || run.game}
                    fill
                    style={{ objectFit: 'contain' }}
                    className={styles.gameImage}
                />
            </div>
            <div className="flex-grow-1 d-flex flex-column">
                <div className="fs-normal">
                    <UserGameCategoryLink
                        url={run.url}
                        username={run.user}
                        game={run.game}
                        category={run.run}
                    />{' '}
                    in <DurationToFormatted duration={duration} />
                    {gameTimeLabel}
                </div>

                <div
                    className={`fs-smaller d-flex align-items-center ${styles.metaInfo}`}
                >
                    <FromNow time={run.personalBestTime} />
                    {userData && (
                        <>
                            <span>by</span>
                            <UserLink username={run.user}>
                                <div
                                    className={`d-flex align-items-center gap-1 ${styles.userWithImage}`}
                                >
                                    <span>{run.user}</span>
                                    {userData.picture && (
                                        <div
                                            className={styles.userImageWrapper}
                                        >
                                            <Image
                                                src={userData.picture}
                                                alt={userData.username}
                                                fill
                                                style={{ objectFit: 'cover' }}
                                                className={styles.userImage}
                                            />
                                        </div>
                                    )}
                                </div>
                            </UserLink>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};
