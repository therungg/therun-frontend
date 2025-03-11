"use client";

import React, { useActionState } from "react";
import { createEventAction } from "~app/events/actions/create-event.action";
import {
    Breadcrumb,
    BreadcrumbItem,
} from "~src/components/breadcrumbs/breadcrumb";
import { Form } from "react-bootstrap";
import { EventForm } from "~app/events/form/event-form";

export const CreateEvent = () => {
    const [state, formAction] = useActionState(createEventAction, {
        message: "",
    });

    const breadcrumbs: BreadcrumbItem[] = [
        { content: "Events", href: "/events" },
        { content: "Create a new Event" },
    ];

    return (
        <>
            <Breadcrumb breadcrumbs={breadcrumbs} />

            {state?.message && state.message}

            <Form action={formAction} className="row">
                <fieldset className="border py-3 px-4">
                    <legend className="w-auto mb-0">Create a new event</legend>
                    <EventForm />
                </fieldset>
            </Form>
        </>
    );
};
