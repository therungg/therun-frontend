'use client';

import type { PropsWithChildren } from 'react';
import Link from '~src/components/link';
import { useSession } from '~src/components/session-provider';
import { safeEncodeURI } from '~src/utils/uri';

/**
 * The new board pages (`/games-v2`) 404 for everyone but admins in
 * production, so this public page must not send other viewers there. Game
 * links fall back to the regular game page; run links have no public
 * counterpart and render as plain text.
 */
function useBoardsVisible(): boolean {
    const session = useSession();
    return (
        process.env.NODE_ENV !== 'production' ||
        !!session.roles?.includes('admin')
    );
}

// `gameSlug` is empty for games whose slug column was never filled; the board
// route resolves the display name just as well.
const boardSegment = (gameSlug: string, game: string) =>
    encodeURIComponent(gameSlug || game);

export function GameLink({
    gameSlug,
    game,
    className,
    children,
}: PropsWithChildren<{ gameSlug: string; game: string; className?: string }>) {
    const href = useBoardsVisible()
        ? `/games-v2/${boardSegment(gameSlug, game)}`
        : `/games/${safeEncodeURI(game)}`;
    return (
        <Link href={href} className={className}>
            {children}
        </Link>
    );
}

export function RunLink({
    gameSlug,
    game,
    runId,
    className,
    children,
}: PropsWithChildren<{
    gameSlug: string;
    game: string;
    runId: number;
    className?: string;
}>) {
    const visible = useBoardsVisible();
    if (!visible) {
        return <span className={className}>{children}</span>;
    }
    return (
        <Link
            href={`/games-v2/${boardSegment(gameSlug, game)}/run/${runId}`}
            className={className}
        >
            {children}
        </Link>
    );
}
