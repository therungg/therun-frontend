import { subject as caslSubject } from '@casl/ability';
import { notFound } from 'next/navigation';
import { getSession } from '~src/actions/session.action';
import { defineAbilityFor } from '~src/rbac/ability';
import { loadManageRunData } from './data';
import { ManageRunPage } from './manage-run-page';

interface Props {
    params: Promise<{ game: string; runId: string }>;
}

export default async function GameRunManagePage({ params }: Props) {
    const { game: slug, runId: runIdRaw } = await params;
    const runId = Number.parseInt(runIdRaw, 10);
    if (!slug || !Number.isFinite(runId)) notFound();

    const session = await getSession();
    if (!session?.username) notFound();

    const data = await loadManageRunData(slug, runId);
    if (!data) notFound();

    const ability = defineAbilityFor(session);
    if (
        !ability.can(
            'edit',
            caslSubject('leaderboard', { game: data.game.name }),
        )
    ) {
        notFound();
    }

    // User-from-category exclusion (POST /admin/exclusions) is admin-only.
    const canExcludeUsers = (session.roles ?? []).includes('admin');

    return <ManageRunPage data={data} canExcludeUsers={canExcludeUsers} />;
}
