import React, { useState } from 'react';
import { Form } from 'react-bootstrap';
import { TwitchEmbed } from 'react-twitch-embed';

export const RaceStream = ({ stream }: { stream: string }) => {
    const [showStream, setShowStream] = useState(!!stream);
    if (!stream) return <></>;
    return (
        <div className="mb-3">
            <Form>
                <Form.Check
                    name="showStream"
                    type="checkbox"
                    defaultChecked={showStream}
                    label="Show Stream"
                    id="show-stream"
                    reverse
                    onChange={() => {
                        setShowStream(!showStream);
                    }}
                />
            </Form>
            {showStream && (
                <TwitchEmbed
                    className="card game-border ratio ratio-16x9 rounded overflow-hidden"
                    channel={stream}
                    width="100%"
                    height="revert"
                    muted
                    withChat={false}
                />
            )}
        </div>
    );
};
