"use client";

import React, { useEffect } from "react";
import { Button, Col, Form, Row } from "react-bootstrap";
import { useFormState, useFormStatus } from "react-dom";
import { setStoryPreferencesAction } from "~src/actions/stories/set-story-preferences.action";
import { StoryPreferences } from "~app/live/story.types";
import { UnderlineTooltip } from "~src/components/tooltip";
import { User } from "../../../types/session.types";
import { getPronounsFromString } from "~app/stories/manage/get-pronouns-from-string";
import { Bounce, toast, ToastContainer } from "react-toastify";
import { useTheme } from "next-themes";

export const SetStoryPreferences = ({
    storyPreferences,
    user,
}: {
    storyPreferences: StoryPreferences;
    user: User;
}) => {
    const [state, formAction] = useFormState(setStoryPreferencesAction, {
        message: "",
    });

    const defaultPronouns = getPronounsFromString(user.pronouns);

    useEffect(() => {
        if (state?.message) {
            toast.success(state.message);
        }
    }, [state?.message]);

    const theme = useTheme();

    return (
        <>
            <ToastContainer
                position="top-center"
                autoClose={5000}
                hideProgressBar={false}
                newestOnTop={false}
                closeOnClick
                draggable
                pauseOnHover
                transition={Bounce}
                theme={theme.theme || "dark"}
            />
            <Form action={formAction} className="row">
                <fieldset className="border py-3 px-4">
                    {state?.message && state.message}
                    <legend className="w-auto mb-0">
                        Manage Story Preferences
                    </legend>
                    <div className="row g-2 mb-4">
                        <Form.Group controlId="enabled">
                            <Form.Check
                                name="enabled"
                                type="checkbox"
                                defaultChecked={storyPreferences.enabled}
                                label="Enable Twitch Bot for therun.gg Stories"
                            />
                        </Form.Group>
                        <Form.Group controlId="disableNegativeStories">
                            <Form.Check
                                name="disableNegativeStories"
                                type="checkbox"
                                defaultChecked={
                                    storyPreferences.disableNegativeStories
                                }
                                label="Disable all negative stories like 'The user lost 10 seconds to their PB'"
                            />
                        </Form.Group>
                        <Form.Group controlId="disableWelcomeStories">
                            <Form.Check
                                name="disableWelcomeStories"
                                type="checkbox"
                                defaultChecked={
                                    storyPreferences.disableWelcomeStories
                                }
                                label="Disable all 'welcome' stories that show up at the start of your run"
                            />
                        </Form.Group>
                        <Form.Group controlId="allowAIRephrase">
                            <Form.Check
                                name="allowAIRephrase"
                                type="checkbox"
                                defaultChecked={
                                    storyPreferences.allowAIRephrase
                                }
                                label="Allow AI to rephrase the text, to create some variety. AI will not generate new stories, only rephrase the current hand-written ones."
                            />
                        </Form.Group>
                    </div>
                    <div className="row g-2 mb-4">
                        <Form.Group>
                            <Form.Label column="sm">
                                <UnderlineTooltip
                                    title="Story Cooldown in minutes"
                                    content="By default, the bot will send a message every time you split. This can be a bit much. You can set a cooldown here, for example 10 minutes. Then it will at most send a message every 10 minutes."
                                    element="Story Cooldown in minutes"
                                />
                            </Form.Label>
                            <Form.Control
                                className="w-25"
                                name="globalStoryCooldown"
                                type="number"
                                required={false}
                                min={0}
                                step={1}
                                max={60}
                                defaultValue={
                                    storyPreferences.globalStoryCooldown ?? 0
                                }
                                onKeyDown={numberInputKeyDown}
                            />
                        </Form.Group>
                        <Form.Group controlId="allowGlobalStoryCooldownOverride">
                            <Form.Check
                                name="allowGlobalStoryCooldownOverride"
                                type="checkbox"
                                defaultChecked={
                                    storyPreferences.allowGlobalStoryCooldownOverride
                                }
                                label="Allow exceptions on cooldown for very relevant stories, like for a gold split or a PB"
                            />
                        </Form.Group>
                    </div>

                    <div className="row g-2 mb-4">
                        <Form.Group controlId="nameOverride">
                            <Form.Label column="sm">
                                <UnderlineTooltip
                                    title="Username to be called"
                                    content={`By default, the bot will call you ${user.username}. You can override this here. If you don't you will get tagged in every message.`}
                                    element="Username to be called"
                                />
                            </Form.Label>
                            <Form.Control
                                className="w-25"
                                name="nameOverride"
                                required={true}
                                defaultValue={
                                    storyPreferences.nameOverride ??
                                    user.username
                                }
                            />
                        </Form.Group>
                        <Form.Group>
                            <Form.Label column="sm">
                                <UnderlineTooltip
                                    title="Pronouns"
                                    content="By default, the bot will call you They/Them/Their. You can override this here."
                                    element="Pronouns"
                                />
                            </Form.Label>
                            <Row className="w-50">
                                <Col>
                                    <Form.Control
                                        name="pronounOverrideThey"
                                        placeholder="They"
                                        defaultValue={
                                            storyPreferences.pronounOverrideThey ??
                                            defaultPronouns[0]
                                        }
                                    />
                                    <Form.Text muted>
                                        Like They (Subjective)
                                    </Form.Text>
                                </Col>
                                /
                                <Col>
                                    <Form.Control
                                        name="pronounOverrideThem"
                                        placeholder="Them"
                                        defaultValue={
                                            storyPreferences.pronounOverrideThem ??
                                            defaultPronouns[1]
                                        }
                                    />
                                    <Form.Text muted>
                                        Like Them (Objective)
                                    </Form.Text>
                                </Col>
                                /
                                <Col>
                                    <Form.Control
                                        name="pronounOverrideTheir"
                                        placeholder="Their"
                                        defaultValue={
                                            storyPreferences.pronounOverrideTheir ??
                                            defaultPronouns[2]
                                        }
                                    />
                                    <Form.Text muted>
                                        Like Their (Possessive)
                                    </Form.Text>
                                </Col>
                            </Row>
                        </Form.Group>
                    </div>
                    <SubmitButton />
                </fieldset>
            </Form>
        </>
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
const numberInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    const eventCode = event.code.toLowerCase();
    if (
        !(
            event.code !== null &&
            (eventCode.includes("digit") ||
                eventCode.includes("arrow") ||
                eventCode.includes("home") ||
                eventCode.includes("end") ||
                eventCode.includes("backspace") ||
                (eventCode.includes("numpad") && eventCode.length === 7))
        )
    ) {
        event.preventDefault();
    }
};
