import { Col, Row, Table } from "react-bootstrap";
import { SplitsHistory } from "../../../common/types";
import { Difference, DurationToFormatted } from "../../util/datetime";
import SplitName from "../../transformers/split-name";

export const ComparisonGraph = ({
    matchedOne,
    matchedTwo,
    variant,
    key,
}: {
    matchedOne: SplitsHistory[];
    matchedTwo: SplitsHistory[];
    variant: "single" | "total";
    key: string;
}) => {
    return (
        <Table striped bordered hover>
            <thead>
                <tr>
                    <th style={{ width: "10rem" }}>Split</th>
                    <th style={{ width: "10rem" }}>
                        <Row>
                            <Col>Time</Col>
                        </Row>
                    </th>
                    <th style={{ width: "10rem" }}>
                        <Row>
                            <Col>Best Possible</Col>
                        </Row>
                    </th>
                    <th style={{ width: "10rem" }}>
                        <Row>
                            <Col>Best Achieved</Col>
                        </Row>
                    </th>
                </tr>
            </thead>
            <tbody>
                {matchedOne.map((value, index) => {
                    const compareValue = matchedTwo[index];
                    return (
                        <tr key={index.toString() + key}>
                            <td>
                                <SplitName splitName={value.name} /> <br />
                                <SplitName splitName={compareValue.name} />
                            </td>
                            {comparisonCell(
                                value,
                                compareValue,
                                variant,
                                "time"
                            )}
                            {comparisonCell(
                                value,
                                compareValue,
                                variant,
                                "bestPossibleTime"
                            )}
                            {comparisonCell(
                                value,
                                compareValue,
                                variant,
                                "bestAchievedTime"
                            )}
                        </tr>
                    );
                })}
            </tbody>
        </Table>
    );
};

const comparisonCell = (
    value: SplitsHistory,
    compareValue: SplitsHistory,
    variant: "single" | "total",
    subject: "time" | "bestPossibleTime" | "bestAchievedTime"
) => {
    return (
        <td>
            <Row>
                <Col>
                    <DurationToFormatted
                        duration={value[variant][subject]}
                        withMillis={true}
                    />
                </Col>
            </Row>
            <Row>
                <Col>
                    <DurationToFormatted
                        duration={compareValue[variant][subject]}
                        withMillis={true}
                    />
                </Col>

                <Col>
                    <Difference
                        one={value[variant][subject]}
                        two={compareValue[variant][subject]}
                        withMillis={true}
                    />
                </Col>
            </Row>
        </td>
    );
};
