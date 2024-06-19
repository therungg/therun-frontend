import {
    Race,
    RaceMessage,
    RaceMessageModeratorData,
    RaceMessageParticipantCommentData,
    RaceMessageParticipantSplitData,
    RaceMessageParticipantTimeData,
    RaceMessageUserData,
} from "~app/races/races.types";
import { SendChatMessageForm } from "~app/races/components/forms/send-chat-message-form";
import { Form } from "react-bootstrap";
import { UserLink } from "~src/components/links/links";
import { DurationToFormatted } from "~src/components/util/datetime";
import React, { useEffect, useState } from "react";

import { random } from "nanoid";
import dynamic from "next/dynamic";
import { User } from "../../../types/session.types";

interface FilterOptions {
    chat: boolean;
    race: boolean;
    participants: boolean;
    splits: boolean;
}

const ChatMessageTime = dynamic(
    async () => {
        return (await import("~app/races/[race]/chat-message-time"))
            .ChatMessageTime;
    },
    {
        ssr: false,
    },
);

export const RaceChat = ({
    race,
    raceMessages,
    user,
}: {
    race: Race;
    raceMessages: RaceMessage[];
    user?: User;
}) => {
    const [stateMessages, setStateMessages] =
        useState<RaceMessage[]>(raceMessages);

    const addMessage = (message: RaceMessage) => {
        const newMessages = [...stateMessages];
        newMessages.unshift(message);
        setStateMessages(newMessages);
    };

    useEffect(() => {
        setStateMessages(raceMessages);
    }, [raceMessages]);

    const [filterOptions, setFilterOptions] = useState<FilterOptions>({
        chat: true,
        race: true,
        participants: true,
        splits: true,
    });

    const filteredMessages = stateMessages.filter((message) => {
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
            <SendChatMessageForm
                raceId={race.raceId}
                addMessage={addMessage}
                user={user}
            />
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
                            defaultChecked={true}
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
        <div className={"d-flex"}>
            <span className={"me-2"}>
                <ChatMessageTime time={message.time} />
            </span>
            <div className={"w-100"}>{getRaceMessage(message)}</div>
        </div>
    );
};

const getRaceMessage = (message: RaceMessage) => {
    const customData = message.data as RaceMessageUserData;
    const user = customData?.user;

    switch (message.type) {
        case "race-created":
            return "Race was created";
        case "race-edited":
            return `Race info was edited by ${user}`;
        case "race-starting":
            return "Countdown started!";
        case "race-start-canceled":
            return "The start was canceled";
        case "race-started":
            return "Race has started";
        case "race-abort": {
            const data = message.data as RaceMessageModeratorData;
            return `Race was canceled by ${data.moderator}`;
        }
        case "race-reset": {
            const data = message.data as RaceMessageModeratorData;
            return `Race was reset to starting state by ${data.moderator}. Starting over!`;
        }
        case "race-moderator-start": {
            const data = message.data as RaceMessageModeratorData;
            return `Race was started by ${data.moderator}`;
        }
        case "race-finish":
            return "Everyone is done. The race is finished";
        case "race-rated":
            return "Participant ratings have been updated";
        case "race-stats-parsed":
            return "Race statistics have been updated";
        case "race-leaderboards-updated":
            return "Race leaderboards have been updated";
        case "participant-join":
            return (
                <>
                    <UserLink icon={false} username={user as string} /> has
                    joined the race
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
                    <UserLink icon={false} username={user as string} /> is ready
                </>
            );
        case "participant-unready":
            return (
                <>
                    <UserLink icon={false} username={user as string} /> is not
                    ready
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
                <div className={"w-100"}>
                    <span className={"justify-content-between d-flex w-100"}>
                        <span>
                            <UserLink icon={false} username={user as string} />
                        </span>
                        <small>
                            <span className={"fst-italic"}>
                                {data.splitName}
                            </span>
                            &nbsp; |&nbsp;
                            <DurationToFormatted duration={data.time} padded />
                            &nbsp; | {(data.percentage * 100).toFixed(2)}%
                        </small>
                    </span>
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
        case "participant-undo-abandon":
            return (
                <>
                    <UserLink icon={false} username={user as string} /> undid
                    their abandon
                </>
            );
        case "participant-comment": {
            const data = message.data as RaceMessageParticipantCommentData;
            return (
                <>
                    <UserLink icon={false} username={user as string} />{" "}
                    commented:{" "}
                    <span className={"fst-italic"}>
                        &quot;{data.comment}&quot;
                    </span>
                </>
            );
        }
        case "participant-disqualified": {
            return (
                <>
                    <UserLink icon={false} username={user as string} /> was
                    disqualified
                </>
            );
        }
        case "participant-finish": {
            const data = message.data as RaceMessageParticipantTimeData;
            return (
                <>
                    <UserLink icon={false} username={user as string} /> finished
                    the race{" "}
                    {data.time && (
                        <span className={"fw-bold"}>
                            {" "}
                            -{" "}
                            <DurationToFormatted duration={data.time} padded />
                        </span>
                    )}
                </>
            );
        }
        case "participant-confirm": {
            const data = message.data as RaceMessageParticipantTimeData;
            return (
                <>
                    <UserLink icon={false} username={user as string} />{" "}
                    confirmed their time{" "}
                    {data.time && (
                        <span className={"fw-bold"}>
                            &nbsp; -&nbsp;
                            <DurationToFormatted duration={data.time} padded />
                        </span>
                    )}
                </>
            );
        }
        case "participant-undo-finish": {
            return (
                <>
                    <UserLink icon={false} username={user as string} />{" "}
                    unfinished
                </>
            );
        }
        case "participant-undo-confirm": {
            return (
                <>
                    <UserLink icon={false} username={user as string} />{" "}
                    unconfirmed
                </>
            );
        }
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
