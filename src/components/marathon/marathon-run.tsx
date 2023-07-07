import { LiveUserRun } from "../live/live-user-run";
import { SendMarathonDataButton } from "./send-marathon-data-button";
import { Stats } from "../run/dashboard/stats";
import { Col, Row } from "react-bootstrap";
import EventDisplay from "./event-display";
import { generalDataEvent } from "./events/general-data-event";
import LiveRunStats, { liveRunEvent } from "./live-run-stats";
import { useEffect, useState } from "react";
import styles from "../css/LiveRun.module.scss";
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
        <div style={{ marginTop: "1rem" }}>
            <Row>
                <Col>
                    <div
                        style={{
                            display: "flex",
                            justifyContent: "center",
                            width: "100%",
                        }}
                    >
                        <div style={{ width: "600px" }}>
                            <LiveUserRun liveRun={runData} />
                        </div>
                    </div>
                </Col>
                <Col>
                    <div
                        style={{
                            display: "flex",
                            justifyContent: "center",
                            width: "100%",
                        }}
                    >
                        <div
                            style={{
                                width: "600px",
                                padding: "0.5rem",
                                overflow: "scroll",
                            }}
                            className={styles.liveRunContainer}
                        >
                            <EventDisplay session={session} />
                        </div>
                    </div>
                </Col>
            </Row>
            <hr />
            <div style={{ marginTop: "1rem" }}>
                <Row>
                    <Col xl={5} lg={12} md={12}>
                        <FreeInput
                            liveRun={currentLiveRun}
                            sessionId={session.id}
                        />
                        <SuggestedEvents
                            liveRun={currentLiveRun}
                            sessionId={session.id}
                        />
                    </Col>
                    <Col xl={4} lg={12} md={12}>
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
                    <Col xl={3} lg={12} md={12}>
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
