'use client';
import { ReactNode } from 'react';
import Link from '~src/components/link';
import { safeEncodeURI } from '~src/utils/uri';
import PatreonName from '../patreon/patreon-name';
import { usePatreons } from '../patreon/use-patreons';

interface ChildrenType {
    children?: ReactNode;
    url?: string;
}

interface UserLinkProps extends ChildrenType {
    username: string;
    icon?: boolean;
    parentIsUrl?: boolean;
    className?: string;
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
}: UserLinkProps) => {
    const { data: patreons, isLoading } = usePatreons();

    if (!username.startsWith('/')) username = `/${username}`;

    username = decodeURIComponent(username);
    const nameStr = username.replace('/', '');

    if (url === '') url = username;

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

    return (
        <>
            {!parentIsUrl ? (
                <a className="overflow-hidden text-truncate" href={url}>
                    {element}
                </a>
            ) : (
                element
            )}
        </>
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
                    : `/${username}/${safeEncodeURI(game)}/${safeEncodeURI(
                          category,
                      )}`
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

export const display = (subject: string): string => {
    return subject
        .replace(/&nbsp;/gi, ' ')
        .replace(/&amp;/gi, '&')
        .replace(/&quot;/gi, '"')
        .replace(/&lt;/gi, '<')
        .replace(/&gt;/gi, '>');
};
