import {
    FilterState,
    LiveDataMap,
    LiveRun,
    SortOption,
    WebsocketLiveRunMessage,
} from '~app/(old-layout)/live/live.types';

export const liveRunArrayToMap = (liveData: LiveRun[]) => {
    liveData.sort((a, b) => {
        if (a.importance > b.importance) return -1;
        if (a.importance == b.importance) return 0;
        return 1;
    });

    const map = {};

    liveData.forEach((l) => {
        if (!l || !l.user) return;
        let user = l.user.toString();

        const firstLetter = user[0];

        //TODO:: This breaks the sorting if not done this way. Figure out why.
        if (firstLetter <= '9' && firstLetter >= '0') {
            user = ` ${user}`;
        }

        map[user] = l;
    });

    return map;
};

export const liveRunIsInSearch = (liveRun: LiveRun, search: string) => {
    search = search
        .toLowerCase()
        .replaceAll(' ', '')
        .normalize('NFD')
        .replace(/\p{Diacritic}/gu, '');
    let inSearch = false;

    [liveRun.user, liveRun.game, liveRun.category].forEach((val) => {
        if (inSearch) return;

        const correctValue = val
            .toLowerCase()
            .replaceAll(' ', '')
            .normalize('NFD')
            .replace(/\p{Diacritic}/gu, '');

        if (correctValue.includes(search)) inSearch = true;
    });

    return inSearch;
};

export const getRecommendedStream = (
    liveDataMap: LiveDataMap,
    username?: string,
): string => {
    let recommendedStream = '';
    const lowercaseUsername = username?.toLowerCase();

    if (lowercaseUsername) {
        const user = Object.values(liveDataMap).find(
            (data) =>
                data.user && data.user.toLowerCase() === lowercaseUsername,
        );
        recommendedStream = user?.user || '';
    }

    if (!recommendedStream) {
        const streamingRun = Object.values(liveDataMap).find(
            (data) => data.currentlyStreaming && data.currentSplitIndex > -1,
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
    forceCategory?: string | null,
): boolean => {
    if (!data) return false;

    if (data.type === 'DELETE') return true;

    if (!data.run) return false;

    if (!forceGame) return true;

    const gameIsValid = forceGame.toLowerCase() == data.run.game.toLowerCase();

    if (!gameIsValid) return false;

    if (!forceCategory) return true;

    return forceCategory.toLowerCase() == data.run.category.toLowerCase();
};

export const sortLiveRuns = (
    liveRuns: LiveRun[],
    sortOption: SortOption,
): LiveRun[] => {
    return [...liveRuns].sort((a, b) => {
        switch (sortOption) {
            case 'importance':
                return b.importance - a.importance; // High to low

            case 'runtime':
                return b.currentTime - a.currentTime; // Long to short

            case 'runner':
                return a.user.localeCompare(b.user); // A to Z

            case 'game':
                return a.game.localeCompare(b.game); // A to Z

            case 'delta': {
                // Most negative first (furthest ahead of PB)
                const deltaA = a.delta ?? Infinity;
                const deltaB = b.delta ?? Infinity;
                return deltaA - deltaB;
            }

            default:
                return 0;
        }
    });
};

export const filterLiveRuns = (
    liveRun: LiveRun,
    filters: FilterState,
): boolean => {
    // If no filters are active, show all runs
    if (!filters.liveOnTwitch && !filters.ongoing && !filters.pbPace) {
        return true;
    }

    // Live on Twitch filter
    if (filters.liveOnTwitch) {
        if (!liveRun.currentlyStreaming) {
            return false;
        }
    }

    // Ongoing filter (not reset and not finished)
    if (filters.ongoing) {
        if (liveRun.hasReset || liveRun.endedAt) {
            return false;
        }
    }

    // PB Pace filter (negative delta means ahead of PB)
    if (filters.pbPace) {
        // Exclude runs without delta or PB data
        if (
            liveRun.delta === null ||
            liveRun.delta === undefined ||
            liveRun.pb === null ||
            liveRun.pb === undefined
        ) {
            return false;
        }
        if (liveRun.delta >= 0) {
            return false;
        }
    }

    return true;
};

export const parseFilterParams = (searchParams: string): FilterState => {
    const params = new URLSearchParams(searchParams);
    const filtersParam = params.get('filters');

    if (!filtersParam) {
        return { liveOnTwitch: false, ongoing: false, pbPace: false };
    }

    const filterArray = filtersParam.split(',');

    return {
        liveOnTwitch: filterArray.includes('live'),
        ongoing: filterArray.includes('ongoing'),
        pbPace: filterArray.includes('pbpace'),
    };
};

export const serializeFilterParams = (filters: FilterState): string => {
    const activeFilters: string[] = [];

    if (filters.liveOnTwitch) activeFilters.push('live');
    if (filters.ongoing) activeFilters.push('ongoing');
    if (filters.pbPace) activeFilters.push('pbpace');

    return activeFilters.length > 0 ? activeFilters.join(',') : '';
};
