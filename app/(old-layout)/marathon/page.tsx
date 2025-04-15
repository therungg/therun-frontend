import { LiveRun } from "~app/(old-layout)/live/live.types";
import { getAllLiveRuns } from "~src/lib/live-runs";
import { getSession } from "~src/actions/session.action";
import ShowMarathon from "~app/(old-layout)/marathon/show-marathon";

export const revalidate = 0;
export default async function MarathonPage() {
    const liveData: LiveRun[] = await getAllLiveRuns();
    const session = await getSession();

    return <ShowMarathon liveDataMap={liveData} session={session} />;
}
