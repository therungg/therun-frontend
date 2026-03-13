import { LiveRun } from '~app/(new-layout)/live/live.types';
import ShowMarathon from '~app/(new-layout)/marathon/show-marathon';
import { getSession } from '~src/actions/session.action';
import { getAllLiveRuns } from '~src/lib/live-runs';

export default async function MarathonPage() {
    const liveData: LiveRun[] = await getAllLiveRuns();
    const session = await getSession();

    return <ShowMarathon liveDataMap={liveData} session={session} />;
}
