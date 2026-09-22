'use client';

import { useRouter } from 'next/navigation';
import {
    createContext,
    useContext,
    useEffect,
    useRef,
    useState,
    useTransition,
} from 'react';
import { endNavProgress, startNavProgress } from '~src/lib/nav-progress';

export interface BoardNavOptions {
    /** Rewrite the current history entry instead of adding one. For a control
     * whose value is a view of the same page — the slice picker, the
     * standings toggles — a Back entry per click is noise, and those controls
     * used to call `router.replace` directly for exactly that reason. */
    replace?: boolean;
    /** Pass false to leave the scroll position where it is. */
    scroll?: boolean;
}

export interface BoardNav {
    /** Navigates via a transition; no-ops while another nav is pending.
     * Pushes by default, replaces when told to. */
    navigate: (url: string, key: string, options?: BoardNavOptions) => void;
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

// Re-exported as the provider component name games call sites use —
// it's a plain context provider, no wrapper component needed.
export const BoardNavProvider = BoardNavContext.Provider;

/** Creates the shared nav state — call once, in the component that renders `BoardNavProvider`. */
export function useBoardNavState(): BoardNav {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [pendingKey, setPendingKey] = useState<string | null>(null);
    // Whether *this* hook currently holds a count on the top progress bar —
    // the effect below fires on mount too, and an unpaired end would drop a
    // bar another source raised.
    const barHeld = useRef(false);

    // Clears the stale key once the transition it named has settled, so a
    // later `isPending` flip-back-to-true (a fresh nav) never reads a key
    // that belongs to the previous one. Same moment the board stops being
    // stale, so it is also where the top bar comes down.
    useEffect(() => {
        if (isPending) return;
        setPendingKey(null);
        if (barHeld.current) {
            barHeld.current = false;
            endNavProgress();
        }
    }, [isPending]);

    // A nav abandoned mid-flight (the board unmounts under it) must not leave
    // the bar up for the rest of the session.
    useEffect(
        () => () => {
            if (barHeld.current) {
                barHeld.current = false;
                endNavProgress();
            }
        },
        [],
    );

    const navigate = (url: string, key: string, options?: BoardNavOptions) => {
        if (isPending) return;
        setPendingKey(key);
        // Every board control routes through here — pills, the subcategory
        // segments, the verified toggle, use-filter-nav and
        // use-builtin-filter-nav all delegate — so raising the bar once here
        // covers all of them.
        if (!barHeld.current) {
            barHeld.current = true;
            startNavProgress();
        }
        const navOptions =
            options?.scroll === false ? { scroll: false } : undefined;
        startTransition(() => {
            if (options?.replace) router.replace(url, navOptions);
            else router.push(url, navOptions);
        });
    };

    return { navigate, isPending, pendingKey };
}

/**
 * The board nav if there is one, else null. For a control the console
 * renders too — board-curation puts `LeaderboardTable` (and so the empty
 * state's Clear filters) on a page with no board nav at all, where throwing
 * would take the whole console tab down.
 */
export function useOptionalBoardNav(): BoardNav | null {
    return useContext(BoardNavContext);
}

/** Consumed by every pill/toggle that mutates the board URL. */
export function useBoardNav(): BoardNav {
    const ctx = useContext(BoardNavContext);
    if (!ctx) {
        throw new Error('useBoardNav must be used within a BoardNavProvider');
    }
    return ctx;
}
