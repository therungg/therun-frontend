import { notFound } from 'next/navigation';
import { getSession } from '~src/actions/session.action';
import { getGameDisplayById } from '~src/lib/game-mgmt';
import { listGameMergeRequests } from '~src/lib/reassignments';
import { MergeRequestsClient } from './merge-requests-client';

export default async function MergeRequestsPage() {
    const session = await getSession();
    if (!session.roles?.includes('admin')) {
        notFound();
    }

    const requests = await listGameMergeRequests(session.id);

    // The queue stores ids; a decision is about two games by name. Resolved
    // here rather than in the payload so the backend list stays a list.
    const ids = [
        ...new Set(requests.flatMap((r) => [r.sourceGameId, r.targetGameId])),
    ];
    const names = new Map(
        await Promise.all(
            ids.map(
                async (id) =>
                    [id, (await getGameDisplayById(id)) ?? `#${id}`] as const,
            ),
        ),
    );

    return (
        <MergeRequestsClient
            requests={requests.map((r) => ({
                ...r,
                sourceDisplay:
                    names.get(r.sourceGameId) ?? `#${r.sourceGameId}`,
                targetDisplay:
                    names.get(r.targetGameId) ?? `#${r.targetGameId}`,
            }))}
        />
    );
}
