'use client';

import type { ReactNode } from 'react';
import {
    type AnchorHandlers,
    HoverAnchor,
} from '../../user/hover-card/hover-anchor';
import { RunHoverCard, type RunHoverCardProps } from './run-hover-card';

export type { AnchorHandlers };

// A touch wider than the user card: the head holds a rank ball, a full
// h:mm:ss.mmm time and a status pill on one line.
const RUN_CARD_WIDTH = 300;

export interface RunHoverCardAnchorProps extends RunHoverCardProps {
    /** Rendered with the hover handlers attached. Always a single element. */
    children: (handlers: AnchorHandlers) => ReactNode;
}

export function RunHoverCardAnchor({
    children,
    ...cardProps
}: RunHoverCardAnchorProps) {
    return (
        <HoverAnchor
            cardWidth={RUN_CARD_WIDTH}
            card={<RunHoverCard {...cardProps} />}
        >
            {children}
        </HoverAnchor>
    );
}
