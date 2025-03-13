import { LiveRun } from "~app/live/live.types";
import { getAllLiveRuns } from "~src/lib/client/live-runs";
import { getSession } from "~src/actions/session.action";
import ShowMarathon from "~app/marathon/show-marathon";

export const revalidate = 0;
export default async function MarathonPage() {
    const liveData: LiveRun[] = await getAllLiveRuns();
    const session = await getSession();

    return <ShowMarathon liveDataMap={liveData} session={session} />;
}
