'use client';

import type {
    DateRange,
    GameCategory,
} from '../../../../types/tournament.types';
import { EligibleRunsEditor } from './eligible-runs-editor';
import {
    Field,
    FieldGrid,
    FormSection,
    NumberInput,
    formStyles as styles,
    TextArea,
    TextInput,
    ToggleCard,
} from './form-primitives';
import { HeatsEditor } from './heats-editor';
import { UsersListEditor } from './users-list-editor';

export interface TournamentFormState {
    name: string;
    shortName: string;
    description: string;
    heats: DateRange[];
    eligibleRuns: GameCategory[];
    eligibleUsers: string[];
    moderators: string[];
    forceStream: string;
    minimumTimeSeconds: string;
    gameTime: boolean;
    url: string;
    logoUrl: string;
    organizer: string;
}

export function emptyFormState(): TournamentFormState {
    return {
        name: '',
        shortName: '',
        description: '',
        heats: [{ startDate: '', endDate: '' }],
        eligibleRuns: [{ game: '', category: '' }],
        eligibleUsers: [],
        moderators: [],
        forceStream: '',
        minimumTimeSeconds: '',
        gameTime: false,
        url: '',
        logoUrl: '',
        organizer: '',
    };
}

export function TournamentFormFields({
    state,
    set,
    mode,
}: {
    state: TournamentFormState;
    set: <K extends keyof TournamentFormState>(
        key: K,
        value: TournamentFormState[K],
    ) => void;
    mode: 'create' | 'edit';
}) {
    return (
        <>
            <FormSection
                icon="01"
                title="Identity"
                description="How players see and find your tournament across the site."
            >
                <FieldGrid>
                    <Field
                        label="Name"
                        required
                        help={
                            mode === 'create'
                                ? 'Used in the tournament URL and as the primary heading. Cannot be changed once created.'
                                : 'The tournament name is permanent and cannot be edited after creation.'
                        }
                    >
                        <TextInput
                            value={state.name}
                            onChange={(e) => set('name', e.target.value)}
                            placeholder="My Awesome Tournament"
                            required
                            disabled={mode === 'edit'}
                        />
                    </Field>
                    <Field
                        label="Short name"
                        optional
                        help="A compact label shown in tight spaces (cards, headers)."
                    >
                        <TextInput
                            value={state.shortName}
                            onChange={(e) => set('shortName', e.target.value)}
                            placeholder="Short version"
                        />
                    </Field>
                    <div className={styles.fieldGridFull}>
                        <Field
                            label="Description"
                            required
                            help={
                                <>
                                    Pitch your tournament.{' '}
                                    <strong>HTML is supported</strong> — use{' '}
                                    <code>&lt;p&gt;</code>,{' '}
                                    <code>&lt;a&gt;</code>,{' '}
                                    <code>&lt;strong&gt;</code>,{' '}
                                    <code>&lt;ul&gt;</code> etc. to format the
                                    public page.
                                </>
                            }
                        >
                            <TextArea
                                rows={6}
                                value={state.description}
                                onChange={(e) =>
                                    set('description', e.target.value)
                                }
                                placeholder="<p>What is this tournament about? Who is it for? What are the stakes?</p>"
                                required
                            />
                        </Field>
                    </div>
                </FieldGrid>
            </FormSection>

            <FormSection
                icon="02"
                title="Schedule"
                description="One or more time windows when runs count. The overall start and end dates are derived from these — periods cannot overlap."
            >
                <HeatsEditor
                    value={state.heats}
                    onChange={(heats) => set('heats', heats)}
                />
            </FormSection>

            <FormSection
                icon="03"
                title="Eligible runs"
                description="The exact game and category combinations that runs must match to be counted toward leaderboards."
            >
                <EligibleRunsEditor
                    value={state.eligibleRuns}
                    onChange={(runs) => set('eligibleRuns', runs)}
                />
            </FormSection>

            <FormSection
                icon="04"
                title="Participants"
                description="Decide who can join. Leave the eligible list empty for an open tournament — perfect for community events."
            >
                <Field
                    label="Eligible users"
                    optional
                    help="Twitch usernames of players allowed to participate. Type a name and press Enter or comma to add. Banned users are managed separately under Participants."
                >
                    <UsersListEditor
                        value={state.eligibleUsers}
                        onChange={(users) => set('eligibleUsers', users)}
                        placeholder="twitch_username"
                    />
                </Field>
                {state.eligibleUsers.length === 0 && (
                    <div className={styles.openCallout}>
                        <span className={styles.openCalloutIcon}>●</span>
                        <span className={styles.openCalloutBody}>
                            <strong>Open tournament.</strong> With no eligible
                            users listed, anyone can submit runs. You can still
                            block specific users from the Participants tab after
                            creation.
                        </span>
                    </div>
                )}
            </FormSection>

            <FormSection
                icon="05"
                title="Run rules"
                description="Fine-tune how runs are evaluated and presented during the tournament."
            >
                <FieldGrid>
                    <div className={styles.fieldGridFull}>
                        <Field
                            label="Use in-game time (IGT)"
                            help="When enabled, leaderboards rank by in-game time rather than real time. Use this only if every eligible category has a reliable IGT."
                        >
                            <ToggleCard
                                checked={state.gameTime}
                                onChange={(v) => set('gameTime', v)}
                                title={
                                    state.gameTime
                                        ? 'Ranking by in-game time'
                                        : 'Ranking by real time'
                                }
                                description={
                                    state.gameTime
                                        ? "Runs without an IGT won't appear on leaderboards."
                                        : 'Runs are ranked by wall-clock time from start to finish.'
                                }
                            />
                        </Field>
                    </div>
                    <Field
                        label="Minimum run time"
                        optional
                        help="Runs faster than this are excluded — useful to filter out misclicks or test runs. Leave empty to allow any time."
                    >
                        <NumberInput
                            min={0}
                            value={state.minimumTimeSeconds}
                            onChange={(e) =>
                                set('minimumTimeSeconds', e.target.value)
                            }
                            placeholder="seconds"
                        />
                    </Field>
                    <Field
                        label="Force stream"
                        optional
                        help="Pin a specific Twitch channel to the tournament page (e.g. an organizer's restream). Leave empty to auto-pick a live participant."
                    >
                        <TextInput
                            value={state.forceStream}
                            onChange={(e) => set('forceStream', e.target.value)}
                            placeholder="twitch_username"
                        />
                    </Field>
                </FieldGrid>
            </FormSection>

            <FormSection
                icon="06"
                title="Staff & branding"
                description="Trusted moderators and presentation details. Moderators are listed publicly; full staff roles are managed after creation."
            >
                <FieldGrid>
                    <div className={styles.fieldGridFull}>
                        <Field
                            label="Moderators"
                            optional
                            help="Twitch usernames of moderators displayed on the tournament page. This is purely informational — to grant management permissions, use the Staff tab after creating the tournament."
                        >
                            <UsersListEditor
                                value={state.moderators}
                                onChange={(mods) => set('moderators', mods)}
                                placeholder="twitch_username"
                            />
                        </Field>
                    </div>
                    <Field
                        label="Organizer"
                        optional
                        help="Person or group running the tournament. Shown on the public page."
                    >
                        <TextInput
                            value={state.organizer}
                            onChange={(e) => set('organizer', e.target.value)}
                            placeholder="Community / organization name"
                        />
                    </Field>
                    <Field
                        label="External URL"
                        optional
                        help="Link to a rules document, registration form, or community page."
                    >
                        <TextInput
                            type="url"
                            value={state.url}
                            onChange={(e) => set('url', e.target.value)}
                            placeholder="https://…"
                        />
                    </Field>
                    <div className={styles.fieldGridFull}>
                        <Field
                            label="Logo URL"
                            optional
                            help="Square or wide image used in tournament cards and headers."
                        >
                            <TextInput
                                type="url"
                                value={state.logoUrl}
                                onChange={(e) => set('logoUrl', e.target.value)}
                                placeholder="https://…/logo.png"
                            />
                        </Field>
                    </div>
                </FieldGrid>
            </FormSection>
        </>
    );
}
