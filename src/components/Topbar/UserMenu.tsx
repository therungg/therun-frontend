'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
    type SyntheticEvent,
    useCallback,
    useEffect,
    useRef,
    useState,
} from 'react';
import { resetSession } from '~src/actions/reset-session.action';
import { Button } from '~src/components/Button/Button';
import Link from '~src/components/link';
import { NameAsPatreon } from '~src/components/patreon/patreon-name';
import { useSessionActions } from '~src/components/session-provider';
import { TwitchLoginButton } from '~src/components/twitch/TwitchLoginButton';
import { BunnyIcon } from '~src/icons/bunny-icon';
import styles from './UserMenu.module.scss';

interface UserMenuProps {
    username?: string;
    picture?: string;
    sessionError?: string | null;
}

export function UserMenu({ username, picture, sessionError }: UserMenuProps) {
    const router = useRouter();
    const { clear: clearSession } = useSessionActions();
    const [open, setOpen] = useState(false);
    const [avatarError, setAvatarError] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Logging out leaves you where you are — only the session goes away. The
    // cookie is cleared server-side, the client session state right after, so
    // the menu flips to logged-out without a page load.
    const logout = useCallback(async () => {
        await fetch('/api/logout', { method: 'POST' });
        clearSession();
        router.refresh();
    }, [clearSession, router]);

    const handleResetSession = useCallback(async () => {
        await resetSession();
        window.location.reload();
    }, []);

    // Close on click outside (#7)
    useEffect(() => {
        if (!open) return;

        const handleClickOutside = (e: MouseEvent) => {
            if (
                containerRef.current &&
                !containerRef.current.contains(e.target as Node)
            ) {
                setOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () =>
            document.removeEventListener('mousedown', handleClickOutside);
    }, [open]);

    if (sessionError) {
        return (
            <Button className="btn btn-primary" onClick={handleResetSession}>
                Reset session
            </Button>
        );
    }

    if (!username) {
        return <TwitchLoginButton />;
    }

    return (
        <div
            className={styles.container}
            ref={containerRef}
            onMouseLeave={() => setOpen(false)}
        >
            <Link
                href={`/${username}`}
                className={styles.trigger}
                onMouseEnter={() => setOpen(true)}
                aria-expanded={open}
                aria-haspopup="true"
            >
                {picture && !avatarError ? (
                    <Image
                        src={picture}
                        alt={username}
                        width={32}
                        height={32}
                        className={styles.avatar}
                        unoptimized
                        onError={(_e: SyntheticEvent<HTMLImageElement>) =>
                            setAvatarError(true)
                        }
                    />
                ) : (
                    <span className={styles.avatarFallback}>
                        {username.charAt(0).toUpperCase()}
                    </span>
                )}
                <NameAsPatreon name={username} />
            </Link>
            <div
                className={`${styles.dropdown} ${open ? styles.dropdownOpen : ''}`}
                role="menu"
            >
                <Link
                    href={`/${username}`}
                    className={styles.item}
                    role="menuitem"
                    onClick={() => setOpen(false)}
                >
                    Profile
                </Link>
                <Link
                    href="/change-appearance"
                    className={styles.item}
                    role="menuitem"
                    onClick={() => setOpen(false)}
                >
                    <span className={styles.itemWithIcon}>
                        Change appearance
                        <span className={styles.itemBunny}>
                            <BunnyIcon size={16} />
                        </span>
                    </span>
                </Link>
                <button
                    type="button"
                    className={styles.item}
                    role="menuitem"
                    onClick={async () => {
                        setOpen(false);
                        await logout();
                    }}
                >
                    Logout
                </button>
            </div>
        </div>
    );
}
