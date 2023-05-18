import Link from "next/link";
import { ReactNode } from "react";
import { usePatreons } from "../patreon/use-patreons";
import PatreonName from "../patreon/patreon-name";

interface ChildrenType {
    children?: ReactNode;
    url?: string;
}

interface UserLinkProps extends ChildrenType {
    username: string;
    icon?: boolean;
}

interface UserGameLinkProps extends UserLinkProps, GameLinkProps {}

interface UserGameCategoryLinkProps
    extends UserLinkProps,
        GameCategoryLinkProps {}

interface GameLinkProps extends ChildrenType {
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
}: UserLinkProps) => {
    const { data: patreons, isLoading } = usePatreons();

    if (!username.startsWith("/")) username = `/${username}`;

    let withoutSlash = username.replace("/", "");

    if (url === "") url = username;

    if (!isLoading && patreons && patreons[withoutSlash]) {
        let color = 0;
        let showIcon = icon;
        if (patreons[withoutSlash].preferences) {
            color = patreons[withoutSlash].preferences.colorPreference;
            showIcon = patreons[withoutSlash].preferences.showIcon;
        }

        withoutSlash = (
            <PatreonName name={withoutSlash} icon={showIcon} color={color} />
        );
    }

    return (
        <>
            <a href={url}>{children ? children : withoutSlash}</a>
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
            <div>
                {display(game)} {display(category)}
            </div>
        );
    }

    return (
        <Link
            href={
                url
                    ? url
                    : `/${username}/${encodeURIComponent(
                          game
                      )}/${encodeURIComponent(category)}`
            }
            legacyBehavior
        >
            {children ? children : `${display(game)} - ${display(category)}`}
        </Link>
    );
};

export const GameLink = ({ game, children }: GameLinkProps) => {
    return (
        <Link href={`/game/${encodeURIComponent(game)}`} legacyBehavior>
            {children ? children : display(game)}
        </Link>
    );
};

export const GameCategoryLink = ({
    game,
    category,
    children,
}: GameCategoryLinkProps) => {
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
