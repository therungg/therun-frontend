'use client';

import { createContext, PropsWithChildren } from 'react';

interface ContextProps {
    game: string | null;
    category: string | null;
}

interface ContextProviderProps {
    game: string;
    category?: string;
}

export const RaceGameContext = createContext<ContextProps>({
    game: null,
    category: null,
});

export default function RaceGameContextProvider({
    children,
    game,
    category,
}: PropsWithChildren<ContextProviderProps>) {
    return (
        <RaceGameContext.Provider value={{ game, category: category || null }}>
            {children}
        </RaceGameContext.Provider>
    );
}
