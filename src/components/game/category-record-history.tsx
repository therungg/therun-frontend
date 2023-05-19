import useSWR from "swr";
import { fetcher } from "../../utils/fetcher";
import WrHistory from "../tournament/wr-history";
import { Col, Row } from "react-bootstrap";
import { useState } from "react";
import Switch from "react-switch";
import WrHistoryTableMode from "./wr-history-table-mode";
import styles from "../../components/css/WrHistory.module.scss";

export const CategoryRecordHistory = ({
    game,
    category,
    gameTime,
}: {
    game: string;
    category: string;
    gameTime: boolean;
}) => {
    const { data } = useSWR(
        `/api/games/${encodeURIComponent(game)}/${encodeURIComponent(
            category
        )}`,
        fetcher,
        {
            revalidateOnReconnect: false,
            revalidateOnFocus: false,
            revalidateIfStale: false,
        }
    );

    const [visualMode, setVisualMode] = useState(true);

    if (!data) {
        return <div>Loading data...</div>;
    }

    if (!data.wrHistory) {
        return <div>Select a category above to view Record History</div>;
    }

    let history = data.wrHistory;

    if (gameTime) history = data.wrHistoryGameTime;

    return (
        <div>
            <Row className={"flex-center"}>
                <Col xl={3}>
                    <h2>Record History</h2>
                </Col>
                <Col xl={6} className={`${styles.visualMode} flex-center`}>
                    <span style={{ marginRight: "0.5rem" }}>Data Mode</span>
                    <Switch
                        onColor={getComputedStyle(
                            document.body
                        ).getPropertyValue("--color-tertiary")}
                        offColor={getComputedStyle(
                            document.body
                        ).getPropertyValue("--color-tertiary")}
                        checkedIcon={false}
                        uncheckedIcon={false}
                        name={"switch"}
                        onChange={(checked) => {
                            setVisualMode(checked);
                        }}
                        checked={visualMode}
                    />

                    <span style={{ marginLeft: "0.5rem" }}>Visual Mode</span>
                </Col>
                <Col xl={3}></Col>
            </Row>
            <Row>
                {visualMode && (
                    <div className={styles.visualMode}>
                        <WrHistory historyData={history} />
                    </div>
                )}
                {!visualMode && (
                    <div className={styles.dataMode}>
                        <WrHistoryTableMode historyData={history} />
                    </div>
                )}
            </Row>
        </div>
    );
};

export default CategoryRecordHistory;
