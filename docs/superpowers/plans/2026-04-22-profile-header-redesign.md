# Profile Header Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current text-first `Userform` header on user profile pages with a new `ProfileHeader` component that uses the new-layout design language (tokens, color-mix backdrops, rounded cards), features the viewer's patron style prominently, and stays ~180–200px tall on desktop.

**Architecture:**
- New `ProfileHeader` reads patron data via the existing client-side `usePatreons()` hook and renders a card whose backdrop/border/glow derive from the patron's preferences (or a neutral theme-accent variant for non-patrons).
- A new `buildPatronBackdropStyle` helper sits next to `buildPatronStyle` in `src/components/patreon/` and returns backdrop CSS.
- The existing edit form is extracted from `userform.tsx` into a standalone `EditProfileForm` component and mounted inside a Bootstrap `Modal` (`EditProfileModal`).
- `user-profile.tsx` replaces the old `<Row>` that held `Userform` + `GametimeForm` with `<ProfileHeader />`, and moves the gametime toggle + game filter into the tab-strip area (Overview/Sessions only).

**Tech Stack:** Next.js 16 (App Router) · React 19 · TypeScript · SCSS modules · Bootstrap 5 (`react-bootstrap` Modal) · `next/image` (`unoptimized` for Twitch CDN URLs) · existing new-layout design tokens (`app/(new-layout)/styles/_design-tokens.scss`).

**Notes for the engineer:**
- The codebase has no test runner. "Verification" throughout this plan means: `npm run typecheck`, `npm run lint`, and a manual browser check at `/<username>` on a local `npm run dev`.
- `userData.picture` already contains the Twitch profile image URL (it's on the existing `UserData` interface in `src/lib/get-session-data.ts`). No backend or type change is needed — the spec's concern about adding `profileImageUrl` was incorrect.
- Patron style helpers are in `src/components/patreon/patron-style.ts`. The `usePatreons()` hook is in `src/components/patreon/use-patreons.ts` and returns `{ data: PatronMap }`.
- The new-layout `Button` component is `src/components/Button/Button.tsx` (simple wrapper over Bootstrap's `.btn` classes, accepts `variant`).
- Use `@use '../../../../app/(new-layout)/styles/design-tokens' as *;` and `@use '../../../../app/(new-layout)/styles/mixins' as *;` in the SCSS module, matching `downloads.module.scss`.
- Do NOT add a co-author line to commits.

---

## File Structure

**New files**
- `src/components/patreon/patron-backdrop-style.ts` — returns `{ background, borderColor, glowColor, animated, angle }` for the header backdrop.
- `src/components/user/profile-header/profile-header.tsx` — the component.
- `src/components/user/profile-header/profile-header.module.scss` — styles (tokens + mixins).
- `src/components/user/profile-header/edit-profile-modal.tsx` — Bootstrap `Modal` wrapper around `EditProfileForm`.

**Refactored files**
- `src/components/user/userform.tsx` — extract `Edit` into exported `EditProfileForm` component. Keep `Userform` export (still imported elsewhere) delegating to the extracted pieces.
- `app/(new-layout)/[username]/user-profile.tsx` — swap `Userform` + surrounding `<Row>` for `<ProfileHeader />`; move gametime + game-filter controls next to the tab strip and conditionally render on `overview` / `sessions`.

---

## Task 1: Add `buildPatronBackdropStyle` helper

**Files:**
- Create: `src/components/patreon/patron-backdrop-style.ts`

- [ ] **Step 1: Create the helper file**

Create `src/components/patreon/patron-backdrop-style.ts`:

```ts
import type { PatronPreferences } from '../../../types/patreon.types';
import { resolveFill, type Theme } from './patron-style';

export interface PatronBackdropStyle {
    background: string;
    borderColor: string;
    glowColor: string;
    animated: boolean;
    angle: number;
}

export function buildPatronBackdropStyle(
    prefs: PatronPreferences | null | undefined,
    tier: number,
    theme: Theme,
): PatronBackdropStyle {
    const fill = resolveFill(prefs, tier, theme);
    const angle = prefs?.gradientAngle?.[theme] ?? 135;

    if (fill.kind === 'solid') {
        const color = fill.value;
        return {
            background: `linear-gradient(135deg, color-mix(in srgb, ${color} 28%, var(--bs-body-bg)) 0%, color-mix(in srgb, ${color} 6%, var(--bs-body-bg)) 100%)`,
            borderColor: `color-mix(in srgb, ${color} 45%, transparent)`,
            glowColor: `color-mix(in srgb, ${color} 35%, transparent)`,
            animated: false,
            angle,
        };
    }

    const stops = fill.value;
    const animated = !!prefs?.gradientAnimated;
    const mid = stops[Math.floor(stops.length / 2)] ?? stops[0];

    const stopsFor = (pct: number) =>
        stops
            .map(
                (c, i) =>
                    `color-mix(in srgb, ${c} ${pct}%, var(--bs-body-bg)) ${
                        (i / Math.max(stops.length - 1, 1)) * 100
                    }%`,
            )
            .join(', ');

    const backdropAngle = animated
        ? `var(--patron-grad-angle, ${angle}deg)`
        : `${angle}deg`;

    const background = `linear-gradient(${backdropAngle}, ${stopsFor(28)})`;

    return {
        background: `${background}, linear-gradient(${angle}deg, ${stopsFor(6)})`,
        borderColor: `color-mix(in srgb, ${mid} 45%, transparent)`,
        glowColor: `color-mix(in srgb, ${mid} 35%, transparent)`,
        animated,
        angle,
    };
}

export function neutralBackdropStyle(): PatronBackdropStyle {
    return {
        background:
            'color-mix(in srgb, var(--bs-body-bg) 82%, var(--bs-primary) 10%)',
        borderColor: 'rgba(var(--bs-primary-rgb), 0.22)',
        glowColor: 'rgba(var(--bs-primary-rgb), 0.18)',
        animated: false,
        angle: 135,
    };
}
```

- [ ] **Step 2: Verify typecheck passes**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/patreon/patron-backdrop-style.ts
git commit -m "feat(patreon): add backdrop style helper for patron-themed containers"
```

---

## Task 2: Extract `EditProfileForm` from `userform.tsx`

**Files:**
- Modify: `src/components/user/userform.tsx`

The current `Edit` inner function in `userform.tsx` holds all the form fields. Extract it into an exported `EditProfileForm` component that manages its own form state and owns the PUT request. `Userform` (still used by the no-runs branch and the old layout) delegates to it in its edit mode.

- [ ] **Step 1: Refactor `userform.tsx` to expose `EditProfileForm`**

Replace `src/components/user/userform.tsx` with the following. The top `Userform` wrapper keeps its existing signature and behavior; the new `EditProfileForm` can be imported directly by the modal.

```tsx
'use client';

import { hasFlag } from 'country-flag-icons';
import Image from 'next/image';
import React, { useState } from 'react';
import { Form } from 'react-bootstrap';
import {
    Twitch as TwitchIcon,
    Twitter as TwitterIcon,
    Youtube as YoutubeIcon,
} from 'react-bootstrap-icons';
import TimezoneSelect from 'react-timezone-select';
import { countries } from '~src/common/countries';
import { Button } from '~src/components/Button/Button';
import { BlueskyIcon } from '~src/icons/bluesky-icon';
import { Can, subject } from '~src/rbac/Can.component';
import { NameAsPatreon } from '../patreon/patreon-name';
import { Title } from '../title';

export interface ProfileFormState {
    pronouns: string;
    socials:
        | { youtube?: string; twitter?: string; twitch?: string; bluesky?: string }
        | undefined;
    bio: string;
    country: string;
    aka: string;
    timezone: string;
}

function initialForm(userData: any): ProfileFormState {
    if (userData.socials) {
        if (userData.socials.twitter) {
            const split = userData.socials.twitter.toString().split('.com/');
            userData.socials.twitter = split[split.length - 1];
        }
        if (userData.socials.youtube) {
            let split = userData.socials.youtube.toString().split('.com/');
            if (split.length === 1) split = split[0].split('.be/');
            userData.socials.youtube = split[split.length - 1];
        }
    }
    return {
        pronouns: userData.pronouns ?? '',
        socials: userData.socials,
        bio: userData.bio ?? '',
        country: userData.country ?? '',
        aka: userData.aka ?? '',
        timezone:
            userData.timezone ||
            Intl.DateTimeFormat().resolvedOptions().timeZone,
    };
}

export interface EditProfileFormProps {
    username: string;
    sessionId: string;
    initialData: any;
    onSubmitted?: () => void;
    onCancel?: () => void;
}

export const EditProfileForm: React.FC<EditProfileFormProps> = ({
    username,
    sessionId,
    initialData,
    onSubmitted,
    onCancel,
}) => {
    'use no memo';
    const [form, setForm] = useState<ProfileFormState>(() =>
        initialForm({ ...initialData }),
    );
    const [submitting, setSubmitting] = useState(false);

    const submit = async () => {
        setSubmitting(true);
        try {
            await fetch(`/api/users/${sessionId}-${username}`, {
                method: 'PUT',
                body: JSON.stringify(form),
            });
            onSubmitted?.();
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <>
            <Title>
                <NameAsPatreon name={username} />
            </Title>
            <Form className="row g-3">
                <div className="col col-12 col-lg-6">
                    <fieldset className="border py-3 px-4">
                        <legend className="w-auto mb-0">About</legend>
                        <div className="row g-3">
                            <Form.Group
                                className="col-12 col-md-6 col-lg-12 col-xl-6"
                                controlId="pronouns"
                            >
                                <Form.Label>Pronouns</Form.Label>
                                <Form.Control
                                    maxLength={25}
                                    type="text"
                                    defaultValue={form.pronouns}
                                    placeholder="Enter pronouns"
                                    onChange={(e) =>
                                        setForm({
                                            ...form,
                                            pronouns: e.target.value,
                                        })
                                    }
                                />
                            </Form.Group>
                            <Form.Group
                                className="col-12 col-md-6 col-lg-12 col-xl-6"
                                controlId="alias"
                            >
                                <Form.Label>Also known as</Form.Label>
                                <Form.Control
                                    defaultValue={form.aka}
                                    maxLength={25}
                                    type="text"
                                    placeholder="A.k.a..."
                                    onChange={(e) =>
                                        setForm({
                                            ...form,
                                            aka: e.target.value,
                                        })
                                    }
                                />
                            </Form.Group>
                            <Form.Group
                                className="col-12 col-md-6 col-lg-12 col-xl-6"
                                controlId="country"
                            >
                                <Form.Label>Country</Form.Label>
                                <Form.Control
                                    defaultValue={form.country}
                                    as="select"
                                    type="text"
                                    onChange={(e) =>
                                        setForm({
                                            ...form,
                                            country: e.target.value,
                                        })
                                    }
                                >
                                    <option>Show no country</option>
                                    {Array.from(
                                        Object.entries(countries()),
                                    ).map(([key, value]) => (
                                        <option key={key} value={key}>
                                            {value}
                                        </option>
                                    ))}
                                </Form.Control>
                            </Form.Group>
                            <Form.Group
                                className="col-12 col-md-6 col-lg-12 col-xl-6"
                                controlId="timezone"
                            >
                                <Form.Label>Timezone</Form.Label>
                                <TimezoneSelect
                                    className="timeZoneSelect"
                                    value={form.timezone}
                                    onChange={(e) =>
                                        setForm({ ...form, timezone: e.value })
                                    }
                                />
                            </Form.Group>
                            <Form.Group className="col-12" controlId="bio">
                                <Form.Label>
                                    About (max. 100 characters)
                                </Form.Label>
                                <Form.Control
                                    className="h-180p"
                                    as="textarea"
                                    maxLength={100}
                                    type="textarea"
                                    defaultValue={form.bio}
                                    placeholder="Enter bio"
                                    onChange={(e) =>
                                        setForm({
                                            ...form,
                                            bio: e.target.value,
                                        })
                                    }
                                />
                            </Form.Group>
                        </div>
                    </fieldset>
                </div>
                <div className="col col-12 col-lg-6">
                    <fieldset className="border py-3 px-4 h-100">
                        <legend className="w-auto mb-0">Socials</legend>
                        <div className="row g-3">
                            <Form.Group
                                className="col-12 col-md-6 col-lg-12 col-xl-6"
                                controlId="youtube"
                            >
                                <Form.Label>
                                    Youtube <YoutubeIcon size={24} color="red" />
                                </Form.Label>
                                <Form.Control
                                    maxLength={100}
                                    type="text"
                                    defaultValue={
                                        form.socials?.youtube ?? ''
                                    }
                                    placeholder="youtube.com/..."
                                    onChange={(e) =>
                                        setForm({
                                            ...form,
                                            socials: {
                                                ...form.socials,
                                                youtube: e.target.value,
                                            },
                                        })
                                    }
                                />
                            </Form.Group>
                            <Form.Group
                                className="col-12 col-md-6 col-lg-12 col-xl-6"
                                controlId="twitter"
                            >
                                <Form.Label>
                                    Twitter{' '}
                                    <TwitterIcon size={24} color="#1DA1F2" />
                                </Form.Label>
                                <Form.Control
                                    maxLength={100}
                                    type="text"
                                    defaultValue={
                                        form.socials?.twitter ?? ''
                                    }
                                    placeholder="twitter.com/..."
                                    onChange={(e) =>
                                        setForm({
                                            ...form,
                                            socials: {
                                                ...form.socials,
                                                twitter: e.target.value,
                                            },
                                        })
                                    }
                                />
                            </Form.Group>
                            <Form.Group
                                className="col-12 col-md-6 col-lg-12 col-xl-6"
                                controlId="bluesky"
                            >
                                <Form.Label>
                                    Bluesky <BlueskyIcon />
                                </Form.Label>
                                <Form.Control
                                    maxLength={100}
                                    type="text"
                                    defaultValue={
                                        form.socials?.bluesky ?? ''
                                    }
                                    placeholder="bsky.app/profile/..."
                                    onChange={(e) =>
                                        setForm({
                                            ...form,
                                            socials: {
                                                ...form.socials,
                                                bluesky: e.target.value,
                                            },
                                        })
                                    }
                                />
                            </Form.Group>
                        </div>
                    </fieldset>
                </div>
            </Form>
            <div className="mt-3 d-flex align-items-center">
                <Button
                    className="w-240p"
                    disabled={submitting}
                    onClick={submit}
                >
                    {submitting ? 'Saving...' : 'Update info'}
                </Button>
                {onCancel && (
                    <Button
                        variant="danger"
                        className="ms-3"
                        disabled={submitting}
                        onClick={onCancel}
                    >
                        Cancel
                    </Button>
                )}
            </div>
        </>
    );
};

// Legacy wrapper retained for existing callers (no-runs state, old layout).
export const Userform = ({
    username,
    session,
    userData,
    editInfo = false,
}: any) => {
    'use no memo';
    const [editing, setEditing] = useState<boolean>(editInfo);

    if (editing) {
        return (
            <EditProfileForm
                username={username}
                sessionId={session.id}
                initialData={userData}
                onSubmitted={() => setEditing(false)}
                onCancel={() => setEditing(false)}
            />
        );
    }

    const displayName =
        userData.login &&
        userData.login.toLowerCase() !== username.toLowerCase()
            ? userData.login
            : username;

    return (
        <div>
            <Display
                username={displayName}
                form={{
                    pronouns: userData.pronouns,
                    socials: userData.socials,
                    bio: userData.bio,
                    country: userData.country,
                    aka: userData.aka,
                    timezone: userData.timezone,
                }}
                showTimezone={!!userData.timezone}
            />
            <Can I="edit" this={subject('user', username)}>
                <div className="mt-3 d-flex align-items-center">
                    <Button
                        className="w-240p"
                        onClick={() => setEditing(true)}
                    >
                        Edit info
                    </Button>
                </div>
            </Can>
        </div>
    );
};

const Display = ({ username, form, showTimezone = false }: any) => {
    'use no memo';
    return (
        <div>
            <div className="d-flex column-gap-2 align-items-center">
                <div className="d-flex column-gap-2">
                    <Title>
                        <NameAsPatreon name={username} />
                    </Title>
                    {form.aka && (
                        <span>
                            (<b>{form.aka}</b>)
                        </span>
                    )}
                </div>
                <a
                    href={`https://twitch.tv/${username}`}
                    target="_blank"
                    rel="noreferrer"
                >
                    <TwitchIcon size={24} color="#6441a5" />
                </a>
                {form.socials?.youtube && (
                    <a
                        href={`https://youtube.com/${form.socials.youtube}`}
                        target="_blank"
                        rel="noreferrer"
                    >
                        <YoutubeIcon size={24} color="red" />
                    </a>
                )}
                {form.socials?.twitter && (
                    <a
                        href={`https://twitter.com/${form.socials.twitter}`}
                        target="_blank"
                        rel="noreferrer"
                    >
                        <TwitterIcon size={24} color="#1DA1F2" />
                    </a>
                )}
                {form.socials?.bluesky && (
                    <a
                        href={`https://bsky.app/profile/${form.socials.bluesky}`}
                        target="_blank"
                        rel="noreferrer"
                    >
                        <BlueskyIcon />
                    </a>
                )}
            </div>
            {form.pronouns && <div>{form.pronouns}</div>}
            {!!form.country && hasFlag(form.country) && (
                <div>
                    {countries()[form.country]}&nbsp;{' '}
                    <CountryIcon countryCode={form.country} />
                </div>
            )}
            {showTimezone && form.timezone && <div>{form.timezone}</div>}
            {!!form.bio && (
                <div>
                    <i>{form.bio}</i>
                </div>
            )}
        </div>
    );
};

export const CountryIcon = ({
    countryCode,
}: {
    countryCode: keyof typeof countries;
}) => {
    return (
        <Image
            unoptimized
            className="img-fluid"
            width={24}
            height={16}
            alt={countries()[countryCode]}
            src={`https://raw.githubusercontent.com/hampusborgos/country-flags/main/svg/${(
                countryCode as string
            ).toLowerCase()}.svg`}
        />
    );
};
```

- [ ] **Step 2: Verify typecheck + lint**

Run: `npm run typecheck && npm run lint`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/user/userform.tsx
git commit -m "refactor(user): extract EditProfileForm from Userform for modal reuse"
```

---

## Task 3: Create `EditProfileModal`

**Files:**
- Create: `src/components/user/profile-header/edit-profile-modal.tsx`

- [ ] **Step 1: Create the modal component**

Create `src/components/user/profile-header/edit-profile-modal.tsx`:

```tsx
'use client';

import { useRouter } from 'next/navigation';
import { Modal } from 'react-bootstrap';
import { EditProfileForm } from '~src/components/user/userform';

export interface EditProfileModalProps {
    show: boolean;
    onHide: () => void;
    username: string;
    sessionId: string;
    initialData: any;
}

export const EditProfileModal = ({
    show,
    onHide,
    username,
    sessionId,
    initialData,
}: EditProfileModalProps) => {
    const router = useRouter();

    return (
        <Modal show={show} onHide={onHide} size="lg" centered>
            <Modal.Header closeButton>
                <Modal.Title>Edit profile</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <EditProfileForm
                    username={username}
                    sessionId={sessionId}
                    initialData={initialData}
                    onSubmitted={() => {
                        onHide();
                        router.refresh();
                    }}
                    onCancel={onHide}
                />
            </Modal.Body>
        </Modal>
    );
};
```

- [ ] **Step 2: Verify typecheck**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/user/profile-header/edit-profile-modal.tsx
git commit -m "feat(profile-header): add edit profile modal wrapping EditProfileForm"
```

---

## Task 4: Create `ProfileHeader` SCSS module

**Files:**
- Create: `src/components/user/profile-header/profile-header.module.scss`

- [ ] **Step 1: Write the styles**

Create `src/components/user/profile-header/profile-header.module.scss`:

```scss
@use '../../../../app/(new-layout)/styles/design-tokens' as *;
@use '../../../../app/(new-layout)/styles/mixins' as *;

.container {
    position: relative;
    display: flex;
    align-items: center;
    gap: $spacing-xl;
    padding: $spacing-xl $spacing-2xl;
    border-radius: $radius-lg;
    border: 1px solid var(--profile-header-border, rgba(var(--bs-primary-rgb), 0.22));
    background: var(--profile-header-bg, color-mix(in srgb, var(--bs-body-bg) 82%, var(--bs-primary) 10%));
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
    margin-bottom: $spacing-xl;
    min-height: 180px;
    overflow: hidden;

    @media (max-width: 768px) {
        flex-direction: column;
        align-items: stretch;
        gap: $spacing-lg;
        padding: $spacing-lg;
        min-height: 0;
    }
}

.containerAnimated {
    animation: patronHeaderGradient 8s linear infinite;
}

@keyframes patronHeaderGradient {
    0% { --patron-grad-angle: 0deg; }
    100% { --patron-grad-angle: 360deg; }
}

@property --patron-grad-angle {
    syntax: '<angle>';
    inherits: false;
    initial-value: 135deg;
}

.avatarWrap {
    position: relative;
    flex: 0 0 auto;
    width: 96px;
    height: 96px;
    border-radius: $radius-lg;
    padding: 2px;
    background: var(--profile-header-ring, var(--bs-border-color));
    box-shadow: 0 0 24px -6px var(--profile-header-glow, rgba(var(--bs-primary-rgb), 0.18));

    @media (max-width: 768px) {
        width: 56px;
        height: 56px;
    }
}

.avatarWrapLive {
    --profile-header-ring: var(--bs-danger);
    animation: liveRingPulse 1.4s ease-in-out infinite;
}

@keyframes liveRingPulse {
    0%, 100% { box-shadow: 0 0 0 0 rgba(var(--bs-danger-rgb), 0.5); }
    50% { box-shadow: 0 0 0 6px rgba(var(--bs-danger-rgb), 0); }
}

.avatar {
    width: 100%;
    height: 100%;
    border-radius: calc(#{$radius-lg} - 2px);
    object-fit: cover;
    display: block;
    background: var(--bs-body-bg);
}

.avatarFallback {
    width: 100%;
    height: 100%;
    border-radius: calc(#{$radius-lg} - 2px);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 2.25rem;
    font-weight: 700;
    color: #fff;
    background: var(--profile-header-avatar-fallback, var(--bs-primary));

    @media (max-width: 768px) {
        font-size: 1.35rem;
    }
}

.mobileTopRow {
    display: contents;

    @media (max-width: 768px) {
        display: flex;
        align-items: center;
        gap: $spacing-md;
    }
}

.info {
    flex: 1 1 auto;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: $spacing-xs;
}

.nameRow {
    display: flex;
    align-items: center;
    gap: $spacing-sm;
    flex-wrap: wrap;
}

.name {
    font-size: 2rem;
    font-weight: 700;
    line-height: 1.1;
    letter-spacing: -0.015em;
    margin: 0;

    @media (max-width: 768px) {
        font-size: 1.4rem;
    }
}

.livePill {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    padding: 0.2rem 0.6rem;
    border-radius: 999px;
    background: var(--bs-danger);
    color: #fff;
    font-size: $font-size-2xs;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    text-decoration: none;
    animation: livePillPulse 1.4s ease-in-out infinite;

    &:hover {
        color: #fff;
        filter: brightness(1.08);
    }
}

@keyframes livePillPulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.7; }
}

.liveDot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #fff;
}

.socials {
    display: flex;
    align-items: center;
    gap: $spacing-sm;
    flex-wrap: wrap;

    a {
        display: inline-flex;
        opacity: 0.85;
        transition: opacity $transition-fast;

        &:hover {
            opacity: 1;
        }
    }
}

.meta {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 0.3rem 0.5rem;
    font-size: $font-size-sm;
    opacity: 0.75;
}

.metaDot {
    opacity: 0.5;
}

.metaCountry {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
}

.bio {
    font-style: italic;
    font-size: $font-size-sm;
    opacity: 0.75;
    margin: 0;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    line-height: 1.45;
}

.action {
    flex: 0 0 auto;
    align-self: flex-start;

    @media (max-width: 768px) {
        align-self: stretch;

        button {
            width: 100%;
        }
    }
}
```

- [ ] **Step 2: Verify build picks up the SCSS module**

Run: `npm run typecheck`
Expected: no errors. (SCSS is processed at build time; a dev server start also works.)

- [ ] **Step 3: Commit**

```bash
git add src/components/user/profile-header/profile-header.module.scss
git commit -m "feat(profile-header): add SCSS module for the new profile header"
```

---

## Task 5: Create `ProfileHeader` component

**Files:**
- Create: `src/components/user/profile-header/profile-header.tsx`

- [ ] **Step 1: Write the component**

Create `src/components/user/profile-header/profile-header.tsx`:

```tsx
'use client';

import { hasFlag } from 'country-flag-icons';
import Image from 'next/image';
import Link from 'next/link';
import type { CSSProperties } from 'react';
import { useEffect, useState } from 'react';
import {
    Twitch as TwitchIcon,
    Twitter as TwitterIcon,
    Youtube as YoutubeIcon,
} from 'react-bootstrap-icons';
import type { User as IUser } from 'types/session.types';
import { LiveRun } from '~app/(new-layout)/live/live.types';
import { countries } from '~src/common/countries';
import { Button } from '~src/components/Button/Button';
import {
    buildPatronBackdropStyle,
    neutralBackdropStyle,
} from '~src/components/patreon/patron-backdrop-style';
import { buildPatronStyle } from '~src/components/patreon/patron-style';
import { usePatreons } from '~src/components/patreon/use-patreons';
import { CountryIcon } from '~src/components/user/userform';
import { Can, subject } from '~src/rbac/Can.component';
import { BlueskyIcon } from '~src/icons/bluesky-icon';
import type { UserData } from '~src/lib/get-session-data';
import { getColorMode } from '~src/utils/colormode';
import { safeDecodeURI } from '~src/utils/uri';
import { EditProfileModal } from './edit-profile-modal';
import styles from './profile-header.module.scss';

export interface ProfileHeaderProps {
    username: string;
    userData: UserData & {
        picture?: string;
        bio?: string;
        aka?: string;
        country?: string;
    };
    session: IUser;
    liveRun?: LiveRun;
}

function normalizeSocials(socials: any) {
    const out = { ...(socials ?? {}) };
    if (out.twitter) {
        const split = String(out.twitter).split('.com/');
        out.twitter = split[split.length - 1];
    }
    if (out.youtube) {
        let split = String(out.youtube).split('.com/');
        if (split.length === 1) split = split[0].split('.be/');
        out.youtube = split[split.length - 1];
    }
    return out;
}

export const ProfileHeader = ({
    username,
    userData,
    session,
    liveRun,
}: ProfileHeaderProps) => {
    const [theme, setTheme] = useState<'dark' | 'light'>('dark');
    const [editing, setEditing] = useState(false);

    useEffect(() => {
        setTheme(getColorMode() === 'light' ? 'light' : 'dark');
    }, []);

    const { data: patreons } = usePatreons();
    const patron = patreons?.[username];
    const hidePatronStyle = patron?.preferences?.hide ?? false;

    const backdrop =
        patron && !hidePatronStyle
            ? buildPatronBackdropStyle(
                  patron.preferences,
                  patron.tier,
                  theme,
              )
            : neutralBackdropStyle();

    const nameStyle: CSSProperties =
        patron && !hidePatronStyle
            ? buildPatronStyle(patron.preferences, patron.tier, theme)
            : {};

    const displayName =
        userData.login &&
        userData.login.toLowerCase() !== username.toLowerCase()
            ? userData.login
            : username;

    const socials = normalizeSocials((userData as any).socials);
    const isLive = !!liveRun && !Array.isArray(liveRun);
    const picture = (userData as any).picture as string | undefined;
    const bio = (userData as any).bio as string | undefined;
    const aka = (userData as any).aka as string | undefined;
    const country = (userData as any).country as string | undefined;
    const pronouns = (userData as any).pronouns as string | undefined;

    const containerStyle: CSSProperties = {
        ['--profile-header-bg' as any]: backdrop.background,
        ['--profile-header-border' as any]: backdrop.borderColor,
        ['--profile-header-glow' as any]: backdrop.glowColor,
        ['--profile-header-ring' as any]:
            patron && !hidePatronStyle
                ? backdrop.borderColor
                : 'var(--bs-border-color)',
        ['--profile-header-avatar-fallback' as any]:
            patron && !hidePatronStyle
                ? backdrop.borderColor
                : 'var(--bs-primary)',
    };

    const initial = safeDecodeURI(displayName).charAt(0).toUpperCase();

    return (
        <>
            <div
                className={`${styles.container} ${
                    backdrop.animated ? styles.containerAnimated : ''
                }`}
                style={containerStyle}
            >
                <div className={styles.mobileTopRow}>
                    <div
                        className={`${styles.avatarWrap} ${
                            isLive ? styles.avatarWrapLive : ''
                        }`}
                    >
                        {picture ? (
                            <Image
                                unoptimized
                                src={picture}
                                alt={displayName}
                                width={96}
                                height={96}
                                className={styles.avatar}
                            />
                        ) : (
                            <div className={styles.avatarFallback}>
                                {initial}
                            </div>
                        )}
                    </div>
                    <div className={styles.info}>
                        <div className={styles.nameRow}>
                            <h1 className={styles.name} style={nameStyle}>
                                {safeDecodeURI(displayName)}
                            </h1>
                            {isLive && (
                                <Link
                                    href={`/live/${username}`}
                                    className={styles.livePill}
                                    aria-label={`${displayName} is live on Twitch`}
                                >
                                    <span className={styles.liveDot} />
                                    LIVE
                                </Link>
                            )}
                        </div>
                        <div className={styles.socials}>
                            <a
                                href={`https://twitch.tv/${username}`}
                                target="_blank"
                                rel="noreferrer"
                                aria-label="Twitch"
                            >
                                <TwitchIcon size={20} color="#6441a5" />
                            </a>
                            {socials.youtube && (
                                <a
                                    href={`https://youtube.com/${socials.youtube}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    aria-label="YouTube"
                                >
                                    <YoutubeIcon size={20} color="red" />
                                </a>
                            )}
                            {socials.twitter && (
                                <a
                                    href={`https://twitter.com/${socials.twitter}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    aria-label="Twitter"
                                >
                                    <TwitterIcon size={20} color="#1DA1F2" />
                                </a>
                            )}
                            {socials.bluesky && (
                                <a
                                    href={`https://bsky.app/profile/${socials.bluesky}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    aria-label="Bluesky"
                                >
                                    <BlueskyIcon />
                                </a>
                            )}
                        </div>
                        {(aka || (country && hasFlag(country)) || pronouns) && (
                            <div className={styles.meta}>
                                {aka && (
                                    <span>
                                        aka <b>{aka}</b>
                                    </span>
                                )}
                                {aka && country && hasFlag(country) && (
                                    <span className={styles.metaDot}>·</span>
                                )}
                                {country && hasFlag(country) && (
                                    <span className={styles.metaCountry}>
                                        <CountryIcon
                                            countryCode={country as any}
                                        />
                                        {countries()[country]}
                                    </span>
                                )}
                                {pronouns &&
                                    (aka || (country && hasFlag(country))) && (
                                        <span className={styles.metaDot}>
                                            ·
                                        </span>
                                    )}
                                {pronouns && <span>{pronouns}</span>}
                            </div>
                        )}
                        {bio && <p className={styles.bio}>{bio}</p>}
                    </div>
                </div>
                <Can I="edit" this={subject('user', username)}>
                    <div className={styles.action}>
                        <Button onClick={() => setEditing(true)}>
                            Edit info
                        </Button>
                    </div>
                </Can>
            </div>
            <EditProfileModal
                show={editing}
                onHide={() => setEditing(false)}
                username={username}
                sessionId={session.id}
                initialData={userData}
            />
        </>
    );
};
```

- [ ] **Step 2: Verify typecheck + lint**

Run: `npm run typecheck && npm run lint`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/user/profile-header/profile-header.tsx
git commit -m "feat(profile-header): add ProfileHeader component with patron-themed backdrop"
```

---

## Task 6: Wire `ProfileHeader` into `user-profile.tsx` and move tab controls

**Files:**
- Modify: `app/(new-layout)/[username]/user-profile.tsx`

The current top block:

```tsx
<Row className="mb-3">
    <Col md={12} lg={9}>
        <Userform .../>
    </Col>
    {hasGameTime && (
        <Col ...>
            <GametimeForm .../>
        </Col>
    )}
</Row>
{allRunsRunMap.size > 1 && (
    <Row>
        <Col md={8} />
        <Col xs={12} md={4} ...>
            <select ...>{/* game filter */}</select>
        </Col>
    </Row>
)}
<Tabs activeKey={activeTab} ...>
```

becomes:

```tsx
<ProfileHeader
    username={username}
    userData={userData as any}
    session={session}
    liveRun={liveRun}
/>
<div className={styles.tabControlsRow}>
    <Tabs activeKey={activeTab} ...>
        {/* ...tabs... */}
    </Tabs>
    {(activeTab === 'overview' || activeTab === 'sessions') && (
        <div className={styles.tabControls}>
            {hasGameTime && (
                <GametimeForm
                    useGameTime={useGameTime}
                    setUseGameTime={setUseGameTime}
                />
            )}
            {allRunsRunMap.size > 1 && (
                <select ...>{/* game filter */}</select>
            )}
        </div>
    )}
</div>
```

Because `Tabs` manages its own strip layout, the cleanest approach is to wrap the existing `<Tabs>` in a `div` with `position: relative`, and absolutely-position the controls to the right of the tab strip on desktop. On mobile they stack under the tabs. Use existing `User.module.scss` (already imported as `styles`) to add new classes.

- [ ] **Step 1: Update `user-profile.tsx`**

Replace the top of the `UserProfile` JSX (lines ~106–171 of today's file) and the opening `<Tabs>` with:

```tsx
return (
    <>
        <ProfileHeader
            username={username}
            userData={userData as any}
            session={session}
            liveRun={liveRun}
        />
        <div className={styles.tabsWrap}>
            <Tabs
                activeKey={activeTab}
                onSelect={(key) => setActiveTab(key ?? 'overview')}
                className="position-relative z-1 mb-3 pt-0 w-100 mw-md-66"
            >
                <Tab eventKey="overview" title="Overview">
                    {/* ...existing overview body... */}
                </Tab>
                <Tab title="Activity" eventKey="stats">
                    {/* ...existing... */}
                </Tab>
                <Tab title="Sessions" eventKey="sessions">
                    {/* ...existing... */}
                </Tab>
                <Tab title="Downloads" eventKey="downloads">
                    {/* ...existing... */}
                </Tab>
                <Tab title="Twitch stream" eventKey="stream">
                    {/* ...existing... */}
                </Tab>
            </Tabs>
            {(activeTab === 'overview' || activeTab === 'sessions') &&
                (hasGameTime || allRunsRunMap.size > 1) && (
                    <div className={styles.tabControls}>
                        {hasGameTime && (
                            <GametimeForm
                                useGameTime={useGameTime}
                                setUseGameTime={setUseGameTime}
                            />
                        )}
                        {allRunsRunMap.size > 1 && (
                            <select
                                className={`form-select ${styles.gameFilter}`}
                                onChange={(e) => {
                                    setCurrentGame(
                                        e.target.value.split('#')[0],
                                    );
                                }}
                            >
                                <option
                                    key="all-games"
                                    title="All Games"
                                    value="all-games"
                                >
                                    No Game Filter
                                </option>
                                {Array.from(allRunsRunMap.keys())
                                    .filter(
                                        (game: string, i, arr: string[]) => {
                                            if (i === 0) return true;
                                            const previous = arr[i - 1];
                                            return (
                                                game.split('#')[0] !==
                                                previous.split('#')[0]
                                            );
                                        },
                                    )
                                    .map((game: string) => (
                                        <option key={game} value={game}>
                                            {game.split('#')[0]}
                                        </option>
                                    ))}
                            </select>
                        )}
                    </div>
                )}
        </div>
    </>
);
```

Add imports at the top of the file:

```tsx
import { ProfileHeader } from '~src/components/user/profile-header/profile-header';
```

Remove the now-unused `Userform` import.

Also handle the `NoRuns` branch — replace it with:

```tsx
const NoRuns = (
    username: string,
    session: User,
    userData: UserData,
    liveRun: LiveRun | undefined,
) => {
    return (
        <>
            <ProfileHeader
                username={username}
                userData={userData as any}
                session={session}
                liveRun={liveRun}
            />
            <div className={styles.noRuns}>
                Unfortunately, {username} has not uploaded runs yet, or their
                upload has not yet been processed (should not take long). If
                the user has uploaded runs, but this page still shows, please{' '}
                <Link href="/contact">contact me!</Link>
            </div>
        </>
    );
};
```

Update the call site `if (runs.length === 0) return NoRuns(username, session, userData);` to pass `liveRun` too.

- [ ] **Step 2: Add the new tab-controls styles to `src/components/css/User.module.scss`**

Append to `src/components/css/User.module.scss`:

```scss
.tabsWrap {
    position: relative;
}

.tabControls {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 1rem;

    @media (min-width: 992px) {
        position: absolute;
        top: 0;
        right: 0;
        margin-bottom: 0;
    }
}
```

(Leave the existing `.gameFilter`, `.noRuns`, `.liveSection`, etc. classes alone.)

- [ ] **Step 3: Verify typecheck + lint**

Run: `npm run typecheck && npm run lint`
Expected: no errors.

- [ ] **Step 4: Manual browser smoke test**

Run: `npm run dev`

Visit these URLs locally and confirm:
- `/<a-non-patron-user>` — neutral backdrop, avatar, name, socials, meta, bio, edit button (when logged in as that user). Edit button opens modal; submit refreshes.
- `/<a-patron-with-solid-color>` — tinted backdrop in their color, name styled in their color, avatar ring matches.
- `/<a-patron-with-animated-gradient>` — backdrop gradient slowly animates, name gradient animates.
- `/<user-currently-live>` — pulsing LIVE pill + red pulsing avatar ring. Click navigates to `/live/<user>`.
- On mobile width: avatar + name inline, rest stacked, edit button full width.
- Overview and Sessions tabs show the gametime toggle / game filter in the top-right of the tab strip (desktop) or stacked under (mobile); other tabs hide them.

- [ ] **Step 5: Commit**

```bash
git add app/\(new-layout\)/\[username\]/user-profile.tsx src/components/css/User.module.scss
git commit -m "feat(profile): adopt ProfileHeader and move tab controls out of header"
```

---

## Task 7: Post-implementation cleanup

**Files:**
- Delete build cache
- Verify final state

- [ ] **Step 1: Clear Next build cache**

Run: `rm -rf .next`

- [ ] **Step 2: Run full verification**

Run: `npm run typecheck && npm run lint`
Expected: both pass with no errors.

- [ ] **Step 3: Run a production build to catch SCSS / compile issues**

Run: `npm run build`
Expected: completes successfully.

- [ ] **Step 4: Confirm the old inline edit flow from `Userform` still works**

Visit any page that still uses the `Userform` component (e.g., the `NoRuns` branch — already uses `ProfileHeader` after Task 6, so this is a sanity check for any other callers). Run:

```bash
grep -rn "Userform\b" app src --include="*.tsx" --include="*.ts"
```

Any remaining caller should still work because `Userform` delegates to `EditProfileForm` on edit. No action required unless a broken call site is found.

- [ ] **Step 5: Final commit (if anything was fixed above)**

If Step 4 surfaced a fix, commit it with a descriptive message. Otherwise skip.

---

## Acceptance criteria (from spec)

1. [ ] Visiting any user profile shows the new header styled in the new-layout design language.
2. [ ] For a non-patron user, the header uses the neutral-theme-accent backdrop.
3. [ ] For a patron with a solid color, the backdrop is a soft diagonal wash of that color with a matching avatar ring + glow.
4. [ ] For a patron with a gradient (animated or not), the backdrop uses that gradient at reduced opacity; the name itself uses the full-strength gradient.
5. [ ] Live state shows a pulsing LIVE pill linking to `/live/<username>`; avatar ring turns red and pulses.
6. [ ] "Edit info" (gated by `<Can I="edit">`) opens a modal with the existing form; submit persists and refreshes the page.
7. [ ] Gametime toggle and game filter appear in the tab-strip area on Overview and Sessions tabs only.
8. [ ] Mobile layout inlines avatar + name, stacks the rest, edit button full-width at bottom.
9. [ ] Header height sits in ~180–200px on desktop.
10. [ ] No-runs state renders the new header followed by the "not uploaded runs yet" message.
