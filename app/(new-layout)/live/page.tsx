import { Live } from '~app/(new-layout)/live/live';
import { LiveRun } from '~app/(new-layout)/live/live.types';
import { liveRunArrayToMap } from '~app/(new-layout)/live/utilities';
import { getSession } from '~src/actions/session.action';
import { getAllLiveRuns } from '~src/lib/live-runs';
import buildMetadata from '~src/utils/metadata';

const PATRON_ROLES = ['patreon1', 'patreon2', 'patreon3', 'admin'] as const;

export default async function LivePage({
    searchParams,
}: {
    searchParams: Promise<{ commentary?: string }>;
}) {
    const [liveData, session, params] = await Promise.all([
        getAllLiveRuns() as Promise<LiveRun[]>,
        getSession(),
        searchParams,
    ]);
    const liveDataMap = liveRunArrayToMap(liveData);

    const isPatron = session.roles?.some((r) =>
        (PATRON_ROLES as readonly string[]).includes(r),
    );
    const canViewCommentary = isPatron || params.commentary === 'true';

    return (
        <Live liveDataMap={liveDataMap} canViewCommentary={canViewCommentary} />
    );
}

export const metadata = buildMetadata({
    title: 'Watch Live Runs',
    description:
        'Watch streams of runners who are currently live and attempting a run, and discover new runners for your favorite games!',
});
