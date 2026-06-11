'use server';

import { cacheLife, cacheTag } from 'next/cache';
import { PaginatedData } from '~src/components/pagination/pagination.types';
import {
    CreateEventInput,
    CreateEventOrganizerInput,
    EditEventInput,
    EventFromSearch,
    EventOrganizer,
    EventWithOrganizerName,
} from '../../types/events.types';
import { apiFetch } from './api-client';

export interface EventSearchResult extends PaginatedData<EventFromSearch> {
    facets: Record<string, Record<string, number>>;
}

export const searchEvents = async (
    page = 1,
    query = '',
    filters = '',
): Promise<EventSearchResult> => {
    const params = new URLSearchParams();
    if (query) params.set('query', query);
    params.set('page', page.toString());
    if (filters) params.set('filters', filters);
    return apiFetch<EventSearchResult>(`/events/search?${params.toString()}`);
};

export const getEventById = async (
    eventId: number | string,
): Promise<EventWithOrganizerName> => {
    return apiFetch<EventWithOrganizerName>(`/events/${eventId}`);
};

export const getAllEvents = async (): Promise<EventWithOrganizerName[]> => {
    'use cache: remote';
    cacheLife('hours');
    cacheTag('events');

    // GET /events was never registered on the gateway (only sub-routes
    // exist), so this aggregates the paginated endpoint instead.
    const allEvents: EventWithOrganizerName[] = [];
    let page = 1;

    while (true) {
        const result = await getEventsPaginated(page, 100);
        allEvents.push(...result.items);

        if (page >= result.totalPages) break;
        page++;
    }

    return allEvents;
};

export const getAllEventOrganizers = async (): Promise<EventOrganizer[]> => {
    return apiFetch<EventOrganizer[]>('/events/organizers');
};

export const getEventsPaginated = async (
    page = 1,
    pageSize = 10,
): Promise<PaginatedData<EventWithOrganizerName>> => {
    return apiFetch<PaginatedData<EventWithOrganizerName>>(
        `/events/paginated?page=${page}&pageSize=${pageSize}`,
    );
};

export const createEvent = async (
    input: CreateEventInput,
    sessionId: string,
): Promise<number> => {
    return apiFetch<number>('/events', {
        method: 'POST',
        body: JSON.stringify(input),
        sessionId,
    });
};

export const editEvent = async (
    eventId: number,
    input: EditEventInput,
    sessionId: string,
): Promise<void> => {
    await apiFetch<void>(`/events/${eventId}`, {
        method: 'PUT',
        body: JSON.stringify(input),
        sessionId,
    });
};

export const deleteEvent = async (
    eventId: number,
    sessionId: string,
): Promise<void> => {
    await apiFetch<void>(`/events/${eventId}`, {
        method: 'DELETE',
        sessionId,
    });
};

export const createEventOrganizer = async (
    input: CreateEventOrganizerInput,
    sessionId: string,
): Promise<EventOrganizer> => {
    return apiFetch<EventOrganizer>('/events/organizers', {
        method: 'POST',
        body: JSON.stringify(input),
        sessionId,
    });
};
