'use client';

import { useRouter } from 'next/navigation';
import {
    createContext,
    useContext,
    useEffect,
    useState,
    useTransition,
} from 'react';

export interface BoardNav {
    /** Pushes a URL via a transition; no-ops while another nav is pending. */
    navigate: (url: string, key: string) => void;
    isPending: boolean;
    /** The `key` passed to the in-flight `navigate` call, else null. */
    pendingKey: string | null;
}

// Single owner of the board's URL-push transition — every control that
// mutates the board via router.push (category pills, subcategory pills,
// the verified toggle, and the Filters popover via use-filter-nav) shares
// this one instance so:
//   - only one nav is ever in flight (a second click while pending no-ops,
//     see `navigate` below, instead of racing two router.push calls)
//   - GamePage can dim the stale board off a single `isPending` (Task 13
//     req 3) instead of threading four separate transition states
//   - any pill can render optimistically active by comparing its own key
//     against `pendingKey` (req 2), without waiting for the URL to commit
const BoardNavContext = createContext<BoardNav | null>(null);

// Re-exported as the provider component name games-v2 call sites use —
// it's a plain context provider, no wrapper component needed.
export const BoardNavProvider = BoardNavContext.Provider;

/** Creates the shared nav state — call once, in the component that renders `BoardNavProvider`. */
export function useBoardNavState(): BoardNav {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [pendingKey, setPendingKey] = useState<string | null>(null);

    // Clears the stale key once the transition it named has settled, so a
    // later `isPending` flip-back-to-true (a fresh nav) never reads a key
    // that belongs to the previous one.
    useEffect(() => {
        if (!isPending) setPendingKey(null);
    }, [isPending]);

    const navigate = (url: string, key: string) => {
        if (isPending) return;
        setPendingKey(key);
        startTransition(() => {
            router.push(url);
        });
    };

    return { navigate, isPending, pendingKey };
}

/** Consumed by every pill/toggle that mutates the board URL. */
export function useBoardNav(): BoardNav {
    const ctx = useContext(BoardNavContext);
    if (!ctx) {
        throw new Error('useBoardNav must be used within a BoardNavProvider');
    }
    return ctx;
}
