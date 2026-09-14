'use client';

import { useEffect } from 'react';
import styles from './leaderboards-profile.module.scss';
import { useShowcase } from './showcase-provider';

/** The owner's way in. `?edit=1` (from settings) opens edit mode on load. */
export function CustomizeButton() {
    const { editing, setEditing } = useShowcase();
    useEffect(() => {
        const url = new URL(window.location.href);
        if (url.searchParams.get('edit') === '1') {
            url.searchParams.delete('edit');
            window.history.replaceState(window.history.state, '', url);
            setEditing(true);
        }
    }, [setEditing]);
    if (editing) return null;
    return (
        <button
            type="button"
            className={styles.actionPill}
            onClick={() => setEditing(true)}
        >
            Customize
        </button>
    );
}
