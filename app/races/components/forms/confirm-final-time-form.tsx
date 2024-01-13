"use client";

import { useEffect, useState } from "react";
import { Form } from "react-bootstrap";
import { confirmFinalTime } from "~src/actions/races/confirm-final-time.action";
import {
    getFormattedString,
    timeToMillis,
} from "~src/components/util/datetime";
import { SubmitButton } from "~src/actions/components/submit-button";

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
        <div className={"mb-4"}>
            Please confirm your final time:
            <Form action={confirmFinalTime}>
                <input hidden name={"raceId"} value={raceId} readOnly />

                <input
                    type={"text"}
                    name={"finalTimeInput"}
                    value={finalTimeInput}
                    onChange={(event) => {
                        setFinalTimeInput(event.target.value);
                    }}
                />

                <input
                    hidden
                    name={"finalTime"}
                    value={confirmedFinalTime}
                    readOnly
                />
                <SubmitButton
                    innerText={"Confirm time"}
                    pendingText={"Confirming time..."}
                />
            </Form>
        </div>
    );
};
