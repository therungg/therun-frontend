"use client";

import React, { FormEvent, startTransition, useActionState } from "react";
import {
    Breadcrumb,
    BreadcrumbItem,
} from "~src/components/breadcrumbs/breadcrumb";
import { Form } from "react-bootstrap";
import { EventForm } from "~app/events/form/event-form";
import { Event } from "types/events.types";
import { editEventAction } from "~app/events/actions/edit-event.action";

export const EditEvent = ({ event }: { event: Event }) => {
    const [state, formAction] = useActionState(editEventAction, {
        message: "",
    });

    const breadcrumbs: BreadcrumbItem[] = [
        { content: "Events", href: "/events" },
        { content: event.name, href: "/events/" + event.id },
        { content: "Edit Event" },
    ];

    function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const formData = new FormData(event.target);
        startTransition(() => formAction(formData));
    }

    return (
        <>
            <Breadcrumb breadcrumbs={breadcrumbs} />

            {state?.message && state.message}

            <Form onSubmit={handleSubmit} className="row">
                <fieldset className="border py-3 px-4">
                    <legend className="w-auto mb-0">
                        Edit Event {event.name}
                    </legend>
                    <EventForm event={event} />
                </fieldset>
            </Form>
        </>
    );
};
