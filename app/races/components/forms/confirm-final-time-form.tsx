"use client";

import { useEffect, useState } from "react";
import { Form } from "react-bootstrap";
import { confirmFinalTime } from "~app/races/actions/confirm-final-time.action";
import {
    getFormattedString,
    timeToMillis,
} from "~src/components/util/datetime";
import { SubmitButton } from "~src/components/submit-button";

export const ConfirmFinalTimeForm = ({
    raceId,
    finalTime,
}: {
    raceId: string;
    finalTime: number;
}) => {
    const [confirmedFinalTime, setConfirmedFinalTime] = useState(finalTime);
    const [finalTimeInput, setFinalTimeInput] = useState(
        getFormattedString(finalTime.toString(), true),
    );

    useEffect(() => {
        setConfirmedFinalTime(timeToMillis(finalTimeInput));
    }, [finalTimeInput]);

    return (
        <div className="mb-4">
            Please confirm your final time:
            <Form action={confirmFinalTime}>
                <input hidden name="raceId" value={raceId} readOnly />

                <div className="d-flex gap-2">
                    <input
                        type="text"
                        name="finalTimeInput"
                        className="form-control"
                        value={finalTimeInput}
                        onChange={(event) => {
                            setFinalTimeInput(event.target.value);
                        }}
                    />
                    <input
                        hidden
                        name="finalTime"
                        value={confirmedFinalTime}
                        readOnly
                    />
                    <SubmitButton
                        className="text-nowrap"
                        innerText="Confirm time"
                        pendingText="Confirming time..."
                    />
                </div>
            </Form>
        </div>
    );
};
