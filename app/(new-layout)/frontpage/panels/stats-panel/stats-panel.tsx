import { Col, Row } from 'react-bootstrap';
import { Panel } from '~app/(new-layout)/components/panel.component';
import { getSession } from '~src/actions/session.action';
import { getUserSummary } from '~src/lib/summary';
import { ProgressChart } from './progress-chart';
import { RecentFinishedAttempts } from './recent-finished-attempts';
import { StatsHeader } from './stats-header';

export default async function StatsPanel() {
    const user = await getSession();
    const stats = await getUserSummary('Kally', 'week', 0);

    if (!stats || !user) return <div>Loading stats...</div>;

    return (
        <Panel
            subtitle="Summary"
            title="Your weekly recap"
            className="p-3"
            link={{ url: '/' + user.user, text: 'View All Stats' }}
        >
            <Row className="row-gap-3">
                <Col
                    xxl={6}
                    xl={12}
                    className="d-flex justify-content-center align-items-center order-xxl-1 order-2"
                >
                    <ProgressChart stats={stats} />
                </Col>
                <Col xxl={6} xl={12} className="order-xxl-2 order-1">
                    <StatsHeader stats={stats} />
                </Col>
            </Row>
            {stats.totalFinishedRuns > 0 && (
                <div className="mt-3">
                    <RecentFinishedAttempts stats={stats} />
                </div>
            )}
        </Panel>
    );
}
