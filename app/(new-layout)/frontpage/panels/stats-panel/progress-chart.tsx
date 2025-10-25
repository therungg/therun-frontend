'use client';
import { CircularProgressbarWithChildren as CircularProgressbar } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';
import { Col, Row } from 'react-bootstrap';
import { FaCheck, FaClock, FaFlagCheckered, FaGamepad } from 'react-icons/fa6';
import { UserSummary } from '~src/types/summary.types';
import styles from './stats-panel.module.scss';

export const ProgressChart = ({ stats }: { stats: UserSummary }) => {
    const percentage = (stats.totalFinishedRuns / stats.totalRuns) * 100;
    return (
        <div className="d-flex">
            <div className={styles.circle}>
                <CircularProgressbar className="mh-100" value={percentage}>
                    <span className="fs-4 fw-bold">
                        {`${percentage.toFixed(2)}%`}
                    </span>
                </CircularProgressbar>
            </div>
            <div className="ms-4 d-flex flex-column justify-content-center">
                <Row>
                    <Col className="fs-5 fw-bold text-primary text-nowrap col-4">
                        <FaClock size={14} className="mb-1 me-1 " />{' '}
                        {(stats.totalPlaytime / 1000 / 60 / 60).toFixed(0)}
                    </Col>
                    <Col className="col-8 text-nowrap d-flex align-items-center justify-content-end">
                        Hours played
                    </Col>
                </Row>
                <Row>
                    <Col className="fs-5 fw-bold text-primary text-nowrap col-4">
                        <FaFlagCheckered size={14} className="mb-1 me-1" />{' '}
                        {stats.totalFinishedRuns}
                    </Col>
                    <Col className="col-8 text-nowrap d-flex align-items-center justify-content-end">
                        Finished runs
                    </Col>
                </Row>
                <Row>
                    <Col className="fs-5 fw-bold text-primary text-nowrap col-4">
                        <FaCheck size={14} className="mb-1 me-1" />{' '}
                        {stats.totalRuns}
                    </Col>
                    <Col className="col-8 text-nowrap d-flex align-items-center justify-content-end">
                        Started runs
                    </Col>
                </Row>
                <Row>
                    <Col className="fs-5 fw-bold text-primary text-nowrap  col-4">
                        <FaGamepad size={14} className="mb-1 me-1" />{' '}
                        {stats.races.length}
                    </Col>
                    <Col className="col-8 text-nowrap d-flex align-items-center justify-content-end">
                        Races
                    </Col>
                </Row>
            </div>
        </div>
    );
};
