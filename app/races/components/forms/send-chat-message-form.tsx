import { Form } from "react-bootstrap";
import { SubmitButton } from "~src/actions/components/submit-button";
import { sendChatMessage } from "~src/actions/races/send-chat-messages.action";
import { useState } from "react";
import { RaceMessage } from "~app/races/races.types";
import { User } from "../../../../types/session.types";

export const SendChatMessageForm = ({
    raceId,
    user,
    addMessage,
}: {
    raceId: string;
    user?: User;
    // eslint-disable-next-line no-unused-vars
    addMessage: (message: RaceMessage) => void;
}) => {
    const [value, setValue] = useState("");

    return (
        <div className={"mb-4"}>
            <Form
                action={sendChatMessage}
                onSubmit={() => {
                    addMessage({
                        message: value,
                        raceId,
                        time: new Date().toISOString(),
                        type: "chat",
                        data: {
                            user: user?.username,
                        },
                    });
                    setValue("");
                }}
                className={"d-flex gap-2"}
            >
                <input hidden name={"raceId"} value={raceId} readOnly />

                <input
                    maxLength={200}
                    type={"text"}
                    name={"message"}
                    className={"form-control"}
                    placeholder={
                        user?.username
                            ? "Send a chat message"
                            : "Please login to send a chat message"
                    }
                    disabled={!user?.username}
                    value={value}
                    onChange={(event) => {
                        setValue(event.target.value);
                    }}
                />

                {user?.username && (
                    <SubmitButton
                        disabled={!user?.username}
                        className={"text-nowrap"}
                        innerText={"Send Message"}
                        pendingText={"Sending message..."}
                    />
                )}
            </Form>
        </div>
    );
};
