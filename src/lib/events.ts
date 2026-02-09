'use server';

import { PaginatedData } from '~src/components/pagination/pagination.types';
import {
    CreateEventInput,
    CreateEventOrganizerInput,
    EditEventInput,
    EventOrganizer,
    EventWithOrganizerName,
} from '../../types/events.types';
import { apiFetch } from './api-client';

export const getEventById = async (
    eventId: number | string,
): Promise<EventWithOrganizerName> => {
    return apiFetch<EventWithOrganizerName>(`/events/${eventId}`);
};

export const getAllEvents = async (): Promise<EventWithOrganizerName[]> => {
    return apiFetch<EventWithOrganizerName[]>('/events');
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
