'use client';

import { Col, Row } from 'react-bootstrap';
import type { User as IUser } from 'types/session.types';
import { GlobalGameData } from '~app/(old-layout)/[username]/[game]/[run]/run';
import { LiveRun } from '~app/(old-layout)/live/live.types';
import { UserStats as UserRaceStats } from '~app/(old-layout)/races/races.types';
import { Run } from '~src/common/types';
import { HighlightedRun } from '~src/components/run/dashboard/highlighted-run';
import { UserOverview } from '~src/components/run/user-detail/user-overview';
import { LiveRunBanner } from './live-run-banner';
import { QuickStatsPanel } from './quick-stats-panel';
import { RaceStatsPanel } from './race-stats-panel';
import { SummaryPanel } from './summary-panel';

interface OverviewTabProps {
    runs: Map<string, Run[]>;
    currentRuns: Run[];
    username: string;
    session: IUser;
    useGameTime: boolean;
    allGlobalGameData: GlobalGameData[];
    liveRun?: LiveRun;
    raceStats?: UserRaceStats;
    highlightedRun?: Run;
    parentForceUpdate: () => void;
}

export const OverviewTab = ({
    runs,
    currentRuns,
    username,
    session,
    useGameTime,
    allGlobalGameData,
    liveRun,
    raceStats,
    highlightedRun,
    parentForceUpdate,
}: OverviewTabProps) => {
    return (
        <>
            {liveRun && !Array.isArray(liveRun) && (
                <div className="mb-3">
                    <LiveRunBanner liveRun={liveRun} username={username} />
                </div>
            )}

            <Row>
                <Col xl={8} lg={12}>
                    <UserOverview
                        runs={runs}
                        username={username}
                        gameTime={useGameTime}
                        session={session}
                        allGlobalGameData={allGlobalGameData}
                        parentForceUpdate={parentForceUpdate}
                    />
                </Col>

                <Col xl={4} lg={12}>
                    <div className="d-flex flex-column gap-3">
                        <QuickStatsPanel runs={currentRuns} />
                        <SummaryPanel username={username} />
                        {raceStats && (
                            <RaceStatsPanel
                                raceStats={raceStats}
                                username={username}
                            />
                        )}
                        {highlightedRun && (
                            <HighlightedRun run={highlightedRun} />
                        )}
                    </div>
                </Col>
            </Row>
        </>
    );
};
