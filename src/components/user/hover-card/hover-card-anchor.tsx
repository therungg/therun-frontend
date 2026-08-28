'use client';

import type { ReactNode } from 'react';
import type { UserCardContext } from '../../../../types/user-card.types';
import { CARD_WIDTH } from './card-position';
import { type AnchorHandlers, HoverAnchor } from './hover-anchor';
import { UserHoverCard } from './user-hover-card';

export type { AnchorHandlers };

interface Props {
    username: string;
    context?: UserCardContext;
    /** Rendered with the hover handlers attached. Always a single element. */
    children: (handlers: AnchorHandlers) => ReactNode;
}

export function HoverCardAnchor({ username, context, children }: Props) {
    return (
        <HoverAnchor
            cardWidth={CARD_WIDTH}
            card={<UserHoverCard username={username} context={context} />}
        >
            {children}
        </HoverAnchor>
    );
}
