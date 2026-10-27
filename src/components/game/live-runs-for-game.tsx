import React from 'react';
import { Live } from '~app/(new-layout)/live/live';
import { liveRunArrayToMap } from '~app/(new-layout)/live/utilities';
import { useGameLiveRuns } from './use-game-live-runs';

export const LiveRunsForGame = ({ game, category }) => {
    const data = useGameLiveRuns(game);

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
