import React, { memo, useMemo } from 'react';
import { Col, Row, Table } from 'react-bootstrap';
import { groupCategoryStatsByGame } from '~app/(old-layout)/[username]/races/group-category-stats-by-game';
import { UserRaceStatsByGameWithoutUrls } from '~app/(old-layout)/[username]/races/user-race-stats-by-game';
import { DurationToFormatted } from '~src/components/util/datetime';
import { WrappedCounter } from '../wrapped-counter';
import { WrappedWithData } from '../wrapped-types';
import { SectionBody } from './section-body';
import { SectionTitle } from './section-title';
import { SectionWrapper } from './section-wrapper';

interface WrappedRaceStatsProps {
    wrapped: WrappedWithData;
}

export const WrappedRaceStats = memo<WrappedRaceStatsProps>(({ wrapped }) => {
    const raceData = wrapped.raceData;

    const getSubtitle = (finishedRaces: number) => {
        if (finishedRaces < 4) {
            return "Races are great for your consistency. Let's aim for 10 next year!";
        }
        if (finishedRaces < 10) {
            return "Pretty good! That's more than like 99% people";
        }
        return 'Thank you for doing so many! You keep this site alive!';
    };

    const getExtraText = (finishedRaces: number) => {
        if (finishedRaces < 4) {
            return 'But who are we kidding...';
        }
        if (finishedRaces < 10) {
            return "(idk the actual stat i haven't counted)";
        }
        return '(i love you please keep it going next year!!!!)';
    };

    const { title, subtitle, extraRemark } = useMemo(() => {
        if (raceData.globalStats.totalRaces === 1) {
            return {
                title: 'This year you only participated in 1 race!',
                subtitle: "Maybe we'll do more next year!",
                extraRemark: 'But who are we kidding',
            };
        }

        return {
            title: (
                <>
                    This year you participated in{' '}
                    <WrappedCounter
                        id="total-races-count"
                        end={raceData.globalStats.totalRaces}
                    />{' '}
                    races - you finished{' '}
                    <WrappedCounter
                        id="total-finished-races-count"
                        end={raceData.globalStats.totalFinishedRaces}
                    />{' '}
                    of them!
                </>
            ),
            subtitle: getSubtitle(raceData.globalStats.totalFinishedRaces),
            extraRemark: getExtraText(raceData.globalStats.totalFinishedRaces),
        };
    }, [
        raceData.globalStats.totalFinishedRaces,
        raceData.globalStats.totalRaces,
    ]);

    const categoryStatsMap = groupCategoryStatsByGame(raceData.categoryStats);

    const racedGames = [
        ...new Set(
            raceData.categoryStats.map((stat) => {
                return stat.displayValue.split('#')[0];
            }),
        ),
    ];

    const numberOneMmrCount = raceData.categoryStats.filter(
        (stat) => stat.rankings[0].rank === 0,
    ).length;

    const numberOneTimeCount = raceData.categoryStats.filter(
        (stat) => stat.rankings[1].rank === 0,
    ).length;

    return (
        <SectionWrapper>
            <SectionTitle
                title={title}
                subtitle={subtitle}
                extraRemark={extraRemark}
            />
            <SectionBody>
                <Row className="w-100">
                    <Col xl={8}>
                        <div className="table-responsive mt-4">
                            <Table className="table table_custom h4">
                                <tbody>
                                    <tr>
                                        <td>
                                            You spent a total time of{' '}
                                            <DurationToFormatted
                                                duration={
                                                    raceData.globalStats
                                                        .totalRaceTime
                                                }
                                            />{' '}
                                            racing!
                                        </td>
                                    </tr>
                                    <tr>
                                        <td>
                                            You started a total of{' '}
                                            <span
                                                style={{
                                                    color: 'var(--bs-link-color)',
                                                }}
                                            >
                                                {
                                                    raceData.globalStats
                                                        .totalRaces
                                                }{' '}
                                                races
                                            </span>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td>
                                            You finished{' '}
                                            <span
                                                style={{
                                                    color: 'var(--bs-gold)',
                                                }}
                                            >
                                                {
                                                    raceData.globalStats
                                                        .totalFinishedRaces
                                                }{' '}
                                                of them
                                            </span>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td>
                                            That gives you a race finish
                                            percentage of{' '}
                                            <span>
                                                {(
                                                    (raceData.globalStats
                                                        .totalFinishedRaces /
                                                        raceData.globalStats
                                                            .totalRaces) *
                                                    100
                                                ).toFixed(0)}
                                                %
                                            </span>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td>
                                            You did races in a total of{' '}
                                            {racedGames.length} games and{' '}
                                            {raceData.categoryStats.length}{' '}
                                            categories!
                                        </td>
                                    </tr>
                                    {numberOneMmrCount > 0 && (
                                        <tr>
                                            <td>
                                                You were the #1 ranked racer for{' '}
                                                {numberOneMmrCount} categories!
                                            </td>
                                        </tr>
                                    )}

                                    {numberOneTimeCount > 0 && (
                                        <tr>
                                            <td>
                                                You got the best time out of
                                                everyone in a race for{' '}
                                                {numberOneTimeCount} categories!
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </Table>
                        </div>
                    </Col>
                    <Col xl={4}>
                        <div className="h3 mb-3">
                            These are all the games you raced!
                        </div>
                        <div
                            className="overflow-y-auto"
                            style={{
                                maxHeight: '50vh',
                            }}
                        >
                            <UserRaceStatsByGameWithoutUrls
                                stats={categoryStatsMap.slice(0, 100)}
                            />
                        </div>
                    </Col>
                </Row>
            </SectionBody>
        </SectionWrapper>
    );
});
WrappedRaceStats.displayName = 'WrappedRaceStats';
