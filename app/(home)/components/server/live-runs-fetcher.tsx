"use server";

import { getTopNLiveRuns } from "~src/lib/live-runs";
import LiveRuns from "../client/live-runs";

export default async function LiveRunsFetcher() {
    const topLiveRuns = await getTopNLiveRuns();

    return <LiveRuns runs={topLiveRuns} />;
}
