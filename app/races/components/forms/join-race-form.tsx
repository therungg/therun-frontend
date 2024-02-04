"use client";

import { Form } from "react-bootstrap";
import { SubmitButton } from "~src/actions/components/submit-button";
import { joinRace } from "~src/actions/races/join-race.action";
import { useState } from "react";
import { Race } from "~app/races/races.types";
// eslint-disable-next-line import/named
import { useFormState } from "react-dom";

export const JoinRaceForm = ({ race }: { race: Race }) => {
    const [state, formAction] = useFormState(joinRace, { message: "" });
    const [passwordInput, setPasswordInput] = useState("");

    const { raceId, requiresPassword } = race;
    return (
        <div className={"w-100"}>
            {state?.message && (
                <span style={{ color: "red" }}>{state.message} </span>
            )}

            {requiresPassword && (
                <div className={"mb-1"}>
                    Joining this race requires entering a password.
                </div>
            )}
            <Form action={formAction} className={"d-flex gap-2 w-100"}>
                <input hidden name={"raceId"} value={raceId} readOnly />

                {requiresPassword && (
                    <input
                        maxLength={100}
                        type={"password"}
                        name={"password"}
                        className={"form-control"}
                        onChange={(e) => {
                            setPasswordInput(e.target.value);
                        }}
                    />
                )}

                <SubmitButton
                    className={"text-nowrap w-100 fs-5"}
                    innerText={"Join Race"}
                    pendingText={"Joining Race..."}
                    disabled={requiresPassword && !passwordInput}
                />
            </Form>
        </div>
    );
};