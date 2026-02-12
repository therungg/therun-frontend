import { Metadata } from 'next';
import { StatsExplorer } from './stats-explorer';

export const metadata: Metadata = {
    title: 'Stats Explorer - therun.gg',
    description:
        'Explore speedrunning statistics across games, categories, and runners',
};

export default function StatsExplorerPage() {
    return (
        <div>
            <h2 className="fw-bold mb-4">Stats Explorer</h2>
            <StatsExplorer />
        </div>
    );
}
