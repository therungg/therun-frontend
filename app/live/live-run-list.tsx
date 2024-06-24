import React, { memo } from "react";
import { LiveRun } from "./live.types";
import { Col } from "react-bootstrap";
import { LiveUserRun } from "~src/components/live/live-user-run";

interface LiveRunListProps {
    onClick: (_liveRun: LiveRun) => void;
    liveData: LiveRun[];
    currentlyViewing: string;
}

export const LiveRunList = memo<LiveRunListProps>(
    ({ liveData, onClick, currentlyViewing }) => {
        return liveData.map((liveRun) => {
            return (
                <Col key={liveRun.user} onClick={() => onClick(liveRun)}>
                    <LiveUserRun
                        liveRun={liveRun}
                        currentlyActive={currentlyViewing}
                        key={liveRun.user}
                    />
                </Col>
            );
        });
    },
);

LiveRunList.displayName = "LiveRunList";
