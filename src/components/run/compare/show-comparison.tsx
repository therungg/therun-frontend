import { useState } from 'react';
import { Col, Row } from 'react-bootstrap';
import Switch from 'react-switch';
import { Run, RunHistory, SplitsHistory } from '../../../common/types';
import { CompareTimeline } from './compare-timeline';
import { ComparisonGraph } from './comparison-graph';
import { ComparisonTable } from './comparison-table';

export const ShowComparison = ({
    one,
    two,
    userOne,
    userTwo,
    runOne,
    runTwo,
    runsOne,
    runsTwo,
}: {
    one: SplitsHistory[];
    two: SplitsHistory[];
    userOne: string;
    userTwo: string;
    runOne: Run;
    runTwo: Run;
    runsOne: RunHistory[];
    runsTwo: RunHistory[];
}) => {
    const [matchedOne, matchedTwo] = matchSplits(
        JSON.parse(JSON.stringify(one)),
        JSON.parse(JSON.stringify(two)),
    );
    const [totalTime, setTotalTime] = useState(true);
    const variant = totalTime ? 'total' : 'single';
    const gameTime = false;

    return (
        <div>
            <Row>
                <Col md={8}>
                    <Row>
                        <Col>
                            <h2>Splits</h2>
                        </Col>
                        <Col style={{ display: 'flex', justifyContent: 'end' }}>
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
                    <ComparisonGraph
                        matchedOne={matchedOne}
                        matchedTwo={matchedTwo}
                        variant={variant}
                        key={userOne + userTwo + gameTime}
                    />
                </Col>
                <Col md={4}>
                    <div>
                        <h2>Stats</h2>
                        <ComparisonTable
                            userOne={userOne}
                            userTwo={userTwo}
                            runOne={runOne}
                            runTwo={runTwo}
                            gameTime={gameTime}
                        />
                    </div>
                    <div>
                        <CompareTimeline
                            runsOne={runsOne}
                            runsTwo={runsTwo}
                            userOne={userOne}
                            userTwo={userTwo}
                        />
                    </div>
                </Col>
            </Row>
        </div>
    );
};

const matchSplits = (
    one: SplitsHistory[],
    two: SplitsHistory[],
): SplitsHistory[][] => {
    // If splits are same length, might take this out?
    if (one.length === two.length) return [one, two];

    const matchedNames =
        one.length <= two.length
            ? matchSplitsByName(
                  one.map((hist) => hist.name),
                  two.map((hist) => hist.name),
              )
            : matchSplitsByName(
                  two.map((hist) => hist.name),
                  one.map((hist) => hist.name),
              );

    const otherSplits = one.length <= two.length ? [...two] : [...one];

    const onePercentages = getPercentages(one);
    const twoPercentages = getPercentages(two);

    const closestKeys =
        one.length <= two.length
            ? onePercentages.map((history, key) => {
                  const matchedName = matchedNames[key];
                  if (matchedName === 0 || !!matchedName) return matchedName;
                  return findClosestSplit(history, twoPercentages);
              })
            : twoPercentages.map((history, key) => {
                  const matchedName = matchedNames[key];
                  if (matchedName === 0 || !!matchedName) return matchedName;
                  return findClosestSplit(history, onePercentages);
              });

    let currentDifference = 0;

    const closestSplits = closestKeys.map((key) => {
        return otherSplits[key];
    });

    closestKeys.forEach((key, realKey) => {
        let skippedSplits = key - realKey - currentDifference;
        currentDifference += skippedSplits;
        while (skippedSplits > 0) {
            const prevKey = key - skippedSplits;

            otherSplits[key].single.bestPossibleTime = (
                parseInt(otherSplits[key].single.bestPossibleTime) +
                parseInt(otherSplits[prevKey].single.bestPossibleTime)
            ).toString();

            otherSplits[key].single.time = (
                parseInt(otherSplits[key].single.time) +
                parseInt(otherSplits[prevKey].single.time)
            ).toString();

            otherSplits[key].single.bestAchievedTime = (
                parseInt(otherSplits[key].single.bestAchievedTime) +
                parseInt(otherSplits[prevKey].single.bestAchievedTime)
            ).toString();
            skippedSplits--;
        }
    });

    return one.length <= two.length
        ? [one, closestSplits]
        : [closestSplits, two];
};

const matchSplitsByName = (one: string[], two: string[]): (number | null)[] => {
    const matched: (number | null)[] = one.map(() => null);

    const stringOccurrences = new Map();

    one.forEach((str, key) => {
        str = replaceString(str);
        if (!stringOccurrences.get(str)) {
            stringOccurrences.set(str, 1);
        }

        const searchOccurence = stringOccurrences.get(str);
        let currentOccurence = searchOccurence;

        two.forEach((search, keyTwo) => {
            search = replaceString(search);

            if (search === str) {
                currentOccurence--;
                if (currentOccurence === 0) {
                    matched[key] = keyTwo;
                }
            }
        });

        stringOccurrences.set(str, searchOccurence + 1);
    });

    return matched;
};

const replaceString = (str: string): string => {
    str = str.toString().replace('-', '').toLowerCase().replaceAll(' ', '');

    const split = str.split('}');

    if (split.length > 1) return split[1];

    return str;
};

const findClosestSplit = (needle: number, haystack: number[]): number => {
    const distanceArray = haystack.map((val) => Math.abs(val - needle));
    let lowestKey = null;
    let lowestDistance = null;

    for (const key in distanceArray) {
        const distance = distanceArray[key];
        if (lowestDistance === null || lowestDistance > distance) {
            lowestKey = key;
            lowestDistance = distance;
        }
    }

    return parseInt(lowestKey as string) as number;
};

const getPercentages = (history: SplitsHistory[]): number[] => {
    const last = parseInt(history[history.length - 1].total.bestPossibleTime);

    return history.map((curr) => parseInt(curr.total.bestPossibleTime) / last);
};
