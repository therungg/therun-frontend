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

    const result = await teamFetch(`${racesApiUrl}/${raceId}/teams`, 'POST', {
        name,
        color,
        ...(password ? { password } : {}),
    });

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
