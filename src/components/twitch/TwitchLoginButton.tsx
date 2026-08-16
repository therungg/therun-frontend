'use client';

import { usePathname } from 'next/navigation';
import React from 'react';
import styles from './TwitchLoginButton.module.scss';
import { getTwitchOAuthURL } from './twitch-oauth';

interface TwitchLoginButtonProps {
    /**
     * Where to land after logging in. Defaults to the page the button is on,
     * query string included.
     */
    returnTo?: string;
}

export const TwitchLoginButton: React.FunctionComponent<
    TwitchLoginButtonProps
> = ({ returnTo }) => {
    const pathname = usePathname();

    // The href is rendered from the pathname alone, because the query string is
    // not available during render without opting the whole page out of static
    // rendering. On click we know the real URL, so the search params come along.
    const href = getTwitchOAuthURL({ returnTo: returnTo ?? pathname }).href;

    const onClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
        if (returnTo || event.defaultPrevented) return;
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.button)
            return;

        const { pathname: livePath, search } = window.location;
        if (!search) return;

        event.preventDefault();
        window.location.href = getTwitchOAuthURL({
            returnTo: `${livePath}${search}`,
        }).href;
    };

    return (
        <a href={href} onClick={onClick} className={styles.button}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714z" />
            </svg>
            Login
        </a>
    );
};
