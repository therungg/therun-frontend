import {
    LiveDataMap,
    LiveRun,
    WebsocketLiveRunMessage,
} from "~app/live/live.types";

export const liveRunArrayToMap = (liveData: LiveRun[]) => {
    liveData.sort((a, b) => {
        if (a.importance > b.importance) return -1;
        if (a.importance == b.importance) return 0;
        return 1;
    });

    const map = {};

    liveData.forEach((l) => {
        let user = l.user.toString();

        const firstLetter = user[0];

        //TODO:: This breaks the sorting if not done this way. Figure out why.
        if (firstLetter <= "9" && firstLetter >= "0") {
            user = ` ${user}`;
        }

        map[user] = l;
    });

    return map;
};

export const liveRunIsInSearch = (liveRun: LiveRun, search: string) => {
    search = search
        .toLowerCase()
        .replaceAll(" ", "")
        .normalize("NFD")
        .replace(/\p{Diacritic}/gu, "");
    let inSearch = false;

    [liveRun.user, liveRun.game, liveRun.category].forEach((val) => {
        if (inSearch) return;

        const correctValue = val
            .toLowerCase()
            .replaceAll(" ", "")
            .normalize("NFD")
            .replace(/\p{Diacritic}/gu, "");

        if (correctValue.includes(search)) inSearch = true;
    });

    return inSearch;
};

export const getRecommendedStream = (
    liveDataMap: LiveDataMap,
    username?: string
): string => {
    let recommendedStream = "";
    const lowercaseUsername = username?.toLowerCase();

    if (lowercaseUsername) {
        const user = Object.values(liveDataMap).find(
            (data) => data.user && data.user.toLowerCase() === lowercaseUsername
        );
        recommendedStream = user?.user || "";
    }

    if (!recommendedStream) {
        const streamingRun = Object.values(liveDataMap).find(
            (data) => data.currentlyStreaming && data.currentSplitIndex > -1
        );
        if (streamingRun) recommendedStream = streamingRun.user;
    }

    if (!recommendedStream) {
        const firstRun = Object.values(liveDataMap)[0];
        if (firstRun) recommendedStream = firstRun.user;
    }

    return recommendedStream;
};

export const isWebsocketDataProcessable = (
    data: WebsocketLiveRunMessage,
    forceGame?: string | null,
    forceCategory?: string | null
): boolean => {
    if (!data) return false;

    if (data.type === "DELETE") return true;

    if (!data.run) return false;

    if (!forceGame) return true;

    const gameIsValid = forceGame.toLowerCase() == data.run.game.toLowerCase();

    if (!gameIsValid) return false;

    if (!forceCategory) return true;

    return forceCategory.toLowerCase() == data.run.category.toLowerCase();
};
