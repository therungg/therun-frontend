"use client";

import React from "react";
import { Button, Form } from "react-bootstrap";
import { useFormState, useFormStatus } from "react-dom";
import { setStoryPreferencesAction } from "~src/actions/stories/set-story-preferences.action";
import { StoryPreferences } from "~app/live/story.types";

export const SetStoryPreferences = ({
    storyPreferences,
}: {
    storyPreferences: StoryPreferences;
}) => {
    const [state, formAction] = useFormState(setStoryPreferencesAction, {
        message: "",
    });

    console.log(storyPreferences);

    return (
        <Form action={formAction} className="row">
            <fieldset className="border py-3 px-4">
                {state?.message && state.message}
                <legend className="w-auto mb-0">
                    Manage Story Preferences
                </legend>
                <div className="row g-3 mb-3">
                    <Form.Group controlId="ranked">
                        <Form.Check
                            name="enabled"
                            type="checkbox"
                            defaultChecked={storyPreferences.enabled}
                            label="Enable Twitch Bot for therun.gg Stories"
                        />
                    </Form.Group>
                </div>
                <SubmitButton />
            </fieldset>
        </Form>
    );
};

const SubmitButton = () => {
    const { pending } = useFormStatus();
    return (
        <Button disabled={pending} variant="primary" type="submit">
            {!pending ? "Set Preferences" : "Setting Preferences..."}
        </Button>
    );
};
