# Team Races Frontend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add team race support to the frontend — types, server actions, race creation form, team lobby UI, team-grouped standings/participant views, team results display, and chat messages for team events.

**Architecture:** Extends existing race UI. Team state lives on the `Race` object (`teams`, `teamResults`). Server actions call the backend team endpoints. The race lobby conditionally renders a team-based view when `race.isTeamRace`. Existing components (participant overview, participant detail, race actions) are conditionally enhanced to show team groupings.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, react-bootstrap, SCSS modules

**Spec:** `docs/superpowers/specs/2026-03-24-team-races-design.md` and backend `docs/team-races-frontend-guide.md`

---

### Task 1: Add team race types

**Files:**
- Modify: `app/(new-layout)/races/races.types.ts`

- [ ] **Step 1: Add RaceTeam and TeamResult interfaces**

After the `RaceResult` interface (line 70), add:

```typescript
export interface RaceTeam {
    name: string;
    color: string;
    captain: string;
    members: string[];
    pendingRequests: string[];
}

export interface TeamResult {
    name: string;
    color: string;
    position: number | null;
    time: number | null;
    disqualified: boolean;
    members: Array<{ user: string; finalTime: number | null }>;
}

export type TeamResultMethod = 'average' | 'sum';
```

- [ ] **Step 2: Extend Race interface**

Add these fields to the `Race` interface (after `willStartAt` at line 60):

```typescript
    isTeamRace?: boolean;
    teamMinSize?: number;
    teamMaxSize?: number;
    teamResultMethod?: TeamResultMethod;
    teams?: RaceTeam[];
    teamResults?: TeamResult[];
```

- [ ] **Step 3: Extend CreateRaceInput interface**

Add to `CreateRaceInput` (after `startTime` at line 146):

```typescript
    isTeamRace?: boolean;
    teamMinSize?: number;
    teamMaxSize?: number;
    teamResultMethod?: TeamResultMethod;
```

- [ ] **Step 4: Add RaceMessageTeamData interface**

After `RaceMessageModeratorData` (line 253):

```typescript
export interface RaceMessageTeamData extends RaceMessageData {
    user: string;
    teamName: string;
}
```

- [ ] **Step 5: Add team message types to RaceMessageType**

Add to the `RaceMessageType` union (after `| 'chat'`):

```typescript
    | 'team-created'
    | 'team-join-request'
    | 'team-member-approved'
    | 'team-member-denied'
    | 'team-member-kicked'
    | 'team-member-left'
    | 'team-deleted'
    | 'team-captain-changed'
```

- [ ] **Step 6: Commit**

```bash
git add app/(new-layout)/races/races.types.ts
git commit -m "feat(races): add team race types and interfaces"
```

---

### Task 2: Add team server actions

**Files:**
- Create: `app/(new-layout)/races/actions/team-actions.ts`

All team operations go through a single server action file since they follow the same pattern: authenticate, call backend endpoint, return race or error.

- [ ] **Step 1: Create team-actions.ts**

```typescript
'use server';

import { revalidatePath } from 'next/cache';
import { getSession } from '~src/actions/session.action';

const racesApiUrl = process.env.NEXT_PUBLIC_RACE_API_URL as string;

interface TeamActionResult {
    error?: string;
}

async function teamFetch(
    url: string,
    method: string,
    body?: Record<string, unknown>,
): Promise<TeamActionResult> {
    const session = await getSession();
    if (!session.id) {
        return { error: 'Not authenticated' };
    }

    const result = await fetch(url, {
        method,
        headers: {
            Authorization: `Bearer ${session.id}`,
            'Content-Type': 'application/json',
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
    });

    if (result.status !== 200) {
        const response = await result.json().catch(() => ({}));
        return { error: response.error || 'An error occurred' };
    }

    return {};
}

export async function createTeamAction(
    _prevState: TeamActionResult,
    formData: FormData,
): Promise<TeamActionResult> {
    const raceId = formData.get('raceId') as string;
    const name = formData.get('teamName') as string;
    const color = formData.get('teamColor') as string;
    const password = formData.get('password') as string;

    const result = await teamFetch(
        `${racesApiUrl}/${raceId}/teams`,
        'POST',
        { name, color, ...(password ? { password } : {}) },
    );

    if (!result.error) {
        revalidatePath(`/races/${raceId}`);
    }

    return result;
}

export async function requestJoinTeamAction(
    formData: FormData,
): Promise<TeamActionResult> {
    const raceId = formData.get('raceId') as string;
    const teamIndex = formData.get('teamIndex') as string;
    const password = formData.get('password') as string;

    const result = await teamFetch(
        `${racesApiUrl}/${raceId}/teams/${teamIndex}/join`,
        'POST',
        password ? { password } : {},
    );

    if (!result.error) {
        revalidatePath(`/races/${raceId}`);
    }

    return result;
}

export async function approveJoinAction(
    formData: FormData,
): Promise<TeamActionResult> {
    const raceId = formData.get('raceId') as string;
    const teamIndex = formData.get('teamIndex') as string;
    const username = formData.get('username') as string;
    const password = formData.get('password') as string;

    const result = await teamFetch(
        `${racesApiUrl}/${raceId}/teams/${teamIndex}/approve/${username}`,
        'POST',
        password ? { password } : {},
    );

    if (!result.error) {
        revalidatePath(`/races/${raceId}`);
    }

    return result;
}

export async function denyJoinAction(
    formData: FormData,
): Promise<TeamActionResult> {
    const raceId = formData.get('raceId') as string;
    const teamIndex = formData.get('teamIndex') as string;
    const username = formData.get('username') as string;

    const result = await teamFetch(
        `${racesApiUrl}/${raceId}/teams/${teamIndex}/deny/${username}`,
        'POST',
    );

    if (!result.error) {
        revalidatePath(`/races/${raceId}`);
    }

    return result;
}

export async function leaveTeamAction(
    formData: FormData,
): Promise<TeamActionResult> {
    const raceId = formData.get('raceId') as string;
    const teamIndex = formData.get('teamIndex') as string;

    const result = await teamFetch(
        `${racesApiUrl}/${raceId}/teams/${teamIndex}/leave`,
        'DELETE',
    );

    if (!result.error) {
        revalidatePath(`/races/${raceId}`);
    }

    return result;
}

export async function kickTeamMemberAction(
    formData: FormData,
): Promise<TeamActionResult> {
    const raceId = formData.get('raceId') as string;
    const teamIndex = formData.get('teamIndex') as string;
    const username = formData.get('username') as string;

    const result = await teamFetch(
        `${racesApiUrl}/${raceId}/teams/${teamIndex}/kick/${username}`,
        'POST',
    );

    if (!result.error) {
        revalidatePath(`/races/${raceId}`);
    }

    return result;
}

export async function deleteTeamAction(
    formData: FormData,
): Promise<TeamActionResult> {
    const raceId = formData.get('raceId') as string;
    const teamIndex = formData.get('teamIndex') as string;

    const result = await teamFetch(
        `${racesApiUrl}/${raceId}/teams/${teamIndex}`,
        'DELETE',
    );

    if (!result.error) {
        revalidatePath(`/races/${raceId}`);
    }

    return result;
}
```

- [ ] **Step 2: Commit**

```bash
git add app/(new-layout)/races/actions/team-actions.ts
git commit -m "feat(races): add server actions for team operations"
```

---

### Task 3: Update race creation form for team races

**Files:**
- Modify: `app/(new-layout)/races/create/create-race.tsx`
- Modify: `app/(new-layout)/races/actions/create-race.action.ts`

- [ ] **Step 1: Update CreateRaceInput validation in create-race.action.ts**

Add team race fields to the Joi schema (after `startTime` validation at line 96):

```typescript
        isTeamRace: Joi.boolean().optional(),
        teamMinSize: Joi.number().min(2).max(100).when('isTeamRace', {
            is: true,
            then: Joi.required(),
            otherwise: Joi.forbidden(),
        }),
        teamMaxSize: Joi.number()
            .min(Joi.ref('teamMinSize'))
            .max(100)
            .when('isTeamRace', {
                is: true,
                then: Joi.required(),
                otherwise: Joi.forbidden(),
            }),
        teamResultMethod: Joi.string()
            .valid('average', 'sum')
            .when('isTeamRace', {
                is: true,
                then: Joi.required(),
                otherwise: Joi.forbidden(),
            }),
```

- [ ] **Step 2: Parse team fields from FormData in create-race.action.ts**

In the `createRace` function, after parsing `startTime` (line 30), add:

```typescript
        ...(raceInput.get('isTeamRace')
            ? {
                  isTeamRace: true,
                  teamMinSize: Number(raceInput.get('teamMinSize')),
                  teamMaxSize: Number(raceInput.get('teamMaxSize')),
                  teamResultMethod: raceInput.get('teamResultMethod') as
                      | 'average'
                      | 'sum',
              }
            : {}),
```

Also import `TeamResultMethod` from the types at the top if needed.

- [ ] **Step 3: Update the form component in create-race.tsx**

Add a state variable for team race toggle:

```typescript
const [isTeamRace, setIsTeamRace] = useState(false);
```

Add team race options inside the `Accordion.Body`, after the "Start Condition" section (after the `</div>` closing the startMethod radio group at ~line 223) and before the ranked/selfJoin checkboxes:

```tsx
<div className="g-3 mb-3">
    <Form.Group controlId="isTeamRace">
        <Form.Check
            name="isTeamRace"
            type="checkbox"
            label="Team Race"
            checked={isTeamRace}
            onChange={(e) => {
                setIsTeamRace(
                    e.target.checked,
                );
            }}
        />
    </Form.Group>
</div>
{isTeamRace && (
    <div className="row g-3 mb-3">
        <Col md={4}>
            <Form.Group controlId="teamMinSize">
                <Form.Label>
                    Min Team Size
                </Form.Label>
                <Form.Control
                    name="teamMinSize"
                    type="number"
                    min={2}
                    max={100}
                    defaultValue={2}
                    required
                />
            </Form.Group>
        </Col>
        <Col md={4}>
            <Form.Group controlId="teamMaxSize">
                <Form.Label>
                    Max Team Size
                </Form.Label>
                <Form.Control
                    name="teamMaxSize"
                    type="number"
                    min={2}
                    max={100}
                    defaultValue={4}
                    required
                />
            </Form.Group>
        </Col>
        <Col md={4}>
            <Form.Group controlId="teamResultMethod">
                <Form.Label>
                    Result Method
                </Form.Label>
                <Form.Select
                    name="teamResultMethod"
                    defaultValue="average"
                    required
                >
                    <option value="average">
                        Average
                    </option>
                    <option value="sum">
                        Sum
                    </option>
                </Form.Select>
            </Form.Group>
        </Col>
    </div>
)}
```

When `isTeamRace` is checked, hide the selfJoin checkbox (or force it off). Wrap the selfJoin `Form.Group` with:

```tsx
{!isTeamRace && (
    <Form.Group controlId="selfJoin">
        ...existing selfJoin checkbox...
    </Form.Group>
)}
```

- [ ] **Step 4: Commit**

```bash
git add app/(new-layout)/races/create/create-race.tsx app/(new-layout)/races/actions/create-race.action.ts
git commit -m "feat(races): add team race options to race creation form"
```

---

### Task 4: Create team lobby component

**Files:**
- Create: `app/(new-layout)/races/[race]/teams/team-lobby.tsx`
- Create: `app/(new-layout)/races/[race]/teams/team-lobby.module.scss`
- Create: `app/(new-layout)/races/[race]/teams/create-team-form.tsx`
- Create: `app/(new-layout)/races/[race]/teams/team-card.tsx`

This is the main team-based view shown in the race lobby when `race.isTeamRace && race.status === 'pending'`. It replaces the flat participant list with team cards.

- [ ] **Step 1: Create team-lobby.module.scss**

```scss
@use '../../../../styles/design-tokens' as *;

.teamLobby {
    display: flex;
    flex-direction: column;
    gap: $spacing-md;
    margin-bottom: $spacing-lg;
}

.teamCard {
    border: 2px solid var(--team-color, rgba(var(--bs-primary-rgb), 0.15));
    border-radius: $radius-lg;
    padding: $spacing-md $spacing-lg;
    background: linear-gradient(
        135deg,
        color-mix(in srgb, var(--bs-body-bg) 92%, var(--team-color, var(--bs-primary)) 8%) 0%,
        color-mix(in srgb, var(--bs-body-bg) 96%, var(--team-color, var(--bs-primary)) 4%) 100%
    );
}

.teamHeader {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: $spacing-sm;
}

.teamName {
    font-size: $font-size-md;
    font-weight: $heading-font-weight;
}

.teamColorDot {
    display: inline-block;
    width: 12px;
    height: 12px;
    border-radius: 50%;
    margin-right: $spacing-sm;
}

.teamCapacity {
    font-size: $font-size-xs;
    color: var(--bs-secondary-color);
}

.memberList {
    list-style: none;
    padding: 0;
    margin: 0 0 $spacing-sm;
}

.memberItem {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: $spacing-xs 0;
    font-size: $font-size-sm;
}

.captainBadge {
    font-size: $font-size-xs;
    color: $accent-amber;
    margin-left: $spacing-xs;
}

.pendingSection {
    border-top: 1px solid rgba(var(--bs-primary-rgb), 0.1);
    padding-top: $spacing-sm;
    margin-top: $spacing-xs;
}

.pendingLabel {
    font-size: $font-size-xs;
    color: var(--bs-secondary-color);
    text-transform: uppercase;
    letter-spacing: 0.04em;
    margin-bottom: $spacing-xs;
}

.pendingItem {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: $spacing-xs 0;
    font-size: $font-size-sm;
}

.pendingActions {
    display: flex;
    gap: $spacing-xs;
}

.teamActions {
    display: flex;
    gap: $spacing-sm;
    margin-top: $spacing-sm;
}

.startGateWarning {
    font-size: $font-size-sm;
    color: $accent-amber;
    padding: $spacing-sm $spacing-md;
    border: 1px solid rgba($accent-amber, 0.3);
    border-radius: $radius-md;
    background: rgba($accent-amber, 0.05);
}

.createTeamSection {
    border: 2px dashed rgba(var(--bs-primary-rgb), 0.2);
    border-radius: $radius-lg;
    padding: $spacing-md $spacing-lg;
    display: flex;
    flex-direction: column;
    gap: $spacing-sm;
}
```

- [ ] **Step 2: Create create-team-form.tsx**

```tsx
'use client';

import { useActionState, useState } from 'react';
import { Form } from 'react-bootstrap';
import { createTeamAction } from '~app/(new-layout)/races/actions/team-actions';
import { Race } from '~app/(new-layout)/races/races.types';
import { SubmitButton } from '~src/components/Button/SubmitButton';
import styles from './team-lobby.module.scss';

const TEAM_COLORS = [
    '#ef4444', '#f97316', '#f59e0b', '#22c55e',
    '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899',
];

export const CreateTeamForm = ({ race }: { race: Race }) => {
    const [state, formAction] = useActionState(createTeamAction, {});
    const [selectedColor, setSelectedColor] = useState(TEAM_COLORS[0]);

    return (
        <div className={styles.createTeamSection}>
            <span className="fw-bold">Create a Team</span>
            {state?.error && (
                <span style={{ color: 'red' }}>{state.error}</span>
            )}
            <Form action={formAction}>
                <input hidden name="raceId" value={race.raceId} readOnly />
                <input hidden name="teamColor" value={selectedColor} readOnly />
                <div className="d-flex gap-2 mb-2">
                    <Form.Control
                        name="teamName"
                        type="text"
                        placeholder="Team name"
                        maxLength={30}
                        required
                    />
                </div>
                <div className="d-flex gap-1 mb-2 align-items-center">
                    <span className="me-1" style={{ fontSize: '0.8rem' }}>
                        Color:
                    </span>
                    {TEAM_COLORS.map((color) => (
                        <button
                            key={color}
                            type="button"
                            onClick={() => setSelectedColor(color)}
                            style={{
                                width: 24,
                                height: 24,
                                borderRadius: '50%',
                                backgroundColor: color,
                                border:
                                    selectedColor === color
                                        ? '2px solid white'
                                        : '2px solid transparent',
                                cursor: 'pointer',
                                outline:
                                    selectedColor === color
                                        ? `2px solid ${color}`
                                        : 'none',
                            }}
                        />
                    ))}
                </div>
                {race.requiresPassword && (
                    <Form.Control
                        name="password"
                        type="password"
                        placeholder="Race password"
                        className="mb-2"
                    />
                )}
                <SubmitButton
                    innerText="Create Team"
                    pendingText="Creating..."
                    className="w-100"
                />
            </Form>
        </div>
    );
};
```

- [ ] **Step 3: Create team-card.tsx**

```tsx
'use client';

import { Form } from 'react-bootstrap';
import {
    approveJoinAction,
    denyJoinAction,
    deleteTeamAction,
    kickTeamMemberAction,
    leaveTeamAction,
    requestJoinTeamAction,
} from '~app/(new-layout)/races/actions/team-actions';
import { Race, RaceTeam } from '~app/(new-layout)/races/races.types';
import { Button } from '~src/components/Button/Button';
import { SubmitButton } from '~src/components/Button/SubmitButton';
import { UserLink } from '~src/components/links/links';
import { DurationToFormatted } from '~src/components/util/datetime';
import { User } from '../../../../../types/session.types';
import styles from './team-lobby.module.scss';

interface TeamCardProps {
    team: RaceTeam;
    teamIndex: number;
    race: Race;
    user?: User;
    userTeamName: string | null;
    userIsPending: boolean;
    isModerator: boolean;
}

export const TeamCard = ({
    team,
    teamIndex,
    race,
    user,
    userTeamName,
    userIsPending,
    isModerator,
}: TeamCardProps) => {
    const username = user?.username;
    const isOnThisTeam = username
        ? team.members.includes(username)
        : false;
    const isCaptain = username === team.captain;
    const canApprove = isCaptain || isModerator;
    const canJoin =
        !userTeamName &&
        !userIsPending &&
        team.members.length < (race.teamMaxSize ?? Infinity);
    const isFull = team.members.length >= (race.teamMaxSize ?? Infinity);

    const participants = race.participants ?? [];

    return (
        <div
            className={styles.teamCard}
            style={
                { '--team-color': team.color } as React.CSSProperties
            }
        >
            <div className={styles.teamHeader}>
                <span className={styles.teamName}>
                    <span
                        className={styles.teamColorDot}
                        style={{ backgroundColor: team.color }}
                    />
                    {team.name}
                </span>
                <span className={styles.teamCapacity}>
                    {team.members.length}/{race.teamMaxSize ?? '?'}
                </span>
            </div>

            <ul className={styles.memberList}>
                {team.members.map((member) => {
                    const participant = participants.find(
                        (p) => p.user === member,
                    );
                    return (
                        <li key={member} className={styles.memberItem}>
                            <span>
                                <UserLink
                                    username={member}
                                    url={`/${member}/races`}
                                />
                                {member === team.captain && (
                                    <span className={styles.captainBadge}>
                                        Captain
                                    </span>
                                )}
                            </span>
                            <span className="d-flex align-items-center gap-2">
                                {participant?.pb && (
                                    <span
                                        style={{ fontSize: '0.8rem' }}
                                        className="text-secondary"
                                    >
                                        PB:{' '}
                                        <DurationToFormatted
                                            duration={participant.pb}
                                        />
                                    </span>
                                )}
                                {isModerator &&
                                    race.status === 'pending' &&
                                    member !== username && (
                                        <KickButton
                                            raceId={race.raceId}
                                            teamIndex={teamIndex}
                                            username={member}
                                        />
                                    )}
                            </span>
                        </li>
                    );
                })}
            </ul>

            {team.pendingRequests.length > 0 && canApprove && (
                <div className={styles.pendingSection}>
                    <div className={styles.pendingLabel}>
                        Pending Requests
                    </div>
                    {team.pendingRequests.map((reqUser) => (
                        <div key={reqUser} className={styles.pendingItem}>
                            <UserLink
                                username={reqUser}
                                url={`/${reqUser}/races`}
                            />
                            <div className={styles.pendingActions}>
                                <ApproveButton
                                    raceId={race.raceId}
                                    teamIndex={teamIndex}
                                    username={reqUser}
                                    password={
                                        race.requiresPassword
                                            ? undefined
                                            : undefined
                                    }
                                />
                                <DenyButton
                                    raceId={race.raceId}
                                    teamIndex={teamIndex}
                                    username={reqUser}
                                />
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <div className={styles.teamActions}>
                {isOnThisTeam && race.status === 'pending' && (
                    <LeaveButton
                        raceId={race.raceId}
                        teamIndex={teamIndex}
                    />
                )}
                {username && canJoin && !isFull && race.status === 'pending' && (
                    <JoinButton
                        raceId={race.raceId}
                        teamIndex={teamIndex}
                        requiresPassword={!!race.requiresPassword}
                    />
                )}
                {isFull && !isOnThisTeam && (
                    <span
                        className="text-secondary"
                        style={{ fontSize: '0.8rem' }}
                    >
                        Team is full
                    </span>
                )}
                {isModerator && race.status === 'pending' && (
                    <DeleteTeamButton
                        raceId={race.raceId}
                        teamIndex={teamIndex}
                    />
                )}
            </div>
        </div>
    );
};

const JoinButton = ({
    raceId,
    teamIndex,
    requiresPassword,
}: {
    raceId: string;
    teamIndex: number;
    requiresPassword: boolean;
}) => (
    <Form action={requestJoinTeamAction}>
        <input hidden name="raceId" value={raceId} readOnly />
        <input
            hidden
            name="teamIndex"
            value={teamIndex.toString()}
            readOnly
        />
        {requiresPassword && (
            <Form.Control
                name="password"
                type="password"
                placeholder="Password"
                size="sm"
                className="mb-1"
            />
        )}
        <SubmitButton
            innerText="Request to Join"
            pendingText="Requesting..."
            variant="outline-primary"
            size="sm"
        />
    </Form>
);

const LeaveButton = ({
    raceId,
    teamIndex,
}: {
    raceId: string;
    teamIndex: number;
}) => (
    <Form action={leaveTeamAction}>
        <input hidden name="raceId" value={raceId} readOnly />
        <input
            hidden
            name="teamIndex"
            value={teamIndex.toString()}
            readOnly
        />
        <SubmitButton
            innerText="Leave Team"
            pendingText="Leaving..."
            variant="outline-danger"
            size="sm"
        />
    </Form>
);

const ApproveButton = ({
    raceId,
    teamIndex,
    username,
    password,
}: {
    raceId: string;
    teamIndex: number;
    username: string;
    password?: string;
}) => (
    <Form action={approveJoinAction}>
        <input hidden name="raceId" value={raceId} readOnly />
        <input
            hidden
            name="teamIndex"
            value={teamIndex.toString()}
            readOnly
        />
        <input hidden name="username" value={username} readOnly />
        {password && (
            <input hidden name="password" value={password} readOnly />
        )}
        <SubmitButton
            innerText="Approve"
            pendingText="..."
            variant="outline-success"
            size="sm"
        />
    </Form>
);

const DenyButton = ({
    raceId,
    teamIndex,
    username,
}: {
    raceId: string;
    teamIndex: number;
    username: string;
}) => (
    <Form action={denyJoinAction}>
        <input hidden name="raceId" value={raceId} readOnly />
        <input
            hidden
            name="teamIndex"
            value={teamIndex.toString()}
            readOnly
        />
        <input hidden name="username" value={username} readOnly />
        <SubmitButton
            innerText="Deny"
            pendingText="..."
            variant="outline-danger"
            size="sm"
        />
    </Form>
);

const KickButton = ({
    raceId,
    teamIndex,
    username,
}: {
    raceId: string;
    teamIndex: number;
    username: string;
}) => (
    <Form action={kickTeamMemberAction} className="d-inline">
        <input hidden name="raceId" value={raceId} readOnly />
        <input
            hidden
            name="teamIndex"
            value={teamIndex.toString()}
            readOnly
        />
        <input hidden name="username" value={username} readOnly />
        <Button type="submit" variant="outline-danger" size="sm">
            Kick
        </Button>
    </Form>
);

const DeleteTeamButton = ({
    raceId,
    teamIndex,
}: {
    raceId: string;
    teamIndex: number;
}) => (
    <Form action={deleteTeamAction}>
        <input hidden name="raceId" value={raceId} readOnly />
        <input
            hidden
            name="teamIndex"
            value={teamIndex.toString()}
            readOnly
        />
        <SubmitButton
            innerText="Delete Team"
            pendingText="Deleting..."
            variant="outline-danger"
            size="sm"
        />
    </Form>
);
```

- [ ] **Step 4: Create team-lobby.tsx**

```tsx
'use client';

import { Race } from '~app/(new-layout)/races/races.types';
import { isRaceModerator } from '~src/rbac/confirm-permission';
import { User } from '../../../../../types/session.types';
import { CreateTeamForm } from './create-team-form';
import { TeamCard } from './team-card';
import styles from './team-lobby.module.scss';

interface TeamLobbyProps {
    race: Race;
    user?: User;
}

export const TeamLobby = ({ race, user }: TeamLobbyProps) => {
    const teams = race.teams ?? [];
    const username = user?.username;
    const isModerator = user ? isRaceModerator(race, user) : false;

    const userTeamName = username
        ? (teams.find((t) => t.members.includes(username))?.name ?? null)
        : null;

    const userIsPending = username
        ? teams.some((t) => t.pendingRequests.includes(username))
        : false;

    const teamsNotMeetingMin = teams.filter(
        (t) => t.members.length < (race.teamMinSize ?? 0),
    );

    return (
        <div className={styles.teamLobby}>
            {teams.map((team, index) => (
                <TeamCard
                    key={team.name}
                    team={team}
                    teamIndex={index}
                    race={race}
                    user={user}
                    userTeamName={userTeamName}
                    userIsPending={userIsPending}
                    isModerator={isModerator}
                />
            ))}

            {username && !userTeamName && !userIsPending && race.status === 'pending' && (
                <CreateTeamForm race={race} />
            )}

            {userIsPending && (
                <div className={styles.startGateWarning}>
                    Your join request is pending approval.
                </div>
            )}

            {teamsNotMeetingMin.length > 0 && (
                <div className={styles.startGateWarning}>
                    All teams need at least {race.teamMinSize} members to
                    start. Teams not meeting minimum:{' '}
                    {teamsNotMeetingMin.map((t) => t.name).join(', ')}
                </div>
            )}
        </div>
    );
};
```

- [ ] **Step 5: Commit**

```bash
git add app/(new-layout)/races/[race]/teams/
git commit -m "feat(races): add team lobby UI components"
```

---

### Task 5: Integrate team lobby into race view

**Files:**
- Modify: `app/(new-layout)/races/[race]/race-view.tsx`
- Modify: `app/(new-layout)/races/[race]/race-actions.tsx`
- Modify: `app/(new-layout)/races/[race]/race-start-condition-information.tsx`

- [ ] **Step 1: Update race-view.tsx to show TeamLobby**

Import `TeamLobby` at the top:

```typescript
import { TeamLobby } from '~app/(new-layout)/races/[race]/teams/team-lobby';
```

In the JSX, before the `<RaceParticipantDetail>` section (the `<div className="pb-4">` at line 98), add a conditional for team races during pending:

```tsx
{raceState.isTeamRace && raceState.status === 'pending' && (
    <TeamLobby race={raceState} user={user} />
)}
```

Also add it in the mobile layout (the `<div className="d-lg-none">` section) before `<RaceParticipantOverview>`:

```tsx
{raceState.isTeamRace && raceState.status === 'pending' && (
    <TeamLobby race={raceState} user={user} />
)}
```

- [ ] **Step 2: Update race-actions.tsx for team races**

In the `RaceActions` component, the join/leave buttons should be hidden for team races since joining/leaving is done through teams. Wrap the pending join form:

Replace:
```tsx
{raceIsPending && !userParticipates && (
    <div className="d-flex">
        <JoinRaceForm race={race} />
    </div>
)}
```

With:
```tsx
{raceIsPending && !userParticipates && !race.isTeamRace && (
    <div className="d-flex">
        <JoinRaceForm race={race} />
    </div>
)}
```

And wrap the leave button similarly — add `!race.isTeamRace` to the condition for the LeaveRaceButton:

Replace:
```tsx
<LeaveRaceButton
    className="w-100 fs-5 mt-2"
    raceId={race.raceId}
    variant="danger"
/>
```

With:
```tsx
{!race.isTeamRace && (
    <LeaveRaceButton
        className="w-100 fs-5 mt-2"
        raceId={race.raceId}
        variant="danger"
    />
)}
```

- [ ] **Step 3: Update race-start-condition-information.tsx for team races**

Add a team-specific message. After the existing `if (startMethod === 'everyone-ready')` block's return for `< 2` participants, add a team race check.

At the top of the component, before the `startMethod` checks, add:

```tsx
if (race.isTeamRace && race.teams) {
    const teamsNotMeetingMin = race.teams.filter(
        (t) => t.members.length < (race.teamMinSize ?? 0),
    );
    if (race.teams.length === 0) {
        return <span>Waiting for teams to be created...</span>;
    }
    if (teamsNotMeetingMin.length > 0) {
        return (
            <span>
                Waiting for all teams to have at least{' '}
                {race.teamMinSize} members...
            </span>
        );
    }
}
```

- [ ] **Step 4: Commit**

```bash
git add app/(new-layout)/races/[race]/race-view.tsx app/(new-layout)/races/[race]/race-actions.tsx app/(new-layout)/races/[race]/race-start-condition-information.tsx
git commit -m "feat(races): integrate team lobby into race view"
```

---

### Task 6: Add team groupings to standings and participant detail

**Files:**
- Modify: `app/(new-layout)/races/[race]/race-participant-overview.tsx`
- Modify: `app/(new-layout)/races/[race]/race-participant-detail.tsx`

- [ ] **Step 1: Update race-participant-overview.tsx for team groupings**

When the race is a team race and not pending, group participants by team in the standings table. Add team color indicators next to usernames.

Import `RaceTeam` at the top:

```typescript
import { Race, RaceParticipantWithLiveData, RaceTeam } from '~app/(new-layout)/races/races.types';
```

In `RaceParticipantItem`, add a `team` prop and show a colored dot:

```typescript
export const RaceParticipantItem = ({
    participant,
    race,
    placing,
    team,
}: {
    participant: RaceParticipantWithLiveData;
    race: Race;
    placing: number;
    team?: RaceTeam;
}) => {
```

In the `<td className={styles.userCell}>` cell, before `<UserLink>`, add:

```tsx
{team && (
    <span
        style={{
            display: 'inline-block',
            width: 8,
            height: 8,
            borderRadius: '50%',
            backgroundColor: team.color,
            marginRight: '0.25rem',
            flexShrink: 0,
        }}
    />
)}
```

Update the `RaceParticipantOverview` component to find the team for each participant:

```tsx
{participants?.map((participant, i) => {
    const placing =
        participant.status === 'abandoned'
            ? firstAbandonedPlacing + 1
            : i + 1;
    const team = race.isTeamRace
        ? race.teams?.find((t) =>
              t.members.includes(participant.user),
          )
        : undefined;
    return (
        <RaceParticipantItem
            placing={placing}
            race={race}
            key={participant.user}
            participant={participant}
            team={team}
        />
    );
})}
```

- [ ] **Step 2: Update race-participant-detail.tsx for team groupings**

In `RaceParticipantDetailPagination`, when the race is a team race, show a team color border on each participant card. Find the team for each participant and pass a `teamColor` prop.

In the `.map()`, find the team:

```tsx
{participants.map((participant, i) => {
    const team = race.isTeamRace
        ? race.teams?.find((t) =>
              t.members.includes(participant.user),
          )
        : undefined;
    return (
        <Col
            key={participant.user}
            onClick={() => {
                if (
                    participant.liveData &&
                    participant.liveData.streaming
                ) {
                    setStream(participant.user);
                }
            }}
        >
            <RaceParticipantDetailView
                placing={i + 1}
                participant={participant}
                race={race}
                teamColor={team?.color}
            />
        </Col>
    );
})}
```

In `RaceParticipantDetailView`, add `teamColor` to the props:

```typescript
export const RaceParticipantDetailView = ({
    participant,
    placing,
    race,
    isHighlighted = false,
    teamColor,
}: {
    participant: RaceParticipantWithLiveData;
    placing: number;
    race: Race;
    isHighlighted?: boolean;
    teamColor?: string;
}) => {
```

Apply the team color as a left border on the card:

```tsx
<div
    className={`${styles.participantCard} ${
        isHighlighted ? styles.participantCardHighlighted : ''
    } ${
        participant.liveData && participant.liveData.streaming
            ? styles.participantCardStreaming
            : ''
    }`}
    style={teamColor ? { borderLeft: `3px solid ${teamColor}` } : undefined}
>
```

- [ ] **Step 3: Commit**

```bash
git add app/(new-layout)/races/[race]/race-participant-overview.tsx app/(new-layout)/races/[race]/race-participant-detail.tsx
git commit -m "feat(races): add team color indicators to standings and participant cards"
```

---

### Task 7: Add team results display

**Files:**
- Create: `app/(new-layout)/races/[race]/teams/team-results.tsx`
- Modify: `app/(new-layout)/races/[race]/race-view.tsx`

- [ ] **Step 1: Create team-results.tsx**

```tsx
import { Race, TeamResult } from '~app/(new-layout)/races/races.types';
import { UserLink } from '~src/components/links/links';
import { DurationToFormatted } from '~src/components/util/datetime';
import styles from '../race-detail.module.scss';

interface TeamResultsProps {
    race: Race;
}

export const TeamResults = ({ race }: TeamResultsProps) => {
    const teamResults = race.teamResults;
    if (!teamResults || teamResults.length === 0) return null;

    const methodLabel = race.teamResultMethod === 'sum' ? 'sum' : 'avg';

    return (
        <div className={styles.standingsPanel}>
            <span className={styles.panelTitle}>Team Rankings</span>
            <hr className={styles.panelDivider} />
            <table className={styles.standingsTable}>
                <thead>
                    <tr>
                        <th className={styles.placingCell}>#</th>
                        <th style={{ textAlign: 'left' }}>Team</th>
                        <th>Time ({methodLabel})</th>
                    </tr>
                </thead>
                <tbody>
                    {teamResults.map((result) => (
                        <TeamResultRow
                            key={result.name}
                            result={result}
                        />
                    ))}
                </tbody>
            </table>
        </div>
    );
};

const TeamResultRow = ({ result }: { result: TeamResult }) => {
    return (
        <tr>
            <td className={styles.placingCell}>
                {result.position !== null ? `${result.position}.` : '—'}
            </td>
            <td style={{ textAlign: 'left' }}>
                <span
                    style={{
                        display: 'inline-block',
                        width: 10,
                        height: 10,
                        borderRadius: '50%',
                        backgroundColor: result.color,
                        marginRight: '0.4rem',
                    }}
                />
                <span className={result.disqualified ? 'text-secondary' : ''}>
                    {result.name}
                    {result.disqualified && ' (DQ)'}
                </span>
                <div
                    style={{
                        fontSize: '0.75rem',
                        color: 'var(--bs-secondary-color)',
                        marginLeft: '1.4rem',
                    }}
                >
                    {result.members.map((m, i) => (
                        <span key={m.user}>
                            {i > 0 && ', '}
                            <UserLink
                                username={m.user}
                                url={`/${m.user}/races`}
                                icon={false}
                            />{' '}
                            {m.finalTime !== null ? (
                                <DurationToFormatted
                                    duration={m.finalTime}
                                />
                            ) : (
                                'DNF'
                            )}
                        </span>
                    ))}
                </div>
            </td>
            <td className={styles.timeCell}>
                {result.time !== null ? (
                    <DurationToFormatted duration={result.time} />
                ) : (
                    '—'
                )}
            </td>
        </tr>
    );
};
```

- [ ] **Step 2: Add TeamResults to race-view.tsx**

Import at the top:

```typescript
import { TeamResults } from '~app/(new-layout)/races/[race]/teams/team-results';
```

In the JSX, before `<RaceParticipantDetail>` (but after the TeamLobby conditional), add:

```tsx
{raceState.isTeamRace && raceState.status === 'finished' && raceState.teamResults && (
    <TeamResults race={raceState} />
)}
```

Also add it in the mobile layout before `<RaceParticipantOverview>`:

```tsx
{raceState.isTeamRace && raceState.status === 'finished' && raceState.teamResults && (
    <TeamResults race={raceState} />
)}
```

- [ ] **Step 3: Commit**

```bash
git add app/(new-layout)/races/[race]/teams/team-results.tsx app/(new-layout)/races/[race]/race-view.tsx
git commit -m "feat(races): add team results display for finished races"
```

---

### Task 8: Add team chat messages and race header badge

**Files:**
- Modify: `app/(new-layout)/races/[race]/race-chat.tsx`
- Modify: `app/(new-layout)/races/[race]/race-header.tsx`

- [ ] **Step 1: Add team message cases to race-chat.tsx**

Import `RaceMessageTeamData` at the top:

```typescript
import {
    Race,
    RaceMessage,
    RaceMessageModeratorData,
    RaceMessageParticipantCommentData,
    RaceMessageParticipantSplitData,
    RaceMessageParticipantTimeData,
    RaceMessageTeamData,
    RaceMessageUserData,
} from '~app/(new-layout)/races/races.types';
```

In the `getRaceMessage` function's switch statement, before the `default` case, add:

```typescript
        case 'team-created': {
            const data = message.data as RaceMessageTeamData;
            return (
                <>
                    <UserLink icon={false} username={data.user} />{' '}
                    created team &quot;{data.teamName}&quot;
                </>
            );
        }
        case 'team-join-request': {
            const data = message.data as RaceMessageTeamData;
            return (
                <>
                    <UserLink icon={false} username={data.user} />{' '}
                    requested to join &quot;{data.teamName}&quot;
                </>
            );
        }
        case 'team-member-approved': {
            const data = message.data as RaceMessageTeamData;
            return (
                <>
                    <UserLink icon={false} username={data.user} />{' '}
                    was approved to join &quot;{data.teamName}&quot;
                </>
            );
        }
        case 'team-member-denied': {
            const data = message.data as RaceMessageTeamData;
            return (
                <>
                    <UserLink icon={false} username={data.user} />{' '}
                    was denied from &quot;{data.teamName}&quot;
                </>
            );
        }
        case 'team-member-kicked': {
            const data = message.data as RaceMessageTeamData;
            return (
                <>
                    <UserLink icon={false} username={data.user} />{' '}
                    was kicked from &quot;{data.teamName}&quot;
                </>
            );
        }
        case 'team-member-left': {
            const data = message.data as RaceMessageTeamData;
            return (
                <>
                    <UserLink icon={false} username={data.user} />{' '}
                    left &quot;{data.teamName}&quot;
                </>
            );
        }
        case 'team-deleted': {
            const data = message.data as RaceMessageTeamData;
            return <>Team &quot;{data.teamName}&quot; was deleted</>;
        }
        case 'team-captain-changed': {
            const data = message.data as RaceMessageTeamData;
            return (
                <>
                    <UserLink icon={false} username={data.user} />{' '}
                    is now captain of &quot;{data.teamName}&quot;
                </>
            );
        }
```

Also add `'teams'` to the filter options. Update `FilterOptions`:

```typescript
interface FilterOptions {
    chat: boolean;
    race: boolean;
    participants: boolean;
    splits: boolean;
    teams: boolean;
}
```

Set the default to `true`:

```typescript
const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    chat: true,
    race: true,
    participants: true,
    splits: true,
    teams: true,
});
```

Add filtering for team messages in `filteredMessages`:

```typescript
if (
    !filterOptions.teams &&
    message.type.startsWith('team-')
) {
    return false;
}
```

Add `'teams'` to the `subjects` array:

```typescript
const subjects: (keyof FilterOptions)[] = [
    'chat',
    'race',
    'participants',
    'splits',
    'teams',
];
```

- [ ] **Step 2: Add team race badge to race-header.tsx**

In the `categoryRow` div, after the unranked badge, add a team race indicator:

```tsx
{race.isTeamRace && (
    <div
        style={{
            fontSize: '0.875rem',
            fontWeight: 600,
            color: 'var(--bs-info)',
            whiteSpace: 'nowrap',
        }}
    >
        Team Race
        {race.teamResultMethod && ` (${race.teamResultMethod})`}
    </div>
)}
```

- [ ] **Step 3: Commit**

```bash
git add app/(new-layout)/races/[race]/race-chat.tsx app/(new-layout)/races/[race]/race-header.tsx
git commit -m "feat(races): add team chat messages and header badge"
```

---

### Task 9: Handle team WebSocket messages in use-race hook

**Files:**
- Modify: `app/(new-layout)/races/hooks/use-race.ts`

- [ ] **Step 1: Update the raceUpdate handler to merge teams**

The `raceUpdate` WebSocket message already spreads `lastMessage.data` over the race state. When the backend sends a race update with updated `teams` array, this should work automatically. However, we should ensure `teams` and `teamResults` are preserved properly.

In the `raceUpdate` handler (line 59-67), the spread `{ ...raceState, ...lastMessage.data }` already handles this since `teams` is a top-level field on `Race`. No code change needed here — the existing handler correctly merges team data.

The `message` handler (line 68-83) already adds team messages to the chat since they come through as `type: 'message'` WebSocket events.

Verify this is correct — no changes needed to use-race.ts.

- [ ] **Step 2: Commit (skip if no changes)**

No changes needed — existing WebSocket handling already supports team data.

---

### Task 10: TypeScript compilation check

- [ ] **Step 1: Run typecheck**

```bash
npm run typecheck
```

Fix any compilation errors.

- [ ] **Step 2: Run lint**

```bash
npm run lint
```

Fix any lint errors.

- [ ] **Step 3: Commit any fixes**

```bash
git add -A
git commit -m "fix(races): resolve compilation and lint errors from team race implementation"
```
