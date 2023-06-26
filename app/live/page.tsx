import { getAllLiveRuns } from "~src/lib/live-runs";
import { Live } from "~app/live/live";
import { liveRunArrayToMap } from "~app/live/utilities";
import { LiveRun } from "~app/live/live.types";

export default async function LivePage() {
    const liveData: LiveRun[] = await getAllLiveRuns();
    const liveDataMap = liveRunArrayToMap(liveData);

    return <Live liveDataMap={liveDataMap} />;
}
