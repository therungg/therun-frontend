'use client';

import {
    createContext,
    type ReactNode,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
} from 'react';
import { loadWaitingOnYouAction } from '~src/actions/pb-submission.action';
import type { WaitingRun } from '../../../types/pb-submission.types';

interface WaitingOnYou {
    username: string | null;
    runs: WaitingRun[];
    /** Runs fixed on this page: their rows say so instead of disappearing. */
    fixed: ReadonlySet<number>;
    markFixed: (runId: number) => void;
}

const Context = createContext<WaitingOnYou>({
    username: null,
    runs: [],
    fixed: new Set(),
    markFixed: () => undefined,
});

export const useWaitingOnYou = () => useContext(Context);

/**
 * Loads the signed-in runner's waiting runs after mount, so the page around it
 * stays cached and shared. `forName` limits it to that runner's own profile.
 * `initial` skips the load when the server already has the list.
 */
export function WaitingOnYouProvider({
    forName,
    initial,
    children,
}: {
    forName?: string;
    initial?: { username: string | null; runs: WaitingRun[] };
    children: ReactNode;
}) {
    const [state, setState] = useState(
        initial ?? { username: null, runs: [] as WaitingRun[] },
    );
    const [fixed, setFixed] = useState<Set<number>>(() => new Set());

    useEffect(() => {
        if (initial) return;
        let live = true;
        loadWaitingOnYouAction(forName)
            .then((res) => {
                if (live && res.ok) {
                    setState({ username: res.username, runs: res.runs });
                }
            })
            .catch(() => undefined);
        return () => {
            live = false;
        };
    }, [forName, initial]);

    const markFixed = useCallback((runId: number) => {
        setFixed((prev) => new Set(prev).add(runId));
    }, []);

    const value = useMemo(
        () => ({ ...state, fixed, markFixed }),
        [state, fixed, markFixed],
    );
    return <Context.Provider value={value}>{children}</Context.Provider>;
}
