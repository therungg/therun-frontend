import { LiveUserRun } from "../live/live-user-run";
import { SendMarathonDataButton } from "./send-marathon-data-button";
import { Stats } from "../run/dashboard/stats";
import { Col, Row } from "react-bootstrap";
import EventDisplay from "./event-display";
import { generalDataEvent } from "./events/general-data-event";
import LiveRunStats, { liveRunEvent } from "./live-run-stats";
import { useEffect, useState } from "react";
import SuggestedEvents from "./suggested-events";
import { FreeInput } from "./free-input";
import { LiveRun } from "~app/live/live.types";

export const MarathonRun = ({
    runData,
    session,
}: {
    runData: LiveRun;
    session: { username: string; id: string };
}) => {
    const [currentLiveRun, setCurrentLiveRun] = useState(runData);

    useEffect(() => {
        setCurrentLiveRun(runData);
    }, [runData]);

    return (
        <div className="mt-3">
            <Row>
                <Col md={6}>
                    <LiveUserRun liveRun={runData} />
                </Col>
                <Col md={6}>
                    <div className="h-110p p-2 overflow-auto bg-body-secondary">
                        <EventDisplay session={session} />
                    </div>
                </Col>
            </Row>
            <hr />
            <div className="mt-3">
                <Row>
                    <Col md={12} xl={5}>
                        <FreeInput
                            liveRun={currentLiveRun}
                            sessionId={session.id}
                        />
                        <SuggestedEvents
                            liveRun={currentLiveRun}
                            sessionId={session.id}
                        />
                    </Col>
                    <Col md={12} xl={4}>
                        <LiveRunStats
                            liveRun={currentLiveRun}
                            sessionId={session.id}
                        />

                        <SendMarathonDataButton
                            buttonText={"Submit current run data to ESA"}
                            description={
                                "Will transmit real-time data about the current run"
                            }
                            sessionId={session.id}
                            data={liveRunEvent(runData)}
                        />
                    </Col>
                    <Col md={12} xl={3}>
                        <Stats run={runData.gameData} sessionId={session.id} />

                        <SendMarathonDataButton
                            sessionId={session.id}
                            buttonText={"Submit general runner data to ESA"}
                            data={generalDataEvent(runData)}
                            description={
                                "Will transmit general data about the runner to ESA as shown above. Will trigger event --INSERT EVENT ON ESA STREAM-- at ESA. "
                            }
                        />
                    </Col>
                </Row>
            </div>
        </div>
    );
};

export default MarathonRun;
