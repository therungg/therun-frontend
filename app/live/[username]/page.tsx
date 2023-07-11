import { getAllLiveRuns } from "~src/lib/live-runs";
import { LiveRun } from "~app/live/live.types";
import { liveRunArrayToMap } from "~app/live/utilities";
import { Live } from "~app/live/live";

export const revalidate = 0;

interface PageProps {
    params: { username: string };
}

export default async function LiveUser({ params }: PageProps) {
    const liveData: LiveRun[] = await getAllLiveRuns();
    const liveDataMap = liveRunArrayToMap(liveData);

    return <Live liveDataMap={liveDataMap} username={params.username} />;
}
