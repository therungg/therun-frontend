'use client';

import { useEffect, useState } from 'react';
import { Button, Col, Row } from 'react-bootstrap';
import { X as XIcon } from 'react-bootstrap-icons';
import { TwitchEmbed } from 'react-twitch-embed';
import { useRaceLiveContext } from '~app/(new-layout)/races/[race]/race-commentary-drawer-host';
import { getSplitStatus } from '~src/components/live/recommended-stream';
import { SplitsViewer } from '~src/components/live/splits-viewer';
import { getColorMode } from '~src/utils/colormode';

export const RaceFocusedRunner = () => {
    const { focusedRun, unfocus } = useRaceLiveContext();
    const [dark, setDark] = useState(true);

    useEffect(() => {
        setDark(getColorMode() !== 'light');
    }, []);

    if (!focusedRun || focusedRun.isMinified || !focusedRun.splits) return null;

    const currentSplitSplitStatus = getSplitStatus(
        focusedRun,
        focusedRun.currentSplitIndex,
    );

    const channel =
        focusedRun.login &&
        focusedRun.login.toLowerCase() !== focusedRun.user.toLowerCase()
            ? focusedRun.login
            : focusedRun.user;

    return (
        <Row className="g-3 mb-3">
            <Col xl={5} lg={5} md={12} className="overflow-hidden">
                <SplitsViewer
                    activeLiveRun={focusedRun}
                    currentSplitSplitStatus={currentSplitSplitStatus}
                    dark={dark}
                    setSelectedSplit={() => {
                        /* no-op: stats panel that consumes this is not rendered here */
                    }}
                />
            </Col>
            <Col xl={7} lg={7} md={12}>
                <div className="d-flex justify-content-end mb-2">
                    <Button
                        variant="outline-secondary"
                        size="sm"
                        onClick={unfocus}
                        aria-label="Dismiss focused runner"
                        className="d-inline-flex align-items-center gap-1"
                    >
                        <XIcon size={18} />
                        Dismiss
                    </Button>
                </div>
                <div style={{ aspectRatio: '16 / 9', minHeight: '300px' }}>
                    <TwitchEmbed
                        channel={channel}
                        width="100%"
                        height="100%"
                        muted
                        withChat={false}
                    />
                </div>
            </Col>
        </Row>
    );
};
