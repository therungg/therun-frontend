import { Race, RaceParticipantWithLiveData } from "~app/races/races.types";
import { sortRaceParticipants } from "~app/races/[race]/sort-race-participants";
import { Col, Spinner } from "react-bootstrap";
import { UserLink } from "~src/components/links/links";
import {
    DifferenceFromOne,
    DurationToFormatted,
} from "~src/components/util/datetime";
import { getPercentageDoneFromLiverun } from "~app/races/[race]/get-percentage-done-from-liverun";
import { useAutoAnimate } from "@formkit/auto-animate/react";
interface RaceParticipantOverviewProps {
    race: Race;
}

export const RaceParticipantOverview = ({
    race,
}: RaceParticipantOverviewProps) => {
    const participants = sortRaceParticipants(race);

    const [parent] = useAutoAnimate({
        duration: 300,
        easing: "ease-out",
    });

    return (
        <div
            className={"px-4 pt-2 pb-3 bg-body-secondary game-border mh-100"}
            ref={parent}
        >
            <span className={"h4 flex-center mb-3"}>Standings</span>
            <hr />
            <div className={"d-flex flex-row mb-1"}>
                <Col xl={1}></Col>
                <Col xl={5}></Col>
                <Col xl={2} className={"fw-bold"}>
                    %
                </Col>
                <Col xl={2} className={"fw-bold"}>
                    PB
                </Col>
                {/*<Col xl={2} className={"fw-bold"}>*/}
                {/*    BPT*/}
                {/*</Col>*/}
                <Col xl={2} className={"fw-bold"}>
                    Status
                </Col>
            </div>
            {participants?.map((participant, i) => {
                return (
                    <RaceParticipantItem
                        placing={i + 1}
                        race={race}
                        key={participant.user}
                        participant={participant}
                    />
                );
            })}
        </div>
    );
};

export const RaceParticipantItem = ({
    participant,
    race,
    placing,
}: {
    participant: RaceParticipantWithLiveData;
    race: Race;
    placing: number;
}) => {
    const percentage = getPercentageDoneFromLiverun(participant);
    return (
        <div>
            <div className={"d-flex flex-row"}>
                <Col xl={1}>{placing}.</Col>
                <Col xl={5}>
                    <UserLink username={participant.user} />
                </Col>
                <Col xl={2}>
                    {percentage > 0 && `${percentage.toFixed(0)}%`}
                </Col>
                <Col xl={2}>
                    <DurationToFormatted duration={participant.pb} />
                </Col>
                {/*<Col xl={2}>*/}
                {/*    {participant.liveData && (*/}
                {/*        <DurationToFormatted*/}
                {/*            duration={participant.liveData.bestPossibleTime}*/}
                {/*        />*/}
                {/*    )}*/}
                {/*</Col>*/}
                <Col xl={2}>
                    <RaceParticipantStatus
                        race={race}
                        participant={participant}
                    />
                </Col>
            </div>
            <>
                {/*{percentage > 0 && (*/}
                {/*    <div className={"d-flex pt-1 pb-2"}>*/}
                {/*        /!*<small className={"small"}>*!/*/}
                {/*        /!*    {percentage.toFixed(0)}%{" "}*!/*/}
                {/*        /!*</small>*!/*/}
                {/*        <Line percent={percentage} strokeColor={"#27a11b"} />*/}
                {/*    </div>*/}
                {/*)}*/}
            </>
            <hr className={"p-0 my-1"} />
        </div>
    );
};

const RaceParticipantStatus = ({
    participant,
    race,
}: {
    participant: RaceParticipantWithLiveData;
    race: Race;
}) => {
    const abandonedTime =
        new Date(participant.abandondedAtDate as string).getTime() -
        new Date(race.startTime as string).getTime();
    return (
        <div>
            {(participant.status === "finished" ||
                participant.status === "confirmed") && (
                <span className={"fst-italic"}>
                    <DurationToFormatted
                        duration={participant.finalTime?.toString() as string}
                    />
                </span>
            )}
            {participant.status === "started" && (
                <div className={"d-flex"}>
                    {/*<RaceParticipantTimer raceParticipant={participant} />*/}
                    {/*{"   ("}*/}
                    <DifferenceFromOne
                        diff={participant.liveData?.delta as number}
                        className={""}
                    />
                    {/*{")"}*/}
                </div>
            )}
            {participant.status === "abandoned" && (
                <span>
                    DNF <DurationToFormatted duration={abandonedTime} />
                </span>
            )}
            {participant.status === "ready" && (
                <Spinner animation={"grow"} size={"sm"} />
            )}
        </div>
    );
};
