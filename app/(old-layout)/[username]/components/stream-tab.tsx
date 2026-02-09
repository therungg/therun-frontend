'use client';

import { TwitchEmbed } from 'react-twitch-embed';
import { Panel } from '~app/(new-layout)/components/panel.component';

interface StreamTabProps {
    username: string;
}

export const StreamTab = ({ username }: StreamTabProps) => (
    <Panel subtitle="Live" title="Twitch Stream">
        <TwitchEmbed
            channel={username}
            width="100%"
            height="800px"
            muted
            withChat={true}
        />
    </Panel>
);
