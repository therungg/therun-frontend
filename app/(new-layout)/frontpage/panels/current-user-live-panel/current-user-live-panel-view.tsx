'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { LiveRun } from '~app/(old-layout)/live/live.types';
import { useLiveRunsWebsocket } from '~src/components/websocket/use-reconnect-websocket';
import styles from './current-user-live-panel.module.scss';

interface CurrentUserLivePanelViewProps {
    initialLiveData: LiveRun;
    username: string;
}

export const CurrentUserLivePanelView: React.FC<
    CurrentUserLivePanelViewProps
> = ({ initialLiveData, username }) => {
    const [liveRun, setLiveRun] = useState<LiveRun | undefined>(
        initialLiveData,
    );
    const lastMessage = useLiveRunsWebsocket(username);

    useEffect(() => {
        if (lastMessage !== null) {
            if (lastMessage.type === 'UPDATE') {
                setLiveRun(lastMessage.run);
            }
            if (lastMessage.type === 'DELETE') {
                setLiveRun(undefined);
            }
        }
    }, [lastMessage]);

    // Hide panel if run ended
    if (!liveRun) {
        return null;
    }

    return (
        <Link href={`/live/${username}`} className={styles.panelLink}>
            <div className={styles.liveRunPanel}>
                <div>Live run content placeholder</div>
            </div>
        </Link>
    );
};
