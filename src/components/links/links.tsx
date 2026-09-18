'use client';
import { ReactNode } from 'react';
import Link from '~src/components/link';
import { runnerProfileHref } from '~src/lib/runner-profile-href';
import { userHref } from '~src/lib/user-href';
import { safeEncodeURI } from '~src/utils/uri';
import type { UserCardContext } from '../../../types/user-card.types';
import PatreonName from '../patreon/patreon-name';
import { usePatreons } from '../patreon/use-patreons';
import { HoverCardAnchor } from '../user/hover-card/hover-card-anchor';

interface ChildrenType {
    children?: ReactNode;
    url?: string;
}

interface UserLinkProps extends ChildrenType {
    username: string;
    icon?: boolean;
    parentIsUrl?: boolean;
    className?: string;
    /**
     * Opt out of the hover card. Set it where a card would be noise (the
     * runner's own profile header) or where the surrounding element already
     * explains who this is.
     */
    hoverCard?: boolean;
    /**
     * What the surrounding surface already knows about this runner — a
     * leaderboard row has their rank, time, avatar and flag on hand. Painted
     * immediately, before the card's own fetch resolves.
     */
    cardContext?: UserCardContext;
    /**
     * Which profile this link should point at. Board contexts (rows, run
     * pages, mod tooling, menus) opt into the leaderboards profile; everything
     * else points at the overview. Both go through userHref, so both land on
     * `/users/<name>` — a game can hold the root form of the name.
     */
    to?: 'profile' | 'leaderboards';
    /** Present only for a moderator who can act on this runner — forwarded
     * to the hover card's own Moderate button. Ignored when `hoverCard` is
     * false. */
    moderate?: { label: string; onOpen: () => void };
}

interface UserGameLinkProps extends UserLinkProps, GameLinkProps {}

interface UserGameCategoryLinkProps
    extends UserLinkProps,
        GameCategoryLinkProps {}

interface GameLinkProps {
    game: string;
}

interface GameCategoryLinkProps extends GameLinkProps {
    category: string;
}

export const UserLink = ({
    username,
    children,
    icon = true,
    url = '',
    parentIsUrl = false,
    hoverCard = true,
    cardContext,
    to = 'profile',
    moderate,
}: UserLinkProps) => {
    const { data: patreons, isLoading } = usePatreons();

    if (!username) return null;

    if (!username.startsWith('/')) username = `/${username}`;

    username = decodeURIComponent(username);
    const nameStr = username.replace('/', '');

    if (url === '') {
        url =
            to === 'leaderboards'
                ? runnerProfileHref(nameStr)
                : userHref(nameStr);
    }

    let displayNode: React.ReactNode = nameStr;
    if (
        !isLoading &&
        patreons &&
        patreons[nameStr] &&
        !patreons[nameStr].preferences?.hide
    ) {
        const patron = patreons[nameStr];
        const showIcon = icon && (patron.preferences?.showIcon ?? true);
        displayNode = (
            <PatreonName
                name={nameStr}
                preferences={patron.preferences}
                tier={patron.tier}
                icon={showIcon}
            />
        );
    }

    const element = children ? children : displayNode;

    // `parentIsUrl` means we render a bare label inside someone else's anchor.
    // There is no element of ours to hang the hover handlers on, and wrapping
    // one in would change the layout of every caller, so those keep the label.
    if (parentIsUrl) return <>{element}</>;

    if (!hoverCard) {
        return (
            <a className="overflow-hidden text-truncate" href={url}>
                {element}
            </a>
        );
    }

    return (
        <HoverCardAnchor
            username={nameStr}
            context={cardContext}
            moderate={moderate}
        >
            {(handlers) => (
                <a
                    className="overflow-hidden text-truncate"
                    href={url}
                    ref={handlers.ref as React.Ref<HTMLAnchorElement>}
                    onPointerEnter={handlers.onPointerEnter}
                    onPointerLeave={handlers.onPointerLeave}
                    onFocus={handlers.onFocus}
                    onBlur={handlers.onBlur}
                >
                    {element}
                </a>
            )}
        </HoverCardAnchor>
    );
};

export const UserGameLink = ({ game, children }: UserGameLinkProps) => {
    return GameLink({ game, children });
};

export const UserGameCategoryLink = ({
    username,
    game,
    category,
    children,
    url,
}: UserGameCategoryLinkProps) => {
    if (!game || !category) {
        return (
            <div className="text-truncate">
                {display(game)} {display(category)}
            </div>
        );
    }

    return (
        <Link
            href={
                url
                    ? url
                    : userHref(
                          username,
                          `${safeEncodeURI(game)}/${safeEncodeURI(category)}`,
                      )
            }
        >
            {children ? children : `${display(game)} - ${display(category)}`}
        </Link>
    );
};

export const GameLink: React.FunctionComponent<
    React.PropsWithChildren<GameLinkProps>
> = ({ game, children }) => {
    return (
        <Link href={`/games/${safeEncodeURI(game)}`}>
            {children ? children : display(game)}
        </Link>
    );
};

export const GameCategoryLink = ({
    game,
    category,
    children,
}: React.PropsWithChildren<GameCategoryLinkProps>) => {
    return (
        <>{children ? children : `${display(game)} - ${display(category)}`}</>
    );
};

// Tolerates a missing subject on purpose. Run records predating the game
// column carry `game: null` despite the type claiming otherwise, and
// UserGameCategoryLink's own empty-state branch feeds this the very values it
// just checked for. Both used to take the whole page down with a TypeError.
export const display = (subject: string | null | undefined): string => {
    if (!subject) return '';

    return subject
        .replace(/&nbsp;/gi, ' ')
        .replace(/&amp;/gi, '&')
        .replace(/&quot;/gi, '"')
        .replace(/&lt;/gi, '<')
        .replace(/&gt;/gi, '>');
};
