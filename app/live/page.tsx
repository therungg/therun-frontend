import { getAllLiveRuns } from "~src/lib/live-runs";
import { Live } from "~app/live/live";
import { liveRunArrayToMap } from "~app/live/utilities";
import { LiveRun } from "~app/live/live.types";
import buildMetadata from "~src/utils/metadata";

export const revalidate = 30;

export default async function LivePage() {
    const liveData: LiveRun[] = await getAllLiveRuns();
    const liveDataMap = liveRunArrayToMap(liveData);

    return <Live liveDataMap={liveDataMap} />;
}

export const metadata = buildMetadata({
    title: "Watch Live Runs",
    description:
        "Watch streams of runners who are currently live and attempting a run, and discover new runners for your favourite games!",
});
