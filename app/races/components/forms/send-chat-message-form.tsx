import { Form } from "react-bootstrap";
import { SubmitButton } from "~src/components/Button/SubmitButton";
import { sendChatMessage } from "~app/races/actions/send-chat-messages.action";
import { useState } from "react";
import { RaceMessage } from "~app/races/races.types";
import { User } from "../../../../types/session.types";

interface SendChatMessageFormProps {
    raceId: string;
    user?: User;
    addMessage: (message: RaceMessage) => void;
}

export const SendChatMessageForm: React.FunctionComponent<
    SendChatMessageFormProps
> = ({ raceId, user, addMessage }) => {
    const [value, setValue] = useState("");

    return (
        <div className="mb-4">
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
                className="d-flex gap-2"
            >
                <input hidden name="raceId" value={raceId} readOnly />

                <input
                    maxLength={200}
                    type="text"
                    name="message"
                    className="form-control"
                    autoComplete="off"
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
                        className="text-nowrap"
                        innerText="Send Message"
                        pendingText="Sending message..."
                    />
                )}
            </Form>
        </div>
    );
};
