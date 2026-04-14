'use client';

import React, { useActionState, useEffect, useState } from 'react';
import { Form } from 'react-bootstrap';
import { useFormStatus } from 'react-dom';
import { toast } from 'react-toastify';
import {
    StoryElementCategory,
    StoryOption,
    StoryPreferences,
} from '~app/(new-layout)/live/story.types';
import { setStoryPreferencesAction } from '~app/(new-layout)/stories/actions/set-story-preferences.action';
import { getPronounsFromString } from '~app/(new-layout)/stories/manage/get-pronouns-from-string';
import { UnderlineTooltip } from '~src/components/tooltip';
import { User } from '../../../../types/session.types';
import styles from './manage-stories.module.scss';

export const SetStoryPreferences = ({
    storyPreferences,
    user,
    storyOptions,
}: {
    storyPreferences: StoryPreferences;
    user: User;
    storyOptions: StoryOption[];
}) => {
    const [state, formAction] = useActionState(setStoryPreferencesAction, {
        message: '',
        type: '',
    });
    const [activeTab, setActiveTab] = useState<'general' | 'stories'>(
        'general',
    );

    useEffect(() => {
        if (state?.message) {
            toast.success(state.message);
        }
    }, [state?.message]);

    return (
        <Form action={formAction}>
            <div className={styles.tabs}>
                <div className={styles.tabList} role="tablist">
                    <button
                        type="button"
                        role="tab"
                        className={`${styles.tab} ${activeTab === 'general' ? styles.tabActive : ''}`}
                        onClick={() => setActiveTab('general')}
                    >
                        General Preferences
                    </button>
                    <button
                        type="button"
                        role="tab"
                        className={`${styles.tab} ${activeTab === 'stories' ? styles.tabActive : ''}`}
                        onClick={() => setActiveTab('stories')}
                    >
                        Manage Individual Stories
                    </button>
                </div>

                {activeTab === 'general' && (
                    <BasicFormFields
                        storyPreferences={storyPreferences}
                        user={user}
                    />
                )}
                {/* Always render stories tab to preserve form data, just hide it */}
                <div
                    style={{
                        display: activeTab === 'stories' ? 'block' : 'none',
                    }}
                >
                    <ManageIndividualStories
                        storyPreferences={storyPreferences}
                        user={user}
                        storyOptions={storyOptions}
                    />
                </div>
            </div>

            <SubmitButton />
        </Form>
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
        <>
            <div className={styles.formSection}>
                <h3 className={styles.sectionTitle}>Bot Settings</h3>
                <div className={styles.toggleGroup}>
                    <div className={styles.toggleRow}>
                        <span className={styles.toggleLabel}>
                            Enable Twitch Bot for therun.gg Stories
                        </span>
                        <Form.Check
                            name="enabled"
                            type="switch"
                            id="enabled"
                            defaultChecked={storyPreferences.enabled}
                        />
                    </div>
                    <div className={styles.toggleRow}>
                        <span className={styles.toggleLabel}>
                            Disable negative stories (e.g. &quot;Lost 10 seconds
                            to PB&quot;)
                        </span>
                        <Form.Check
                            name="disableNegativeStories"
                            type="switch"
                            id="disableNegativeStories"
                            defaultChecked={
                                storyPreferences.disableNegativeStories
                            }
                        />
                    </div>
                    <div className={styles.toggleRow}>
                        <span className={styles.toggleLabel}>
                            Disable welcome stories at the start of your run
                        </span>
                        <Form.Check
                            name="disableWelcomeStories"
                            type="switch"
                            id="disableWelcomeStories"
                            defaultChecked={
                                storyPreferences.disableWelcomeStories
                            }
                        />
                    </div>
                    <div className={styles.toggleRow}>
                        <span className={styles.toggleLabel}>
                            Change the word &quot;Gold&quot; to
                            &quot;Rainbow&quot;
                        </span>
                        <Form.Check
                            name="changeGoldToRainbow"
                            type="switch"
                            id="changeGoldToRainbow"
                            defaultChecked={
                                storyPreferences.changeGoldToRainbow
                            }
                        />
                    </div>
                </div>
            </div>

            <div className={styles.formSection}>
                <h3 className={styles.sectionTitle}>Translation</h3>
                <div className={styles.fieldGroup}>
                    <label className={styles.fieldLabel}>
                        <UnderlineTooltip
                            title="Translate story to different language"
                            content="This translation will be done by AI. Results may vary."
                            element="Translate story to different language"
                        />
                    </label>
                    <Form.Select
                        name="translateLanguage"
                        className={styles.selectSmall}
                    >
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
                </div>
            </div>

            <div className={styles.formSection}>
                <h3 className={styles.sectionTitle}>Cooldown</h3>
                <div className={styles.fieldGroup}>
                    <label className={styles.fieldLabel}>
                        <UnderlineTooltip
                            title="Story Cooldown in minutes"
                            content="By default, the bot will send a message every time you split. This can be a bit much. You can set a cooldown here, for example 10 minutes. Then it will at most send a message every 10 minutes."
                            element="Story Cooldown in minutes"
                        />
                    </label>
                    <Form.Control
                        className={styles.inputSmall}
                        name="globalStoryCooldown"
                        type="number"
                        required={false}
                        min={0}
                        step={1}
                        max={60}
                        defaultValue={storyPreferences.globalStoryCooldown ?? 0}
                        onKeyDown={numberInputKeyDown}
                    />
                </div>
                <div className={styles.toggleGroup}>
                    <div className={styles.toggleRow}>
                        <span className={styles.toggleLabel}>
                            Allow exceptions on cooldown for very relevant
                            stories (gold split, PB)
                        </span>
                        <Form.Check
                            name="allowGlobalStoryCooldownOverride"
                            type="switch"
                            id="allowGlobalStoryCooldownOverride"
                            defaultChecked={
                                storyPreferences.allowGlobalStoryCooldownOverride
                            }
                        />
                    </div>
                </div>
            </div>

            <div className={styles.formSection}>
                <h3 className={styles.sectionTitle}>Identity</h3>
                <div className={styles.fieldGroup}>
                    <label className={styles.fieldLabel}>
                        <UnderlineTooltip
                            title="Username to be called"
                            content={`By default, the bot will call you ${user.username}. You can override this here. If you don't you will get tagged in every message.`}
                            element="Username to be called"
                        />
                    </label>
                    <Form.Control
                        className={styles.inputSmall}
                        name="nameOverride"
                        required={true}
                        defaultValue={
                            storyPreferences.nameOverride ?? user.username
                        }
                    />
                </div>
                <div className={styles.fieldGroup}>
                    <label className={styles.fieldLabel}>
                        <UnderlineTooltip
                            title="Pronouns"
                            content="By default, the bot will call you They/Them/Their. You can override this here."
                            element="Pronouns"
                        />
                    </label>
                    <div className={styles.pronounsRow}>
                        <div className={styles.pronounField}>
                            <Form.Control
                                name="pronounOverrideThey"
                                placeholder="They"
                                defaultValue={
                                    storyPreferences.pronounOverrideThey ??
                                    defaultPronouns[0]
                                }
                            />
                            <div className={styles.pronounHint}>
                                Subjective (They)
                            </div>
                        </div>
                        <span className={styles.pronounSeparator}>/</span>
                        <div className={styles.pronounField}>
                            <Form.Control
                                name="pronounOverrideThem"
                                placeholder="Them"
                                defaultValue={
                                    storyPreferences.pronounOverrideThem ??
                                    defaultPronouns[1]
                                }
                            />
                            <div className={styles.pronounHint}>
                                Objective (Them)
                            </div>
                        </div>
                        <span className={styles.pronounSeparator}>/</span>
                        <div className={styles.pronounField}>
                            <Form.Control
                                name="pronounOverrideTheir"
                                placeholder="Their"
                                defaultValue={
                                    storyPreferences.pronounOverrideTheir ??
                                    defaultPronouns[2]
                                }
                            />
                            <div className={styles.pronounHint}>
                                Possessive (Their)
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

const categoryInfo = new Map<
    StoryElementCategory,
    { title: string; description: string }
>([
    [
        'generic',
        {
            title: 'Generic Stories',
            description:
                'Fun facts and stories not specific to the current run',
        },
    ],
    [
        'previous',
        {
            title: 'Previous Split Stories',
            description: 'Commentary about the split you just completed',
        },
    ],
    [
        'next',
        {
            title: 'Upcoming Split Stories',
            description: 'Previews and info about the next split',
        },
    ],
]);

const ManageIndividualStories = ({
    storyPreferences,
    user,
    storyOptions,
}: {
    storyPreferences: StoryPreferences;
    user: User;
    storyOptions: StoryOption[];
}) => {
    return (
        <div>
            {Array.from(categoryInfo.entries()).map(
                ([category, { title, description }]) => {
                    const options = storyOptions.filter(
                        (option) => option.category === category,
                    );

                    return (
                        <div
                            className={styles.storyCategorySection}
                            key={category}
                        >
                            <h3 className={styles.storyCategoryTitle}>
                                {title}
                            </h3>
                            <p className={styles.storyCategoryDesc}>
                                {description}
                            </p>
                            <div className={styles.storyList}>
                                <div className={styles.storyHeader}>
                                    <div className={styles.storyToggle}>
                                        Enabled
                                    </div>
                                    <div className={styles.storyCooldown}>
                                        <UnderlineTooltip
                                            title="Per-story cooldown in minutes"
                                            content="Minimum minutes between sending this specific story. Set to 0 to send it every time it's relevant."
                                            element="Cooldown (min)"
                                        />
                                    </div>
                                    <div className={styles.storyText}>
                                        Example
                                    </div>
                                </div>
                                {options.map((option, index) => {
                                    const id = `stories.${option.type}.enabled`;
                                    const idCooldown = `stories.${option.type}.cooldown`;

                                    const checked = !(
                                        storyPreferences.disabledStories || []
                                    ).includes(option.type);

                                    const uncheckBecauseNegative =
                                        option.isNegative &&
                                        storyPreferences.disableNegativeStories;

                                    return (
                                        <div
                                            className={styles.storyRow}
                                            key={id + index}
                                        >
                                            <div className={styles.storyToggle}>
                                                <input
                                                    type="hidden"
                                                    value={0}
                                                    name={id}
                                                />
                                                <Form.Check
                                                    type="switch"
                                                    id={id}
                                                    name={id}
                                                    disabled={
                                                        uncheckBecauseNegative
                                                    }
                                                    defaultChecked={
                                                        checked &&
                                                        !uncheckBecauseNegative
                                                    }
                                                    value={1}
                                                />
                                            </div>
                                            <div
                                                className={styles.storyCooldown}
                                            >
                                                <input
                                                    name={idCooldown}
                                                    id={idCooldown}
                                                    type="number"
                                                    title="Cooldown in minutes"
                                                    aria-label="Cooldown in minutes"
                                                    min={0}
                                                    step={1}
                                                    max={60 * 24}
                                                    defaultValue={
                                                        (storyPreferences.customCooldowns ||
                                                            {})[option.type] ??
                                                        option.cooldown
                                                    }
                                                    onKeyDown={
                                                        numberInputKeyDown
                                                    }
                                                />
                                            </div>
                                            <div className={styles.storyText}>
                                                <label htmlFor={id}>
                                                    {showExampleStory(
                                                        option.example,
                                                        user,
                                                        storyPreferences,
                                                    )}
                                                </label>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                },
            )}
        </div>
    );
};

const showExampleStory = (
    example: string,
    user: User,
    storyPreferences: StoryPreferences,
): string => {
    return example.replaceAll(
        '[user]',
        storyPreferences.nameOverride || user.username,
    );
};

const SubmitButton = () => {
    const { pending } = useFormStatus();
    return (
        <button type="submit" disabled={pending} className={styles.submitBtn}>
            {!pending ? 'Save Preferences' : 'Saving...'}
        </button>
    );
};

const numberInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    const eventCode = event.code.toLowerCase();
    if (
        !(
            event.code !== null &&
            (eventCode.includes('digit') ||
                eventCode.includes('arrow') ||
                eventCode.includes('home') ||
                eventCode.includes('end') ||
                eventCode.includes('backspace') ||
                eventCode.includes('tab') ||
                (eventCode.includes('numpad') && eventCode.length === 7))
        )
    ) {
        event.preventDefault();
    }
};
