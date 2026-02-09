'use client';

import { Panel } from '~app/(new-layout)/components/panel.component';
import { RunSession } from '~src/common/types';
import { SessionOverview } from '~src/components/run/user-detail/session-overview';
import Stats from '~src/components/user/stats';

interface ActivityTabProps {
    username: string;
    sessions: RunSession[];
    useGameTime: boolean;
}

export const ActivityTab = ({
    username,
    sessions,
    useGameTime: _useGameTime,
}: ActivityTabProps) => {
    return (
        <div className="d-flex flex-column gap-3">
            <Stats username={username} />

            <Panel subtitle="History" title="Recent Sessions">
                <div className="p-3">
                    <SessionOverview sessions={sessions} />
                </div>
            </Panel>
        </div>
    );
};
