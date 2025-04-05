import { EventFromSearch, EventWithOrganizerName } from "types/events.types";

export const EventDates = ({
    event,
}: {
    event: EventFromSearch | EventWithOrganizerName;
}) => {
    return (
        <>
            <span className="ms-1">
                {new Intl.DateTimeFormat("en-US", {
                    month: "short",
                    day: "numeric",
                }).format(new Date(event.startsAt))}
                {" - "}
                {new Intl.DateTimeFormat("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                }).format(new Date(event.endsAt))}
            </span>
        </>
    );
};
