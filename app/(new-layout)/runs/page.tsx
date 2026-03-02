import { Suspense } from 'react';
import buildMetadata from '~src/utils/metadata';
import { RunsExplorer } from './runs-explorer';

export const metadata = buildMetadata({
    title: 'Runs Explorer',
    description:
        'Browse and filter speedrun completions across all games, categories, and runners.',
});

export default function RunsPage() {
    return (
        <Suspense>
            <RunsExplorer />
        </Suspense>
    );
}
