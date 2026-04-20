import { ValueOf } from 'next/dist/shared/lib/constants';
import React, { useState } from 'react';
import { Col, Row, Table } from 'react-bootstrap';
import Switch from 'react-switch';
import { Run, SplitsHistory, SplitTimes } from '../../../common/types';
import styles from '../../css/User.module.scss';
import SplitName from '../../transformers/split-name';
import { Difference, DurationToFormatted } from '../../util/datetime';

interface SplitsProps {
    splits: SplitsHistory[];
    gameTime: boolean;
    run: Run;
}

const SPLIT_FILTERS = {
    BEST_POSSIBLE: 'Best Possible',
    BEST_ACHIEVED: 'Best Achieved',
    AVERAGE: 'Average',
} as const;

type SplitFilterValue = ValueOf<typeof SPLIT_FILTERS>;

export const Splits = ({ splits, gameTime = false, run }: SplitsProps) => {
    const hasAlternatives =
        splits.length > 0 &&
        splits[0].single.alternative &&
        splits[0].single.alternative.length > 0;

    const [totalTime, setTotalTime] = useState(true);
    const [selectedComparison, setSelectedComparison] =
        useState<SplitFilterValue>(SPLIT_FILTERS.BEST_POSSIBLE);
    const [selectedAlternative, setSelectedAlternative] = useState(
        hasAlternatives ? splits[0].single.alternative[0].name : '',
    );

    const splitToUse = totalTime ? 'total' : 'single';

    return (
        <div>
            <Row>
                <Col xl={9} style={{ whiteSpace: 'nowrap', display: 'flex' }}>
                    <h2>Splits {gameTime && '(IGT)'}</h2>
                </Col>
                <Col sm={3} style={{ display: 'flex', justifyContent: 'end' }}>
                    <div className="d-flex justify-content-start align-items-center justify-content-lg-center">
                        <div className="me-2">Segment time</div>
                        <Switch
                            uncheckedIcon={false}
                            checkedIcon={false}
                            onColor={getComputedStyle(
                                document.documentElement,
                            ).getPropertyValue('--bs-link-color')}
                            offColor={getComputedStyle(
                                document.documentElement,
                            ).getPropertyValue('--bs-link-color')}
                            name="switch"
                            onChange={(checked) => {
                                setTotalTime(checked);
                            }}
                            checked={totalTime}
                        />
                        <div className="ms-2">Split time</div>
                    </div>
                </Col>
            </Row>
            <Table striped bordered hover responsive={true}>
                <thead>
                    <tr>
                        <th style={{ width: '25%' }}>Name</th>
                        <th style={{ width: '15%' }}>Split</th>
                        <th
                            style={{ width: '15%' }}
                            className={styles.splitComparisonOption}
                        >
                            <select
                                style={{ padding: '0 2.25rem 0 0' }}
                                className={`form-select ${styles.hideSelectArrow}`}
                                value={selectedComparison}
                                onChange={(e) => {
                                    setSelectedComparison(
                                        e.target.value as SplitFilterValue,
                                    );
                                }}
                            >
                                {[
                                    'Best Possible',
                                    'Best Achieved',
                                    'Average',
                                ].map((alt) => {
                                    return (
                                        <option key={alt} value={alt}>
                                            {alt}
                                        </option>
                                    );
                                })}
                            </select>
                        </th>
                        <th
                            style={{ width: '15%' }}
                            className={styles.splitOptional}
                        >
                            Best possible
                        </th>
                        <th
                            style={{ width: '15%' }}
                            className={styles.splitOptional}
                        >
                            Best achieved
                        </th>
                        <th
                            style={{ width: '15%' }}
                            className={styles.splitOptional}
                        >
                            Average
                        </th>
                        {hasAlternatives && (
                            <th style={{ width: '15%' }}>
                                <select
                                    style={{ padding: '0 2.25rem 0 0' }}
                                    className={
                                        `form-select` +
                                        ` ${styles.hideSelectArrow}`
                                    }
                                    value={selectedAlternative}
                                    onChange={(e) => {
                                        setSelectedAlternative(e.target.value);
                                    }}
                                >
                                    {splits[0].single.alternative.map((alt) => {
                                        return (
                                            <option
                                                key={alt.name}
                                                value={alt.name}
                                            >
                                                {alt.name}
                                            </option>
                                        );
                                    })}
                                </select>
                            </th>
                        )}
                    </tr>
                </thead>
                <tbody>
                    {splits.map((split, key) => {
                        const alternativeDuration =
                            split[splitToUse].alternative.find(
                                (time) => time.name == selectedAlternative,
                            )?.time || '';
                        return (
                            <tr key={key}>
                                <td>
                                    <SplitName splitName={split.name} />
                                </td>
                                <td>
                                    <strong>
                                        <DurationToFormatted
                                            duration={split[splitToUse].time}
                                        />
                                    </strong>
                                </td>

                                {selectedComparison ===
                                    SPLIT_FILTERS.BEST_POSSIBLE && (
                                    <TimeCell
                                        name="bestPossibleTime"
                                        split={split[splitToUse]}
                                    />
                                )}
                                {selectedComparison ===
                                    SPLIT_FILTERS.BEST_ACHIEVED && (
                                    <TimeCell
                                        name="bestAchievedTime"
                                        split={split[splitToUse]}
                                    />
                                )}
                                {selectedComparison ===
                                    SPLIT_FILTERS.AVERAGE && (
                                    <TimeCell
                                        name="averageTime"
                                        split={split[splitToUse]}
                                    />
                                )}

                                <TimeCell
                                    name="bestPossibleTime"
                                    split={split[splitToUse]}
                                    optional={true}
                                />
                                <TimeCell
                                    name="bestAchievedTime"
                                    split={split[splitToUse]}
                                    optional={true}
                                />
                                <TimeCell
                                    name="averageTime"
                                    split={split[splitToUse]}
                                    optional={true}
                                />

                                {hasAlternatives && (
                                    <td>
                                        <div style={{ float: 'left' }}>
                                            <DurationToFormatted
                                                duration={alternativeDuration}
                                                withMillis={true}
                                            />
                                        </div>
                                        <small style={{ float: 'right' }}>
                                            {/*<sup>*/}
                                            <Difference
                                                one={split[splitToUse].time}
                                                two={alternativeDuration}
                                                withMillis={true}
                                            />
                                            {/*</sup>*/}
                                        </small>
                                    </td>
                                )}
                            </tr>
                        );
                    })}
                </tbody>
            </Table>
        </div>
    );
};

interface TimeCellProps {
    name: Exclude<keyof SplitTimes, 'alternative'>;
    split: SplitTimes;
    optional?: boolean;
}

const TimeCell: React.FunctionComponent<TimeCellProps> = ({
    name,
    split,
    optional = false,
}) => {
    return (
        <td
            className={
                optional ? styles.splitOptional : styles.splitComparisonOption
            }
        >
            <div>
                <div style={{ float: 'left' }}>
                    <DurationToFormatted duration={split[name]} />
                </div>
                <small style={{ float: 'right' }}>
                    <Difference one={split.time} two={split[name]} />
                </small>
            </div>
        </td>
    );
};
