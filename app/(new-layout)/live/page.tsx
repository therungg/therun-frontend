import { Live } from '~app/(new-layout)/live/live';
import { LiveRun } from '~app/(new-layout)/live/live.types';
import { liveRunArrayToMap } from '~app/(new-layout)/live/utilities';
import { getAllPatrons } from '~app/api/patreons/get-all-patrons.action';
import { getSession } from '~src/actions/session.action';
import { getAllLiveRuns } from '~src/lib/live-runs';
import buildMetadata from '~src/utils/metadata';

export default async function LivePage({
    searchParams,
}: {
    searchParams: Promise<{ commentary?: string }>;
}) {
    const [liveData, session, params, patrons] = await Promise.all([
        getAllLiveRuns() as Promise<LiveRun[]>,
        getSession(),
        searchParams,
        getAllPatrons(),
    ]);
    const liveDataMap = liveRunArrayToMap(liveData);

    const isPatron = Boolean(session.username && patrons[session.username]);
    const isAdmin = session.roles?.includes('admin');
    const canViewCommentary =
        isPatron || isAdmin || params.commentary === 'true';

    return (
        <Live liveDataMap={liveDataMap} canViewCommentary={canViewCommentary} />
    );
}

export const metadata = buildMetadata({
    title: 'Watch Live Runs',
    description:
        'Watch streams of runners who are currently live and attempting a run, and discover new runners for your favorite games!',
});
