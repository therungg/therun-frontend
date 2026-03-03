import { Suspense } from 'react';
import { getSession } from '~src/actions/session.action';
import buildMetadata from '~src/utils/metadata';
import { RunsExplorer } from './runs-explorer';

export const metadata = buildMetadata({
    title: 'Runs Explorer',
    description:
        'Browse and filter speedrun completions across all games, categories, and runners.',
});

export default async function RunsPage() {
    const session = await getSession();
    const loggedInUser = session?.username || undefined;

    return (
        <Suspense>
            <RunsExplorer loggedInUser={loggedInUser} />
        </Suspense>
    );
}
