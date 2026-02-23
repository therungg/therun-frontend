import { getGlobalUser } from '~src/lib/get-global-user';
import {
    getGameImageMap,
    getRecentNotablePBs,
    getRecentPBs,
} from '~src/lib/highlights';
import { PbFeedClient } from './pb-feed-client';

export const PbFeedSection = async () => {
    const [notablePbs, allPbs, gameImages] = await Promise.all([
        getRecentNotablePBs(10),
        getRecentPBs(10),
        getGameImageMap(),
    ]);

    // Build username → picture map from all unique usernames
    const allUsernames = [
        ...new Set([
            ...notablePbs.map((pb) => pb.username),
            ...allPbs.map((pb) => pb.username),
        ]),
    ];
    const users = await Promise.all(
        allUsernames.map(async (username) => {
            try {
                const user = await getGlobalUser(username);
                return [username, user.picture] as const;
            } catch {
                return [username, ''] as const;
            }
        }),
    );
    const userPictures: Record<string, string> = {};
    for (const [username, picture] of users) {
        if (picture && picture !== 'noimage') {
            userPictures[username] = picture;
        }
    }

    return (
        <PbFeedClient
            notablePbs={notablePbs}
            allPbs={allPbs}
            gameImages={gameImages}
            userPictures={userPictures}
        />
    );
};
