'use client';

import React, {
    FormEvent,
    startTransition,
    useActionState,
    useEffect,
} from 'react';
import { Alert, Form } from 'react-bootstrap';
import { createEventAction } from '~app/(old-layout)/events/actions/create-event.action';
import { EventForm } from '~app/(old-layout)/events/form/event-form';
import {
    Breadcrumb,
    BreadcrumbItem,
} from '~src/components/breadcrumbs/breadcrumb';

export const CreateEvent = () => {
    const [state, formAction] = useActionState(createEventAction, {
        message: '',
    });

    const breadcrumbs: BreadcrumbItem[] = [
        { content: 'Events', href: '/events' },
        { content: 'Create a new Event' },
    ];

    function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const formData = new FormData(event.target);
        startTransition(() => formAction(formData));
    }

    useEffect(() => {
        if (state?.message) {
            window.scrollTo(0, 0);
        }
    }, [state?.message]);

    return (
        <>
            <Breadcrumb breadcrumbs={breadcrumbs} />

            {state?.message && <Alert variant="danger">{state.message}</Alert>}

            <Form onSubmit={handleSubmit} className="row">
                <fieldset className="border py-3 px-4">
                    <legend className="w-auto mb-0">Create a new event</legend>
                    <EventForm />
                </fieldset>
            </Form>
        </>
    );
};
