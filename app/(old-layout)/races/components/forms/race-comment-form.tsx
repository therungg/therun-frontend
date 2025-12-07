"use client";

import { Form } from "react-bootstrap";
import { SubmitButton } from "~src/components/Button/SubmitButton";
import { leaveRaceComment } from "~app/(old-layout)/races/actions/leave-race-comment.action";

export const CommentOnRaceForm = ({ raceId }: { raceId: string }) => {
    return (
        <div className="mb-4">
            Leave a comment about your race:
            <Form action={leaveRaceComment} className="d-flex gap-2">
                <input hidden name="raceId" value={raceId} readOnly />

                <input
                    maxLength={200}
                    type="text"
                    name="comment"
                    className="form-control"
                />

                <SubmitButton
                    className="text-nowrap"
                    innerText="Leave Comment"
                    pendingText="Saving Comment..."
                />
            </Form>
        </div>
    );
};
