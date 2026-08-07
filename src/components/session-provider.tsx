'use client';

import {
    createContext,
    PropsWithChildren,
    useContext,
    useEffect,
    useState,
} from 'react';
import { User } from 'types/session.types';
import { getSession } from '~src/actions/session.action';
import { DEFAULT_SESSION } from '~src/common/constants';

// Session is fetched client-side after mount so the server-rendered shell
// carries no per-request cookie read — that keeps every page prerenderable.
const SessionContext = createContext<User>(DEFAULT_SESSION);

export const useSession = () => useContext(SessionContext);

export function SessionProvider({ children }: PropsWithChildren) {
    const [user, setUser] = useState<User>(DEFAULT_SESSION);

    useEffect(() => {
        getSession()
            .then(setUser)
            .catch(() => {});
    }, []);

    return (
        <SessionContext.Provider value={user}>
            {children}
        </SessionContext.Provider>
    );
}
