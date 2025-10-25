'use client';

import clsx from 'clsx';
import { useEffect, useState } from 'react';
import { Col, Row } from 'react-bootstrap';
import { TwitchPlayer } from 'react-twitch-embed';
import { LiveRun } from '~app/(old-layout)/live/live.types';
import { LiveSplitTimerComponent } from '~app/(old-layout)/live/live-split-timer.component';
import { Button } from '~src/components/Button/Button';
import {
    DifferenceFromOne,
    DurationToFormatted,
} from '~src/components/util/datetime';
import { useLiveRunsWebsocket } from '~src/components/websocket/use-reconnect-websocket';
import styles from './live-runs-panel.module.scss';

export const LiveRunsView = ({ liveRuns }: { liveRuns: LiveRun[] }) => {
    const [showedRunIndex, setShowedRunIndex] = useState(0);

    return (
        <div>
            <LiveRunView
                liveRun={liveRuns[showedRunIndex]}
                goToNextRun={() => {
                    setShowedRunIndex(
                        showedRunIndex === liveRuns.length - 1
                            ? 0
                            : showedRunIndex + 1,
                    );
                }}
            />
            <div className="container-fluid px-4"></div>
        </div>
    );
};

export const LiveRunView = ({
    liveRun,
    goToNextRun,
}: {
    liveRun: LiveRun;
    goToNextRun: () => void;
}) => {
    const [updatedLiveRun, setUpdatedLiveRun] = useState<LiveRun | undefined>(
        liveRun,
    );

    const lastMessage = useLiveRunsWebsocket(liveRun.user);

    useEffect(() => {
        if (lastMessage !== null) {
            if (lastMessage.type === 'UPDATE') {
                setUpdatedLiveRun(lastMessage.run);
            }

            if (lastMessage.type === 'DELETE') {
                setUpdatedLiveRun(undefined);
            }
        }
    }, [lastMessage]);

    useEffect(() => {
        setUpdatedLiveRun(liveRun);
    }, [liveRun]);

    if (updatedLiveRun === undefined) {
        return <div>Loading...</div>;
    }

    return (
        <div className="d-flex justify-content-between h-100">
            <div className="d-flex flex-column w-100 py-2 px-3 h-100">
                <h3 className="text-center w-100 m-0">{updatedLiveRun.user}</h3>
                <span className="text-center fs-smaller text-muted">
                    is running
                </span>
                <span className="text-center">
                    <span className="fw-bold">{updatedLiveRun.game}</span> -{' '}
                    <span className="fst-italic">
                        {updatedLiveRun.category}
                    </span>
                </span>

                <hr
                    style={{
                        width: '75%',
                        marginLeft: 'auto',
                        marginRight: 'auto',
                        marginTop: '0.8rem',
                        marginBottom: '0.2rem',
                    }}
                />
                <LiveSplitTimerComponent
                    liveRun={updatedLiveRun}
                    dark={false}
                    withDiff={false}
                    timerClassName={
                        'font-monospace text-center w-100 fs-larger fw-bold'
                    }
                />

                <Row className="mt-3">
                    <Col className="d-flex flex-column justify-content-center align-items-center">
                        <span className="text-muted bg-body-secondary-bg color-body-secondary-bg text-body-secondary-bg text-body-secondary">
                            Personal Best
                        </span>
                        <span className="fw-bold">
                            <DurationToFormatted duration={updatedLiveRun.pb} />
                        </span>
                    </Col>
                    <Col className="d-flex flex-column justify-content-center align-items-center">
                        <span className="text-muted">Current Split</span>
                        <span className="fw-bold text-nowrap">
                            {updatedLiveRun.currentSplitName}
                        </span>
                    </Col>
                    <Col className="d-flex flex-column justify-content-center align-items-center">
                        <span className="text-muted">+- PB</span>
                        <span className="fw-bold text-nowrap">
                            <DifferenceFromOne diff={updatedLiveRun.delta} />
                        </span>
                    </Col>
                </Row>

                <div className="mt-3 text-center">
                    <Button
                        variant="primary"
                        className="mt-2 align-self-end text color-body-color"
                        onClick={() => {
                            goToNextRun();
                        }}
                    >
                        {'Watch the next run >'}
                    </Button>
                </div>
            </div>
            <div className={clsx(styles.stream, 'd-flex z-index-1 w-100')}>
                <TwitchPlayer
                    channel={updatedLiveRun.user}
                    height={'100%'}
                    width={'100%'}
                    autoplay={true}
                    muted={true}
                    id={'twitch-player'}
                />
            </div>
        </div>
    );
};
