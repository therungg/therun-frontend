import {
    Race,
    RaceMessage,
    RaceMessageParticipantCommentData,
    RaceMessageParticipantSplitData,
    RaceMessageUserData,
} from "~app/races/races.types";
import { SendChatMessageForm } from "~app/races/components/forms/send-chat-message-form";
import { Col, Form, Row } from "react-bootstrap";
import { UserLink } from "~src/components/links/links";
import { DurationToFormatted } from "~src/components/util/datetime";
import React, { useState } from "react";
import { random } from "nanoid";

interface FilterOptions {
    chat: boolean;
    race: boolean;
    participants: boolean;
    splits: boolean;
}

export const RaceChat = ({
    race,
    raceMessages,
}: {
    race: Race;
    raceMessages: RaceMessage[];
}) => {
    const [filterOptions, setFilterOptions] = useState<FilterOptions>({
        chat: true,
        race: true,
        participants: true,
        splits: true,
    });

    const filteredMessages = raceMessages.filter((message) => {
        if (!filterOptions.chat) {
            if (message.type === "chat") return false;
        }
        if (!filterOptions.race) {
            if (message.type.startsWith("race-")) return false;
        }
        if (!filterOptions.participants) {
            if (
                message.type.startsWith("participant") &&
                message.type !== "participant-split"
            )
                return false;
        }
        if (!filterOptions.splits) {
            if (message.type === "participant-split") return false;
        }
        return true;
    });

    return (
        <div
            style={{
                height: "24rem",
            }}
            className={"rounded-3 px-4 py-2 mb-3 game-border bg-body-secondary"}
        >
            <div style={{ height: "2rem" }}>
                <ChatFilterOptions
                    filterOptions={filterOptions}
                    setFilterOptions={setFilterOptions}
                />
            </div>
            <Chat raceMessages={filteredMessages} />
            <SendChatMessageForm raceId={race.raceId} />
        </div>
    );
};

const ChatFilterOptions = ({
    filterOptions,
    setFilterOptions,
}: {
    filterOptions: FilterOptions;
    // eslint-disable-next-line no-unused-vars
    setFilterOptions: (_: FilterOptions) => void;
}) => {
    const rnd = random(1);
    const subjects: (keyof FilterOptions)[] = [
        "chat",
        "race",
        "participants",
        "splits",
    ];
    return (
        <div className={"d-flex"}>
            {subjects.map((subject) => {
                return (
                    <Form
                        key={subject}
                        className={"me-2 me-sm-4 me-md-3 mg-lg-2 me-xl-4"}
                    >
                        <Form.Check
                            name={subject}
                            type={"checkbox"}
                            label={
                                subject.charAt(0).toUpperCase() +
                                subject.slice(1)
                            }
                            id={`${subject}_id_${rnd}`}
                            checked={filterOptions[subject] as boolean}
                            onClick={() => {
                                const newFilterOptions = { ...filterOptions };
                                newFilterOptions[subject] =
                                    !filterOptions[subject];
                                setFilterOptions(newFilterOptions);
                            }}
                        />
                    </Form>
                );
            })}
        </div>
    );
};

const Chat = ({ raceMessages }: { raceMessages: RaceMessage[] }) => {
    return (
        <div
            className={
                "d-flex flex-column-reverse overflow-y-scroll overflow-x-hidden px-2 py-1 game-border rounded-3 mb-2"
            }
            style={{ height: "18rem" }}
        >
            {raceMessages.map((message) => (
                <Chatmessage key={message.time} message={message} />
            ))}
        </div>
    );
};

const Chatmessage = ({ message }: { message: RaceMessage }) => {
    return (
        <span>
            <Row>
                <Col xs={3} sm={2} md={1} lg={2} xxl={1}>
                    <small
                        suppressHydrationWarning
                        title={new Date(message.time).toLocaleTimeString()}
                        className={"text-nowrap"}
                    >
                        {new Date(message.time).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                        })}
                    </small>
                </Col>
                <Col
                    xs={9}
                    sm={10}
                    md={11}
                    lg={10}
                    xxl={11}
                    className={"ps-xxl-5 ps-xl-3 ps-lg-4 ps-md-4 "}
                >
                    {getRaceMessage(message)}
                </Col>
            </Row>
        </span>
    );
};

const getRaceMessage = (message: RaceMessage) => {
    const customData = message.data as RaceMessageUserData;
    const user = customData?.user;

    switch (message.type) {
        case "race-created":
            return "Race was created!";
        case "race-starting":
            return "Everyone is ready. Countdown started!";
        case "race-start-canceled":
            return "The start was canceled";
        case "race-started":
            return "Race has started!";
        case "race-abort":
            return "Race was canceled";
        case "race-finish":
            return "Everyone is done. The race is finished!";
        case "race-rated":
            return "Participant ratings have been updated";
        case "race-stats-parsed":
            return "Race statistics have been updated";
        case "participant-join":
            return (
                <>
                    <UserLink icon={false} username={user as string} /> has
                    joined the race!
                </>
            );
        case "participant-unjoin":
            return (
                <>
                    <UserLink icon={false} username={user as string} /> has left
                    the race
                </>
            );
        case "participant-ready":
            return (
                <>
                    <UserLink icon={false} username={user as string} /> is
                    ready!
                </>
            );
        case "participant-unready":
            return (
                <>
                    <UserLink icon={false} username={user as string} /> is not
                    ready!
                </>
            );
        case "participant-split": {
            const data = message.data as RaceMessageParticipantSplitData;
            if (!data.splitName) {
                return (
                    <>
                        <UserLink icon={false} username={user as string} />{" "}
                        split
                    </>
                );
            }
            return (
                <div className={"justify-content-between w-100 d-flex"}>
                    <span>
                        <UserLink icon={false} username={user as string} />{" "}
                        split
                    </span>
                    <small>
                        <span className={"fst-italic"}>{data.splitName}</span> |{" "}
                        <DurationToFormatted duration={data.time} /> |{" "}
                        {(data.percentage * 100).toFixed(0)}%
                    </small>
                </div>
            );
        }
        case "participant-abandon":
            return (
                <>
                    <UserLink icon={false} username={user as string} />{" "}
                    abandoned the race
                </>
            );
        case "participant-comment": {
            const data = message.data as RaceMessageParticipantCommentData;
            return (
                <>
                    <UserLink icon={false} username={user as string} />:{" "}
                    <span className={"fst-italic"}>
                        &quot;{data.comment}&quot;
                    </span>
                </>
            );
        }
        case "participant-finish":
            return (
                <>
                    <UserLink icon={false} username={user as string} /> finished
                    the race
                </>
            );
        case "participant-confirm":
            return (
                <>
                    <UserLink icon={false} username={user as string} />{" "}
                    confirmed their time
                </>
            );
        case "chat":
            return (
                <>
                    <UserLink icon={false} username={user as string} />:{" "}
                    {message.message}
                </>
            );

        default:
            return message.type;
    }
};
