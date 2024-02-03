"use client";

import { Form } from "react-bootstrap";
import { SubmitButton } from "~src/actions/components/submit-button";
import { leaveRaceComment } from "~src/actions/races/leave-race-comment.action";

export const CommentOnRaceForm = ({ raceId }: { raceId: string }) => {
    return (
        <div className={"mb-4"}>
            Leave a comment about your race:
            <Form action={leaveRaceComment} className={"d-flex gap-2"}>
                <input hidden name={"raceId"} value={raceId} readOnly />

                <input
                    maxLength={200}
                    type={"text"}
                    name={"comment"}
                    className={"form-control"}
                />

                <SubmitButton
                    className={"text-nowrap"}
                    innerText={"Leave Comment"}
                    pendingText={"Saving Comment..."}
                />
            </Form>
        </div>
    );
};
