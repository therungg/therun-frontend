import { Form } from "react-bootstrap";
import { SubmitButton } from "~src/actions/components/submit-button";
import { sendChatMessage } from "~src/actions/races/send-chat-messages.action";
import { useState } from "react";

export const SendChatMessageForm = ({ raceId }: { raceId: string }) => {
    const [value, setValue] = useState("");

    return (
        <div className={"mb-4"}>
            <Form
                action={sendChatMessage}
                onSubmit={() => {
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
                    value={value}
                    onChange={(event) => {
                        setValue(event.target.value);
                    }}
                />

                <SubmitButton
                    className={"text-nowrap"}
                    innerText={"Send Message"}
                    pendingText={"Sending message..."}
                />
            </Form>
        </div>
    );
};
