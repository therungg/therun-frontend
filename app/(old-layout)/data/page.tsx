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
            <h1>Stats Explorer</h1>
            <p className="text-secondary mb-4">
                Explore speedrunning statistics across games, categories, and
                runners.
            </p>
            <StatsExplorer />
        </div>
    );
}
