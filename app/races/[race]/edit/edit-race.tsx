"use client";

import { Button, Form } from "react-bootstrap";
import { Race } from "~app/races/races.types";
import { isRaceModerator } from "~src/rbac/confirm-permission";
import { User } from "../../../../types/session.types";

import { useFormStatus } from "react-dom";
import { editRace } from "~app/races/actions/edit-race.action";
import {
    Breadcrumb,
    BreadcrumbItem,
} from "~src/components/breadcrumbs/breadcrumb";
import { UnderlineTooltip } from "~src/components/tooltip";
import React, { useActionState } from "react";

export const EditRace = ({ race, user }: { race: Race; user: User }) => {
    const [state, formAction] = useActionState(editRace, { message: "" });

    if (!isRaceModerator(race, user)) {
        throw Error("You are not a moderator of this race");
    }

    const breadcrumbs: BreadcrumbItem[] = [
        { content: "Races", href: "/races" },
        {
            content:
                race.customName ||
                `${race.displayGame} - ${race.displayCategory}`,
            href: `/races/${race.raceId}`,
        },
        { content: "Edit Race Data", href: `/races/${race.raceId}/edit` },
    ];

    return (
        <>
            <Breadcrumb breadcrumbs={breadcrumbs} />
            {/*Todo: make nice flash messages for errors and success*/}
            {state?.message && state.message}

            <Form action={formAction} className="row">
                <input hidden name="raceId" value={race.raceId} readOnly />
                <fieldset className="border py-3 px-4">
                    <legend className="w-auto mb-0">Edit race</legend>
                    <div className="row g-3 mb-3">
                        <Form.Group controlId="customName">
                            <Form.Label>Race Name</Form.Label>
                            <Form.Control
                                name="customName"
                                type="text"
                                placeholder="Enter Custom Name"
                                required={false}
                                defaultValue={race.customName}
                            />
                        </Form.Group>
                    </div>
                    <div className="row g-3 mb-3">
                        <Form.Group controlId="description">
                            <Form.Label>Description</Form.Label>
                            <Form.Control
                                as="textarea"
                                name="description"
                                type="textarea"
                                placeholder="Description eg. bingo seed or tournament name"
                                required={false}
                                defaultValue={race.description}
                            />
                        </Form.Group>
                    </div>
                    <div className="row g-3 mb-3 d-flex">
                        <Form.Group controlId="forceStream">
                            <Form.Label>
                                <UnderlineTooltip
                                    title="Twitch Stream"
                                    content="Force a specific stream instead of the participant's streams on the race page. Only input the name of the stream, no need to input https://twitch.tv/siglemic, just input siglemic"
                                    element="Twitch Stream"
                                />
                            </Form.Label>
                            <Form.Control
                                name="forceStream"
                                type="text"
                                placeholder="Enter the name of a stream to show"
                                required={false}
                                defaultValue={race.forceStream}
                            />
                        </Form.Group>
                        <Form.Group controlId="password">
                            <Form.Label>
                                <UnderlineTooltip
                                    title="Password"
                                    content="Sets a password. Participants need to enter this password in order to join the race."
                                    element="Password"
                                />
                            </Form.Label>
                            <Form.Control
                                name="password"
                                type="text"
                                placeholder="Enter a Race Password"
                                required={false}
                            />
                        </Form.Group>
                        <div className="text-end">
                            <SubmitButton />
                        </div>
                    </div>
                </fieldset>
            </Form>
        </>
    );
};

const SubmitButton = () => {
    const { pending } = useFormStatus();
    return (
        <Button disabled={pending} variant="primary" type="submit">
            {!pending ? "Edit Race" : "Editing Race..."}
        </Button>
    );
};
