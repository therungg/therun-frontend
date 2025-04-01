import { eventOrganizers, events } from "~src/db/schema";
import { InferInsertModel, InferSelectModel } from "drizzle-orm";

export type Event = InferSelectModel<typeof events>;
export type EventWithOrganizerName = Event & { organizerName: string };

export interface EventFromSearch
    extends Omit<Event, "startsAt" | "endsAt" | "createdAt"> {
    startsAt: string;
    endsAt: string;
    createdAt: string;
    organizer: string;
    objectID: string;
}

export type CreateEventInput = InferInsertModel<typeof events>;
export type EditEventInput = Omit<CreateEventInput, "createdBy">;

export type EventOrganizer = InferSelectModel<typeof eventOrganizers>;
export type CreateEventOrganizerInput = InferInsertModel<
    typeof eventOrganizers
>;

export type EventType = "Marathon" | "Tournament" | "Race" | "Other";
export const eventTypes: EventType[] = [
    "Marathon",
    "Tournament",
    "Race",
    "Other",
];

export type EventTier = 1 | 2 | 3 | 4;
export const eventTiers: EventTier[] = [
    1, // Premium tier. Offline, hundreds of entrants, tens of thousands of dollar raised, multi-day, many viewers, etc.
    2, // Tier 2. Big event.
    3, // Tier 3. Medium event.
    4, // Tier 4. Very small event/races etc.
];

export const eventTierShortNames: Record<EventTier, string> = {
    1: "Premium",
    2: "Major",
    3: "Minor",
    4: "Local",
};

export const eventTierNames: Record<EventTier, string> = {
    1: "Premium (GDQ, Speedons, RTA in Japan, etc.)",
    2: "Major (Large events, huge scheduled races like 602, etc.)",
    3: "Minor (Medium events, tournaments, big races, etc.)",
    4: "Local (Small events, races, small community tournaments etc.)",
};
