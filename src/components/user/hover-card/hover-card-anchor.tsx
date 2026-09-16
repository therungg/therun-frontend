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
    /** Present only for a moderator who can act on this runner. See
     * `UserHoverCard`'s own prop for the contract. */
    moderate?: { label: string; onOpen: () => void };
    /** Rendered with the hover handlers attached. Always a single element. */
    children: (handlers: AnchorHandlers) => ReactNode;
}

export function HoverCardAnchor({
    username,
    context,
    moderate,
    children,
}: Props) {
    return (
        <HoverAnchor
            cardWidth={CARD_WIDTH}
            card={(close) => (
                <UserHoverCard
                    username={username}
                    context={context}
                    moderate={
                        moderate
                            ? {
                                  label: moderate.label,
                                  onOpen: () => {
                                      close();
                                      moderate.onOpen();
                                  },
                              }
                            : undefined
                    }
                />
            )}
        >
            {children}
        </HoverAnchor>
    );
}
