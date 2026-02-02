import { useState } from 'react';
import { Col, Row } from 'react-bootstrap';
import Switch from 'react-switch';
import useSWR from 'swr';
import { fetcher } from '~src/utils/fetcher';
import { safeEncodeURI } from '~src/utils/uri';
import WrHistory from '../tournament/wr-history';
import WrHistoryTableMode from './wr-history-table-mode';

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
        `/api/games/${safeEncodeURI(game)}/${safeEncodeURI(category)}`,
        fetcher,
        {
            revalidateOnReconnect: false,
            revalidateOnFocus: false,
            revalidateIfStale: false,
        },
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
            <Row className="flex-center">
                <Col xl={3}>
                    <h2>Record History</h2>
                </Col>
                <Col xl={6} className="flex-center">
                    <span className="me-2">Data Mode</span>
                    <Switch
                        onColor={getComputedStyle(
                            document.documentElement,
                        ).getPropertyValue('--bs-tertiary-bg')}
                        offColor={getComputedStyle(
                            document.documentElement,
                        ).getPropertyValue('--bs-tertiary-bg')}
                        checkedIcon={false}
                        uncheckedIcon={false}
                        name="switch"
                        onChange={(checked) => {
                            setVisualMode(checked);
                        }}
                        checked={visualMode}
                    />

                    <span className="me-2">Visual Mode</span>
                </Col>
                <Col xl={3}></Col>
            </Row>
            <Row>
                {visualMode && (
                    <div>
                        <WrHistory historyData={history} />
                    </div>
                )}
                {!visualMode && (
                    <div>
                        <WrHistoryTableMode historyData={history} />
                    </div>
                )}
            </Row>
        </div>
    );
};

export default CategoryRecordHistory;
