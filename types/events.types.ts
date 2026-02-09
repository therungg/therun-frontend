export interface Event {
    id: number;
    organizerId: number;
    startsAt: Date;
    endsAt: Date;
    name: string;
    slug: string;
    type: string;
    location: string | null;
    bluesky: string | null;
    twitter: string | null;
    twitch: string | null;
    discord: string | null;
    submissionsUrl: string | null;
    language: string;
    shortDescription: string;
    description: string;
    url: string | null;
    scheduleUrl: string | null;
    imageUrl: string | null;
    isOffline: boolean;
    isHighlighted: boolean;
    tier: number | null;
    tags: string[];
    isForCharity: boolean;
    charityName: string | null;
    charityUrl: string | null;
    restreams: EventRestream[];
    isDeleted: boolean;
    createdAt: Date;
    createdBy: string;
}

export type EventWithOrganizerName = Event & { organizerName: string };

export interface EventFromSearch
    extends Omit<Event, 'startsAt' | 'endsAt' | 'createdAt'> {
    startsAt: string;
    endsAt: string;
    createdAt: string;
    organizer: string;
    objectID: string;
}

export type CreateEventInput = Omit<Event, 'id' | 'createdAt'> & {
    createdAt?: Date;
};
export type EditEventInput = Omit<CreateEventInput, 'createdBy'>;

export interface EventOrganizer {
    id: number;
    name: string;
}
export type CreateEventOrganizerInput = Omit<EventOrganizer, 'id'>;

export type EventType =
    | 'Marathon'
    | 'Tournament'
    | 'Race'
    | 'Showcase'
    | 'Relay'
    | 'Community Meetup'
    | 'Other';
export const eventTypes: EventType[] = [
    'Marathon',
    'Tournament',
    'Race',
    'Showcase',
    'Relay',
    'Community Meetup',
    'Other',
];

export interface EventRestream {
    url: string;
    organizer?: string;
    language?: string;
}

export type EventTier = 1 | 2 | 3 | 4;
export const eventTiers: EventTier[] = [
    1, // Premium tier. Offline, hundreds of entrants, tens of thousands of dollar raised, multi-day, many viewers, etc.
    2, // Tier 2. Big event.
    3, // Tier 3. Medium event.
    4, // Tier 4. Very small event/races etc.
];

export const eventTierShortNames: Record<EventTier, string> = {
    1: 'Premium',
    2: 'Major',
    3: 'Minor',
    4: 'Local',
};

export const eventTierNames: Partial<Record<EventTier, string>> = {
    1: 'Premium (Among the biggest 10 events in the world. GDQ, Speedons, RTA In Japan, etc.)',
    2: 'Major (Among the biggest 100 events in the world)',
    3: 'Minor',
    // 4: "Local (Small events, races, small community tournaments etc.)",
};
