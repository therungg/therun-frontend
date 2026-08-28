'use client';

import type { ReactNode } from 'react';
import type {
    GameTimeLabel,
    LeaderboardEntry,
} from '../../../../types/leaderboards.types';
import {
    type AnchorHandlers,
    HoverAnchor,
} from '../../user/hover-card/hover-anchor';
import { RunHoverCard } from './run-hover-card';

export type { AnchorHandlers };

// Same portal-layer width ballpark as the user card (CARD_WIDTH).
const RUN_CARD_WIDTH = 260;

export interface RunHoverCardAnchorProps {
    entry: LeaderboardEntry;
    gameTimeLabel?: GameTimeLabel;
    showMilliseconds: boolean;
    /** Rendered with the hover handlers attached. Always a single element. */
    children: (handlers: AnchorHandlers) => ReactNode;
}

export function RunHoverCardAnchor({
    entry,
    gameTimeLabel,
    showMilliseconds,
    children,
}: RunHoverCardAnchorProps) {
    return (
        <HoverAnchor
            cardWidth={RUN_CARD_WIDTH}
            card={
                <RunHoverCard
                    entry={entry}
                    gameTimeLabel={gameTimeLabel}
                    showMilliseconds={showMilliseconds}
                />
            }
        >
            {children}
        </HoverAnchor>
    );
}
