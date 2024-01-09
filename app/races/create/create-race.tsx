"use client";

import { Button, Form } from "react-bootstrap";
import { createRace } from "~src/actions/races/create-race.action";

export default function CreateRace() {
    return (
        <div>
            <h1>Start a new Race</h1>

            <Form action={createRace}>
                <Form.Group className={"mb-2"} controlId={"game"}>
                    <Form.Label>Game</Form.Label>
                    <Form.Control type={"text"} placeholder={"Enter Game"} />
                </Form.Group>
                <Form.Group className={"mb-4"} controlId={"category"}>
                    <Form.Label>Category</Form.Label>
                    <Form.Control
                        type={"text"}
                        placeholder={"Enter Category"}
                    />
                </Form.Group>
                <Button variant={"primary"} type="submit">
                    Create Race
                </Button>
            </Form>
        </div>
    );
}
