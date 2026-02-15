import { getGameImageMap, getRecentNotablePBs } from '~src/lib/highlights';
import { PbFeedClient } from './pb-feed-client';

export const PbFeedSection = async () => {
    const [pbs, gameImages] = await Promise.all([
        getRecentNotablePBs(20),
        getGameImageMap(),
    ]);

    return <PbFeedClient pbs={pbs} gameImages={gameImages} />;
};
