"use client";
import Link from "next/link";
import { ReactNode } from "react";
import { usePatreons } from "../patreon/use-patreons";
import PatreonName from "../patreon/patreon-name";
import { safeEncodeURI } from "~src/utils/uri";

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
    url = "",
    parentIsUrl = false,
}: UserLinkProps) => {
    const { data: patreons, isLoading } = usePatreons();

    if (!username.startsWith("/")) username = `/${username}`;

    username = decodeURIComponent(username);
    let withoutSlash = username.replace("/", "");

    if (url === "") url = username;

    if (!isLoading && patreons && patreons[withoutSlash]) {
        let color = 0;
        let showIcon = icon;
        if (patreons[withoutSlash].preferences) {
            color = patreons[withoutSlash].preferences.colorPreference;
            if (showIcon) {
                showIcon = patreons[withoutSlash].preferences.showIcon;
            }
        }

        withoutSlash = (
            <PatreonName name={withoutSlash} icon={showIcon} color={color} />
        );
    }

    const element = children ? children : withoutSlash;

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
            legacyBehavior
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
        .replace(/&nbsp;/gi, " ")
        .replace(/&amp;/gi, "&")
        .replace(/&quot;/gi, '"')
        .replace(/&lt;/gi, "<")
        .replace(/&gt;/gi, ">");
};
