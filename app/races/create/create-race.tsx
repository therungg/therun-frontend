"use client";

// eslint-disable-next-line import/named
import { useFormState, useFormStatus } from "react-dom";

import { Button, Form } from "react-bootstrap";
import { createRace } from "~src/actions/races/create-race.action";
import { Title } from "~src/components/title";
import React from "react";

export default function CreateRace() {
    const [state, formAction] = useFormState(createRace, { message: "" });

    return (
        <>
            <Title>Create a new race</Title>

            {/*Todo: make nice flash messages for errors and success*/}
            {state?.message && state.message}

            <Form action={formAction} className={"row"}>
                <fieldset className={"border py-3 px-4"}>
                    <legend className={"w-auto mb-0"}>Create</legend>
                    <div className={"row g-3 mb-3"}>
                        <Form.Group className={"col-md-6"} controlId={"game"}>
                            <Form.Label>Game</Form.Label>
                            <Form.Control
                                type={"text"}
                                placeholder={"Enter Game"}
                                name={"game"}
                            />
                        </Form.Group>

                        <Form.Group
                            className={"col-md-6"}
                            controlId={"category"}
                        >
                            <Form.Label>Category</Form.Label>
                            <Form.Control
                                name={"category"}
                                type={"text"}
                                placeholder={"Enter Category"}
                            />
                        </Form.Group>
                    </div>
                    <div className={"text-end"}>
                        <SubmitButton />
                    </div>
                </fieldset>
            </Form>
        </>
    );
}

const SubmitButton = () => {
    const { pending } = useFormStatus();
    return (
        <Button disabled={pending} variant={"primary"} type="submit">
            {!pending ? "Create Race" : "Creating Race..."}
        </Button>
    );
};
