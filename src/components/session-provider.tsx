'use client';

import {
    createContext,
    PropsWithChildren,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
} from 'react';
import { User } from 'types/session.types';
import { getSession } from '~src/actions/session.action';
import { DEFAULT_SESSION } from '~src/common/constants';

// Session is fetched client-side after mount so the server-rendered shell
// carries no per-request cookie read — that keeps every page prerenderable.
const SessionContext = createContext<User>(DEFAULT_SESSION);

export interface SessionActions {
    /** Re-read the session from the server. */
    refresh: () => Promise<void>;
    /** Drop the session locally — for after a logout clears the cookie. */
    clear: () => void;
}

// Because the session lives in client state, clearing the cookie server-side is
// not enough: without this, the topbar keeps showing the logged-in user until
// the next full page load.
const SessionActionsContext = createContext<SessionActions>({
    refresh: async () => {},
    clear: () => {},
});

export const useSession = () => useContext(SessionContext);
export const useSessionActions = () => useContext(SessionActionsContext);

export function SessionProvider({ children }: PropsWithChildren) {
    const [user, setUser] = useState<User>(DEFAULT_SESSION);

    const refresh = useCallback(async () => {
        try {
            setUser(await getSession());
        } catch {
            // A failed refresh leaves the last known session in place.
        }
    }, []);

    const clear = useCallback(() => setUser(DEFAULT_SESSION), []);

    const actions = useMemo(() => ({ refresh, clear }), [refresh, clear]);

    useEffect(() => {
        getSession()
            .then(setUser)
            .catch(() => {});
    }, []);

    return (
        <SessionActionsContext.Provider value={actions}>
            <SessionContext.Provider value={user}>
                {children}
            </SessionContext.Provider>
        </SessionActionsContext.Provider>
    );
}
