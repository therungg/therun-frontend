'use client';

import {
    createContext,
    type ReactNode,
    useCallback,
    useContext,
    useEffect,
    useRef,
    useState,
} from 'react';
import {
    type LiveDataMap,
    type LiveRun,
} from '~app/(new-layout)/live/live.types';
import { type Race } from '~app/(new-layout)/races/races.types';
import { CommentaryDrawer } from '~src/components/live/commentary-drawer/commentary-drawer';
import {
    CommentaryDrawerProvider,
    useCommentaryDrawerContext,
} from '~src/components/live/commentary-drawer/commentary-drawer-context';
import { useLiveRunsWebsocket } from '~src/components/websocket/use-reconnect-websocket';
import { getLiveRunForUser } from '~src/lib/live-runs';

interface RaceLiveContextValue {
    focusUser: (user: string) => Promise<void>;
    focusedRun: LiveRun | undefined;
}

const RaceLiveContext = createContext<RaceLiveContextValue>({
    focusUser: async () => {
        /* no-op when used outside the provider */
    },
    focusedRun: undefined,
});

export const useRaceLiveContext = () => useContext(RaceLiveContext);

const resolveLiveRun = (raw: unknown): LiveRun | undefined => {
    if (!raw) return undefined;
    if (Array.isArray(raw)) return raw[0] as LiveRun | undefined;
    return raw as LiveRun;
};

const InnerHost = ({ race, children }: { race: Race; children: ReactNode }) => {
    const [liveDataMap, setLiveDataMap] = useState<LiveDataMap>({});
    const [currentlyViewing, setCurrentlyViewing] = useState<string>('');
    const [manualSelectionTick, setManualSelectionTick] = useState(0);
    const lastMessage = useLiveRunsWebsocket();
    const drawerCtx = useCommentaryDrawerContext();

    const liveDataMapRef = useRef(liveDataMap);
    liveDataMapRef.current = liveDataMap;
    const fetchingRef = useRef(new Set<string>());

    useEffect(() => {
        if (!lastMessage) return;
        const participantUsers = new Set(
            (race.participants ?? []).map((p) => p.user),
        );
        if (!participantUsers.has(lastMessage.user)) return;

        if (lastMessage.type === 'UPDATE') {
            setLiveDataMap((prev) => {
                if (!prev[lastMessage.user]) return prev;
                return { ...prev, [lastMessage.user]: lastMessage.run };
            });
        } else if (lastMessage.type === 'DELETE') {
            setLiveDataMap((prev) => {
                if (!prev[lastMessage.user]) return prev;
                const next = { ...prev };
                delete next[lastMessage.user];
                return next;
            });
        }
    }, [lastMessage, race.participants]);

    const focusUser = useCallback(async (user: string) => {
        const existing = liveDataMapRef.current[user];
        let run: LiveRun | undefined = existing;
        if (!run || run.isMinified) {
            if (fetchingRef.current.has(user)) return;
            fetchingRef.current.add(user);
            try {
                const fetched = await getLiveRunForUser(user);
                run = resolveLiveRun(fetched);
                if (!run) return;
                setLiveDataMap((prev) => ({ ...prev, [user]: run! }));
            } finally {
                fetchingRef.current.delete(user);
            }
        }
        setCurrentlyViewing(user);
        setManualSelectionTick((n) => n + 1);
    }, []);

    const drawerSetOpen = drawerCtx.setOpen;
    useEffect(() => {
        if (!currentlyViewing) return;
        drawerSetOpen(true);
    }, [currentlyViewing, manualSelectionTick, drawerSetOpen]);

    const focusedRun = currentlyViewing
        ? liveDataMap[currentlyViewing]
        : undefined;

    return (
        <RaceLiveContext.Provider value={{ focusUser, focusedRun }}>
            {children}
            <CommentaryDrawer
                liveDataMap={liveDataMap}
                currentlyViewing={currentlyViewing}
                manualSelectionTick={manualSelectionTick}
            />
        </RaceLiveContext.Provider>
    );
};

export const RaceCommentaryDrawerHost = ({
    race,
    children,
}: {
    race: Race;
    children: ReactNode;
}) => {
    return (
        <CommentaryDrawerProvider>
            <InnerHost race={race}>{children}</InnerHost>
        </CommentaryDrawerProvider>
    );
};
