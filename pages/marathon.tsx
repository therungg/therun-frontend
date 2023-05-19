import { useEffect, useState } from "react";
import { LiveDataMap, liveRunArrayToMap } from "./live";
import { GetServerSideProps } from "next";
import { LiveRun } from "../components/live/live-user-run";
import { getAllLiveRuns } from "../lib/live-runs";
import styles from "../components/css/Search.module.scss";
import MarathonRun from "../components/marathon/marathon-run";
import { Col, Row } from "react-bootstrap";
import { useReconnectWebsocket } from "../components/websocket/use-reconnect-websocket";

export const Marathon = ({
    liveDataMap,
    session,
}: {
    liveDataMap: LiveDataMap;
    session: any;
}) => {
    const [updatedLiveDataMap, setUpdatedLiveDataMap] = useState(liveDataMap);
    const [selectedUser, setSelectedUser] = useState("");
    const [currentUserData, setCurrentUserData] = useState();

    const lastMessage = useReconnectWebsocket();

    useEffect(() => {
        if (lastMessage !== null) {
            const data = JSON.parse(lastMessage.data);
            const user = data.user;
            let newMap: LiveDataMap = JSON.parse(
                JSON.stringify(updatedLiveDataMap)
            );

            if (data.type == "UPDATE") {
                newMap[user] = data.run;
            }

            if (data.type == "DELETE") {
                delete newMap[user];
            }

            newMap = liveRunArrayToMap(Object.values(newMap));

            setUpdatedLiveDataMap(newMap);
        }
    }, [lastMessage]);

    useEffect(() => {
        if (updatedLiveDataMap[selectedUser]) {
            setCurrentUserData(updatedLiveDataMap[selectedUser]);
        } else {
            setCurrentUserData(undefined);
        }
    }, [selectedUser, updatedLiveDataMap]);

    if (!session.username) {
        return <div>Please login to use this feature.</div>;
    }

    if (!currentUserData && !selectedUser) {
        return (
            <div>
                <BasePage
                    selectedUser={selectedUser}
                    setSelectedUser={setSelectedUser}
                    updatedLiveDataMap={updatedLiveDataMap}
                />
                <div
                    style={{
                        marginTop: "1rem",
                        display: "flex",
                        justifyContent: "center",
                    }}
                >
                    Please select or type a username to begin.
                </div>
            </div>
        );
    }

    if (
        (!currentUserData || !currentUserData.gameData) &&
        !!selectedUser &&
        selectedUser.length > 0
    ) {
        return (
            <div>
                <BasePage
                    selectedUser={selectedUser}
                    setSelectedUser={setSelectedUser}
                    updatedLiveDataMap={updatedLiveDataMap}
                />
                <div
                    style={{
                        marginTop: "1rem",
                        display: "flex",
                        justifyContent: "center",
                    }}
                >
                    Waiting for user data to become available... Please try a
                    reset, which will upload the data.
                </div>
            </div>
        );
    }

    return (
        <div>
            <BasePage
                selectedUser={selectedUser}
                setSelectedUser={setSelectedUser}
                updatedLiveDataMap={updatedLiveDataMap}
            />
            <hr />
            <div>
                {currentUserData.gameData && (
                    <MarathonRun runData={currentUserData} session={session} />
                )}
            </div>
        </div>
    );
};

const BasePage = ({ selectedUser, setSelectedUser, updatedLiveDataMap }) => {
    return (
        <div>
            <div style={{ display: "flex", justifyContent: "center" }}>
                <h1>Marathon Dashboard</h1>
            </div>
            <Row>
                <Col>
                    <div style={{ display: "flex", justifyContent: "center" }}>
                        Select a user:
                    </div>
                    <div style={{ display: "flex", justifyContent: "center" }}>
                        <div>
                            <select
                                className={"form-select"}
                                style={{ width: "600px" }}
                                value={selectedUser}
                                onChange={(e) => {
                                    setSelectedUser(e.target.value);
                                }}
                            >
                                <option key={""}>Select a user</option>
                                {Object.keys(updatedLiveDataMap).map((key) => {
                                    return <option key={key}>{key}</option>;
                                })}
                            </select>
                        </div>
                    </div>
                </Col>
                <Col>
                    <div style={{ display: "flex", justifyContent: "center" }}>
                        Or poll for user:
                    </div>
                    <div style={{ display: "flex", justifyContent: "center" }}>
                        <input
                            type="search"
                            className={`form-control ${styles.search}`}
                            placeholder="Poll for a user"
                            onChange={async (e) => {
                                setSelectedUser(e.target.value);
                            }}
                            value={selectedUser}
                            id="searchBox"
                            style={{ width: "600px" }}
                        />
                    </div>
                </Col>
            </Row>
        </div>
    );
};

export const getServerSideProps: GetServerSideProps = async () => {
    const liveData: LiveRun[] = await getAllLiveRuns();
    return {
        props: { liveDataMap: liveRunArrayToMap(liveData) },
    };
};

export default Marathon;
