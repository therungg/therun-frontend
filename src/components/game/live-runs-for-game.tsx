import React from 'react';
import useSWR from 'swr';
import { Live } from '~app/(old-layout)/live/live';
import { liveRunArrayToMap } from '~app/(old-layout)/live/utilities';
import { fetcher } from '~src/utils/fetcher';

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
