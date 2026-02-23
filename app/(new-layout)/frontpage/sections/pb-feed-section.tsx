import {
    getGameImageMap,
    getRecentNotablePBs,
    getRecentPBs,
} from '~src/lib/highlights';
import { PbFeedClient } from './pb-feed-client';

export const PbFeedSection = async () => {
    const [notablePbs, allPbs, gameImages] = await Promise.all([
        getRecentNotablePBs(5),
        getRecentPBs(20),
        getGameImageMap(),
    ]);

    return (
        <PbFeedClient
            notablePbs={notablePbs}
            allPbs={allPbs}
            gameImages={gameImages}
        />
    );
};
