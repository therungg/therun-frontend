"use client";

import React, { Fragment, useEffect } from "react";
import { Button, Col, Form, Row, Tab, Tabs } from "react-bootstrap";
import { useFormState, useFormStatus } from "react-dom";
import { setStoryPreferencesAction } from "~src/actions/stories/set-story-preferences.action";
import {
    StoryElementCategory,
    StoryOption,
    StoryPreferences,
} from "~app/live/story.types";
import { UnderlineTooltip } from "~src/components/tooltip";
import { User } from "../../../types/session.types";
import { getPronounsFromString } from "~app/stories/manage/get-pronouns-from-string";
import { Bounce, toast, ToastContainer } from "react-toastify";
import { useTheme } from "next-themes";

export const SetStoryPreferences = ({
    storyPreferences,
    user,
    storyOptions,
}: {
    storyPreferences: StoryPreferences;
    user: User;
    storyOptions: StoryOption[];
}) => {
    const [state, formAction] = useFormState(setStoryPreferencesAction, {
        message: "",
        type: "",
    });

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
                    <legend className="w-auto mb-0">
                        Manage Story Preferences
                    </legend>
                    <Tabs
                        className="pt-0 mb-2"
                        defaultActiveKey="general"
                        unmountOnExit={false}
                    >
                        <Tab
                            title="General Preferences"
                            eventKey="general"
                            unmountOnExit={false}
                        >
                            <BasicFormFields
                                storyPreferences={storyPreferences}
                                user={user}
                            />
                        </Tab>
                        <Tab
                            title="Manage Individual Stories"
                            eventKey="stories"
                            unmountOnExit={false}
                        >
                            <ManageStories
                                storyPreferences={storyPreferences}
                                user={user}
                                storyOptions={storyOptions}
                            />
                        </Tab>
                    </Tabs>

                    <SubmitButton />
                </fieldset>
            </Form>
        </>
    );
};

const BasicFormFields = ({
    storyPreferences,
    user,
}: {
    storyPreferences: StoryPreferences;
    user: User;
}) => {
    const defaultPronouns = getPronounsFromString(user.pronouns);
    return (
        <div className="py-1 px-2">
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
                        defaultChecked={storyPreferences.disableNegativeStories}
                        label="Disable all negative stories like 'The user lost 10 seconds to their PB'"
                    />
                </Form.Group>
                <Form.Group controlId="disableWelcomeStories">
                    <Form.Check
                        name="disableWelcomeStories"
                        type="checkbox"
                        defaultChecked={storyPreferences.disableWelcomeStories}
                        label="Disable all 'welcome' stories that show up at the start of your run"
                    />
                </Form.Group>
                {/*<Form.Group controlId="allowAIRephrase">*/}
                {/*    <Form.Check*/}
                {/*        name="allowAIRephrase"*/}
                {/*        type="checkbox"*/}
                {/*        defaultChecked={*/}
                {/*            storyPreferences.allowAIRephrase*/}
                {/*        }*/}
                {/*        label="Allow AI to rephrase the text, to create some variety. AI will not generate new stories, only rephrase the current hand-written ones."*/}
                {/*    />*/}
                {/*</Form.Group>*/}
                <Form.Group controlId="translateLanguage" className="w-25">
                    <Form.Label column="sm">
                        <UnderlineTooltip
                            title="Translate story to different language"
                            content="This translation will be done by AI. Results may vary."
                            element="Translate story to different language"
                        />
                    </Form.Label>
                    <Form.Select name="translateLanguage">
                        <option value="">Keep it in English</option>
                        <option value="Dutch">Dutch (Nederlands)</option>
                        <option value="French">French (Français)</option>
                        <option value="German">German (Deutsch)</option>
                        <option value="Italian">Italian (Italiano)</option>
                        <option value="Japanese">Japanese (日本語)</option>
                        <option value="Spanish">Spanish (Español)</option>
                        <option value="Portuguese">
                            Portuguese (Português)
                        </option>
                    </Form.Select>
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
                        defaultValue={storyPreferences.globalStoryCooldown ?? 0}
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
                            storyPreferences.nameOverride ?? user.username
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
                            <Form.Text muted>Like They (Subjective)</Form.Text>
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
                            <Form.Text muted>Like Them (Objective)</Form.Text>
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
                            <Form.Text muted>Like Their (Possessive)</Form.Text>
                        </Col>
                    </Row>
                </Form.Group>
            </div>
        </div>
    );
};

const ManageStories = ({
    storyPreferences,
    user,
    storyOptions,
}: {
    storyPreferences: StoryPreferences;
    user: User;
    storyOptions: StoryOption[];
}) => {
    const categoryMap = new Map<StoryElementCategory, string>([
        ["previous", "Stories about the previous split"],
    ]);
    return (
        <div className="mb-3">
            {Array.from(categoryMap.entries()).map(([k, v]) => {
                const specificOptions: StoryOption[] = storyOptions.filter(
                    (option) => option.category === k,
                );

                return (
                    <Fragment key={k}>
                        <h2>{v}</h2>
                        {specificOptions.map((option, index) => {
                            const id = `stories.${option.type}.enabled`;

                            const checked = !(
                                storyPreferences.disabledStories || []
                            ).includes(option.type);

                            const uncheckBecauseNegative =
                                option.isNegative &&
                                storyPreferences.disableNegativeStories;

                            return (
                                <Form.Group controlId={id} key={id + index}>
                                    <input type="hidden" value={0} name={id} />
                                    <Form.Check
                                        type="switch"
                                        id={id}
                                        name={id}
                                        disabled={uncheckBecauseNegative}
                                        defaultChecked={
                                            checked && !uncheckBecauseNegative
                                        }
                                        value={1}
                                        label={showExampleStory(
                                            option.example,
                                            user,
                                            storyPreferences,
                                        )}
                                    />
                                </Form.Group>
                            );
                        })}
                    </Fragment>
                );
            })}
        </div>
    );
};

const showExampleStory = (
    example: string,
    user: User,
    storyPreferences: StoryPreferences,
): string => {
    return example.replaceAll(
        "[user]",
        storyPreferences.nameOverride || user.username,
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
