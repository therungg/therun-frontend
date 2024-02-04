import { Form } from "react-bootstrap";
import { SubmitButton } from "~src/actions/components/submit-button";
import { sendChatMessage } from "~src/actions/races/send-chat-messages.action";

export const SendChatMessageForm = ({ raceId }: { raceId: string }) => {
    return (
        <div className={"mb-4"}>
            <Form action={sendChatMessage} className={"d-flex gap-2"}>
                <input hidden name={"raceId"} value={raceId} readOnly />

                <input
                    maxLength={200}
                    type={"text"}
                    name={"message"}
                    className={"form-control"}
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
