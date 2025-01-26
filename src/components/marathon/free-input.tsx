import { useState } from "react";
import {
    MarathonEvent,
    SendMarathonDataButton,
} from "./send-marathon-data-button";
import { LiveRun } from "~app/live/live.types";

export const FreeInput = ({
    liveRun,
    sessionId,
}: {
    liveRun: LiveRun;
    sessionId: string;
}) => {
    const [input, setInput] = useState("");

    return (
        <div className="mb-3">
            <h2>Free Input</h2>
            <textarea
                style={{
                    background: "var(--bs-tertiary-bg)",
                    border: "none",
                    color: "var(--bs-body-color)",
                    width: "100%",
                    height: "6rem",
                }}
                value={input}
                onChange={(e) => {
                    setInput(e.target.value);
                }}
            />
            <SendMarathonDataButton
                description="Send Free Input to ESA"
                sessionId={sessionId}
                data={freeInputEvent(liveRun, input)}
            >
                Send Free Input
            </SendMarathonDataButton>
        </div>
    );
};

export const freeInputEvent = (
    liveRun: LiveRun,
    input: string,
): MarathonEvent => {
    return {
        type: "free_input_event",
        name: "Free Input Event",
        description: "Contains free input to be shown on stream",
        time: new Date().toISOString(),
        game: liveRun.game,
        category: liveRun.category,
        username: liveRun.user,
        data: {
            input,
        },
    };
};
