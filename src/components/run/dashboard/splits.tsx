import { Run, SplitTimes, SplitsHistory } from "../../../common/types";
import { Difference, DurationToFormatted } from "../../util/datetime";
import { Col, Row, Table } from "react-bootstrap";
import { useState } from "react";
import Switch from "react-switch";
import styles from "../../css/User.module.scss";
import { UnderlineTooltip } from "../../tooltip";
import SplitName from "../../transformers/split-name";
import { ValueOf } from "next/dist/shared/lib/constants";

interface SplitsProps {
    splits: SplitsHistory[];
    gameTime: boolean;
    run: Run;
}

const SPLIT_FILTERS = {
    BEST_POSSIBLE: "Best Possible",
    BEST_ACHIEVED: "Best Achieved",
    AVERAGE: "Average",
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
        hasAlternatives ? splits[0].single.alternative[0].name : "",
    );

    const splitToUse = totalTime ? "total" : "single";
    const splitsFile = decodeURIComponent(run.splitsFile as string)
        .replaceAll("%", "%25")
        .replaceAll("++", "%2B+");
    const url = `${process.env.NEXT_PUBLIC_SPLITS_CLOUDFRONT_URL}/${splitsFile}`;

    return (
        <div>
            <Row>
                <Col xl={9} style={{ whiteSpace: "nowrap", display: "flex" }}>
                    <h2>Splits {gameTime && "(IGT)"}</h2>
                    {run.splitsFile && (
                        <a
                            rel="noreferrer"
                            target="_blank"
                            style={{ marginLeft: "0.5rem" }}
                            href={url}
                            download={`${run.user}_${run.game}_${run.run}.lss`}
                        >
                            <DownloadIcon />
                        </a>
                    )}
                </Col>
                <Col sm={3} style={{ display: "flex", justifyContent: "end" }}>
                    <div
                        style={{
                            display: "flex",
                            justifyContent: "end",
                            alignSelf: "center",
                        }}
                    >
                        <label
                            htmlFor="switch"
                            style={{
                                marginRight: "10px",
                                alignSelf: "center",
                                whiteSpace: "nowrap",
                            }}
                        >
                            {" "}
                            <UnderlineTooltip
                                title="Total/split time"
                                content={
                                    "This table can show you the splits in two forms: Total time or Split time. " +
                                    "Total time means it will show you the full split time, including previous splits. Split time will only show the time for that specific segment."
                                }
                                element="Show total time"
                            />{" "}
                        </label>
                        <Switch
                            onColor={getComputedStyle(
                                document.documentElement,
                            ).getPropertyValue("--bs-link-color")}
                            offColor={getComputedStyle(
                                document.documentElement,
                            ).getPropertyValue("--bs-tertiary-bg")}
                            name="switch"
                            onChange={(checked) => {
                                setTotalTime(checked);
                            }}
                            checked={totalTime}
                        />
                    </div>
                </Col>
            </Row>
            <Table striped bordered hover responsive={true}>
                <thead>
                    <tr>
                        <th style={{ width: "25%" }}>Name</th>
                        <th style={{ width: "15%" }}>Split</th>
                        <th
                            style={{ width: "15%" }}
                            className={styles.splitComparisonOption}
                        >
                            <select
                                style={{ padding: "0 2.25rem 0 0" }}
                                className={`form-select ${styles.hideSelectArrow}`}
                                value={selectedComparison}
                                onChange={(e) => {
                                    setSelectedComparison(
                                        e.target.value as SplitFilterValue,
                                    );
                                }}
                            >
                                {[
                                    "Best Possible",
                                    "Best Achieved",
                                    "Average",
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
                            style={{ width: "15%" }}
                            className={styles.splitOptional}
                        >
                            Best possible
                        </th>
                        <th
                            style={{ width: "15%" }}
                            className={styles.splitOptional}
                        >
                            Best achieved
                        </th>
                        <th
                            style={{ width: "15%" }}
                            className={styles.splitOptional}
                        >
                            Average
                        </th>
                        {hasAlternatives && (
                            <th style={{ width: "15%" }}>
                                <select
                                    style={{ padding: "0 2.25rem 0 0" }}
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
                            )?.time || "";
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
                                        <div style={{ float: "left" }}>
                                            <DurationToFormatted
                                                duration={alternativeDuration}
                                                withMillis={true}
                                            />
                                        </div>
                                        <small style={{ float: "right" }}>
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
    name: Exclude<keyof SplitTimes, "alternative">;
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
                <div style={{ float: "left" }}>
                    <DurationToFormatted duration={split[name]} />
                </div>
                <small style={{ float: "right" }}>
                    <Difference one={split.time} two={split[name]} />
                </small>
            </div>
        </td>
    );
};

const DownloadIcon = () => {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width="32"
            height="32"
            fill="currentColor"
            className="bi bi-cloud-download"
            viewBox="0 0 16 16"
        >
            <path d="M4.406 1.342A5.53 5.53 0 0 1 8 0c2.69 0 4.923 2 5.166 4.579C14.758 4.804 16 6.137 16 7.773 16 9.569 14.502 11 12.687 11H10a.5.5 0 0 1 0-1h2.688C13.979 10 15 8.988 15 7.773c0-1.216-1.02-2.228-2.313-2.228h-.5v-.5C12.188 2.825 10.328 1 8 1a4.53 4.53 0 0 0-2.941 1.1c-.757.652-1.153 1.438-1.153 2.055v.448l-.445.049C2.064 4.805 1 5.952 1 7.318 1 8.785 2.23 10 3.781 10H6a.5.5 0 0 1 0 1H3.781C1.708 11 0 9.366 0 7.318c0-1.763 1.266-3.223 2.942-3.593.143-.863.698-1.723 1.464-2.383z" />
            <path d="M7.646 15.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 14.293V5.5a.5.5 0 0 0-1 0v8.793l-2.146-2.147a.5.5 0 0 0-.708.708l3 3z" />
        </svg>
    );
};
