import useSWR from "swr";
import { fetcher } from "../../pages";
import { Live, liveRunArrayToMap } from "../../pages/live";
import React from "react";

export const LiveRunsForGame = ({ game, category }) => {
    const { data } = useSWR(`/api/live?game=${game}`, fetcher);

    if (!data) {
        return <div>Loading data...</div>;
    }

    const liveDataMap = liveRunArrayToMap(data);

    return (
        <div>
            <Live
                liveDataMap={liveDataMap}
                showTitle={false}
                forceGame={game}
                forceCategory={category}
            />
        </div>
    );
};

export default LiveRunsForGame;
