'use client';

import { createContext, ReactNode, useContext, useMemo, useState } from 'react';

interface CommentaryDrawerContextValue {
    open: boolean;
    setOpen: (open: boolean) => void;
    toggle: () => void;
}

const CommentaryDrawerContext =
    createContext<CommentaryDrawerContextValue | null>(null);

export const CommentaryDrawerProvider = ({
    children,
}: {
    children: ReactNode;
}) => {
    const [open, setOpen] = useState(false);

    const value = useMemo<CommentaryDrawerContextValue>(
        () => ({
            open,
            setOpen,
            toggle: () => setOpen((p) => !p),
        }),
        [open],
    );

    return (
        <CommentaryDrawerContext.Provider value={value}>
            {children}
        </CommentaryDrawerContext.Provider>
    );
};

export const useCommentaryDrawerContext = (): CommentaryDrawerContextValue => {
    const ctx = useContext(CommentaryDrawerContext);
    if (!ctx) {
        // Provider missing — return inert no-op so renders don't crash.
        return {
            open: false,
            setOpen: () => {
                /* no-op */
            },
            toggle: () => {
                /* no-op */
            },
        };
    }
    return ctx;
};
