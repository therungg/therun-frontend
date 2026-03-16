'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useRef, useState } from 'react';
import { resetSession } from '~src/actions/reset-session.action';
import { Button } from '~src/components/Button/Button';
import { NameAsPatreon } from '~src/components/patreon/patreon-name';
import { TwitchLoginButton } from '~src/components/twitch/TwitchLoginButton';
import styles from './UserMenu.module.scss';

interface UserMenuProps {
    username?: string;
    picture?: string;
    sessionError?: string | null;
}

export function UserMenu({ username, picture, sessionError }: UserMenuProps) {
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const logout = useCallback(async () => {
        await fetch('/api/logout', { method: 'POST' });
        router.push('/');
        router.refresh();
    }, [router]);

    const handleResetSession = useCallback(async () => {
        await resetSession();
        window.location.reload();
    }, []);

    if (sessionError) {
        return (
            <Button className="btn btn-primary" onClick={handleResetSession}>
                Reset session
            </Button>
        );
    }

    if (!username) {
        return <TwitchLoginButton url="/api" />;
    }

    return (
        <div
            className={styles.container}
            ref={containerRef}
            onMouseLeave={() => setOpen(false)}
        >
            <button
                type="button"
                className={styles.trigger}
                onClick={() => setOpen((prev) => !prev)}
                aria-expanded={open}
                aria-haspopup="true"
            >
                {picture && (
                    <Image
                        src={picture}
                        alt={username}
                        width={28}
                        height={28}
                        className={styles.avatar}
                        unoptimized
                    />
                )}
                <NameAsPatreon name={username} />
            </button>
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
