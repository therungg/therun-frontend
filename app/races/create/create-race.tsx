"use client";

// eslint-disable-next-line import/named
import { useFormState, useFormStatus } from "react-dom";

import { Button, Form } from "react-bootstrap";
import { createRace } from "~src/actions/races/create-race.action";

export default function CreateRace() {
    const [state, formAction] = useFormState(createRace, { message: "" });

    return (
        <div>
            <h1>Start a new Race</h1>

            {/*Todo: make nice flash messages for errors and success*/}
            {state?.message && state.message}

            <Form action={formAction}>
                <Form.Group className={"mb-2"} controlId={"game"}>
                    <Form.Label>Game</Form.Label>
                    <Form.Control
                        type={"text"}
                        placeholder={"Enter Game"}
                        name={"game"}
                    />
                </Form.Group>
                <Form.Group className={"mb-4"} controlId={"category"}>
                    <Form.Label>Category</Form.Label>
                    <Form.Control
                        name={"category"}
                        type={"text"}
                        placeholder={"Enter Category"}
                    />
                </Form.Group>
                <SubmitButton />
            </Form>
        </div>
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
