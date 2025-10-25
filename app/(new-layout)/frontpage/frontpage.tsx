import { Panel } from '../components/panel.component';
import { LiveRunsPanel } from './panels/live-runs-panel/live-runs-panel';
import RacePanel from './panels/race-panel/race-panel';
import StatsPanel from './panels/stats-panel/stats-panel';

export default async function FrontPage() {
    return (
        <div>
            <div className="text-center mb-3">
                <h1 className="display-3 fw-medium">The Run</h1>
                <h2 className="display-6">Everything Speedrunning</h2>
            </div>
            <div className="row d-flex flex-wrap">
                <div className="col col-lg-6 col-xl-7 col-12">
                    <LiveRunsPanel />
                    <StatsPanel />
                </div>
                <div className="col col-lg-6 col-xl-5 col-12">
                    <RacePanel />
                    <Panel subtitle="Subtitle" title="Title">
                        <div>Item 1</div>
                        <div>Item 2</div>
                    </Panel>
                </div>
            </div>
        </div>
    );
}
