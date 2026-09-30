import levenshtein from 'js-levenshtein';
import React, { useState } from 'react';
import { Col, Row } from 'react-bootstrap';
import { AppContext } from '~src/common/app.context';
import { Run, RunHistory, SplitsHistory } from '~src/common/types';
import { StatsData } from '~src/types/game-stats.types';
import { UserLink } from '../../links/links';
import { getFormattedString } from '../../util/datetime';
import { loadRunner, metaForTiming, type RunnerData } from './load-runner';
import { ShowComparison } from './show-comparison';

const NO_SELECTION = 'no-selection';

export const CompareSplits = ({
    statsData,
    category,
    username,
    splits,
    run,
    runs,
    gameTime,
}: {
    statsData: StatsData;
    category: string;
    username: string;
    splits: SplitsHistory[];
    run: Run;
    runs: RunHistory[];
    gameTime: boolean;
}) => {
    const { baseUrl = 'https://therun.gg' } = React.useContext(AppContext);
    const [currentUser, setCurrentUser] = useState(NO_SELECTION);
    const [userData, setUserData] = useState(new Map<string, RunnerData>());
    const [loaded, setLoaded] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);

    const stats =
        gameTime && statsData.statsGameTime
            ? statsData.statsGameTime
            : statsData.stats;

    let catLeaderboard = stats.categoryLeaderboards.find(
        (leaderboard) => leaderboard.categoryNameDisplay == category,
    );

    if (!catLeaderboard) {
        const leven = stats.categoryLeaderboards.map((leaderboard, key) => [
            key,
            levenshtein(category, leaderboard.categoryNameDisplay),
        ]);
        const highest = leven.reduce((prev, current) => {
            return prev[1] < current[1] ? prev : current;
        })[0];
        catLeaderboard = stats.categoryLeaderboards[highest];
    }

    if (!catLeaderboard) return <>Could not find similar runs...</>;

    const currentUserData =
        currentUser != NO_SELECTION && loaded
            ? ((gameTime
                  ? userData.get(currentUser)?.gameTime
                  : userData.get(currentUser)?.realTime) ?? null)
            : null;

    // This is really old, should be improved

    return (
        <div>
            <Row>
                <Col>
                    <h2>
                        Compare{' '}
                        {currentUser &&
                            (currentUser != NO_SELECTION || currentUserData) &&
                            'to '}
                        {currentUser &&
                            (currentUser != NO_SELECTION ||
                                currentUserData) && (
                                <UserLink username={currentUser} />
                            )}
                    </h2>
                </Col>
            </Row>
            <select
                className="form-select"
                style={{ width: '40%', marginBottom: '1rem' }}
                onChange={async (e) => {
                    const selectedUser = e.currentTarget.value.split(' (')[0];
                    const fullUser = catLeaderboard.pbLeaderboard.find(
                        (l) => l.username == selectedUser,
                    );
                    setCurrentUser(selectedUser);
                    setLoadError(null);

                    try {
                        if (!userData.has(selectedUser)) {
                            setLoaded(false);
                            const data = await loadRunner(
                                baseUrl,
                                fullUser?.url || '',
                            );

                            if (!data) {
                                setLoadError(selectedUser);
                                return;
                            }

                            const prevMap = userData;
                            prevMap.set(selectedUser, data);
                            setUserData(prevMap);
                        }
                    } catch {
                        setLoadError(selectedUser);
                    } finally {
                        setLoaded(true);
                    }
                }}
            >
                {(currentUser === NO_SELECTION || !currentUserData) && (
                    <option key={NO_SELECTION}>Select run to compare to</option>
                )}
                {catLeaderboard.pbLeaderboard
                    .filter((lb) => lb.username != username)
                    .map((lb) => {
                        return (
                            <option
                                key={lb.username + lb.stat}
                                data-url={lb.url}
                            >
                                {lb.username} (
                                {getFormattedString(lb.stat.toString())})
                            </option>
                        );
                    })}
            </select>
            <hr />
            {currentUser !== NO_SELECTION && !loaded && (
                <>Loading data for {currentUser}...</>
            )}
            {loaded && loadError && <>Could not load splits for {loadError}.</>}
            {currentUserData && (
                <ShowComparison
                    one={splits}
                    two={currentUserData.splits}
                    userOne={username}
                    userTwo={currentUser}
                    runOne={metaForTiming(run, gameTime)}
                    runTwo={metaForTiming(
                        userData.get(currentUser)!.meta,
                        gameTime,
                    )}
                    runsOne={runs}
                    runsTwo={currentUserData.runs}
                />
            )}
        </div>
    );
};
