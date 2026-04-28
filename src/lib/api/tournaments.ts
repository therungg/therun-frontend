import { apiFetch } from '~src/lib/api-client';
import type {
    Capability,
    ParticipantStatus,
    Participants,
    StaffEntry,
    Tournament,
} from '../../../types/tournament.types';

const enc = encodeURIComponent;
const base = (name?: string) =>
    name ? `/v1/tournaments/${enc(name)}` : `/v1/tournaments`;

export const listTournaments = () => apiFetch<Tournament[]>(base());

export const getTournament = (name: string) => apiFetch<Tournament>(base(name));

export const createTournament = (
    body: Partial<Tournament>,
    sessionId: string,
) => apiFetch<Tournament>(base(), { method: 'POST', body, sessionId });

export const updateTournament = (
    name: string,
    patch: Partial<Tournament>,
    sessionId: string,
) =>
    apiFetch<Tournament>(base(name), {
        method: 'PATCH',
        body: patch,
        sessionId,
    });

export const deleteTournament = (name: string, sessionId: string) =>
    apiFetch<{ ok: true }>(base(name), { method: 'DELETE', sessionId });

// Staff
export const listStaff = (name: string, sessionId: string) =>
    apiFetch<StaffEntry[]>(`${base(name)}/staff`, { sessionId });

export const addStaff = (
    name: string,
    user: string,
    capabilities: Capability[],
    sessionId: string,
) =>
    apiFetch<Tournament>(`${base(name)}/staff`, {
        method: 'POST',
        body: { user, capabilities },
        sessionId,
    });

export const updateStaff = (
    name: string,
    user: string,
    capabilities: Capability[],
    sessionId: string,
) =>
    apiFetch<Tournament>(`${base(name)}/staff/${enc(user)}`, {
        method: 'PATCH',
        body: { capabilities },
        sessionId,
    });

export const removeStaff = (name: string, user: string, sessionId: string) =>
    apiFetch<Tournament>(`${base(name)}/staff/${enc(user)}`, {
        method: 'DELETE',
        sessionId,
    });

// Admins
export const listAdmins = (name: string, sessionId: string) =>
    apiFetch<string[]>(`${base(name)}/admins`, { sessionId });

export const addAdmin = (name: string, user: string, sessionId: string) =>
    apiFetch<Tournament>(`${base(name)}/admins`, {
        method: 'POST',
        body: { user },
        sessionId,
    });

export const removeAdmin = (name: string, user: string, sessionId: string) =>
    apiFetch<Tournament>(`${base(name)}/admins/${enc(user)}`, {
        method: 'DELETE',
        sessionId,
    });

// Participants
export const listParticipants = (name: string) =>
    apiFetch<Participants>(`${base(name)}/participants`);

export const setParticipantStatus = (
    name: string,
    user: string,
    status: ParticipantStatus,
    sessionId: string,
) =>
    apiFetch<Tournament>(`${base(name)}/participants`, {
        method: 'POST',
        body: { user, status },
        sessionId,
    });

export const removeParticipant = (
    name: string,
    user: string,
    sessionId: string,
) =>
    apiFetch<Tournament>(`${base(name)}/participants/${enc(user)}`, {
        method: 'DELETE',
        sessionId,
    });

// Runs
export const addCustomRun = (
    name: string,
    user: string,
    time: string,
    date: string,
    sessionId: string,
) =>
    apiFetch<{ ok: true }>(`${base(name)}/runs`, {
        method: 'POST',
        body: { user, time, date },
        sessionId,
    });

export const excludeRun = (
    name: string,
    user: string,
    startedAt: string,
    sessionId: string,
) =>
    apiFetch<{ ok: true }>(`${base(name)}/runs`, {
        method: 'DELETE',
        body: { user, startedAt },
        sessionId,
    });

export const setRunsEndTime = (
    name: string,
    date: string,
    heat: number | undefined,
    sessionId: string,
) =>
    apiFetch<{ ok: true }>(`${base(name)}/runs/end-time`, {
        method: 'POST',
        body: heat !== undefined ? { date, heat } : { date },
        sessionId,
    });

// Lifecycle
export type LifecycleAction =
    | 'lock'
    | 'unlock'
    | 'finalize'
    | 'archive'
    | 'recalculate';

export const lifecycleAction = (
    name: string,
    action: LifecycleAction,
    sessionId: string,
) =>
    apiFetch<Tournament | { ok: true }>(`${base(name)}/lifecycle`, {
        method: 'POST',
        body: { action },
        sessionId,
    });

// Stats
export const getTournamentStats = (name: string) =>
    apiFetch<unknown>(`${base(name)}/stats`);
