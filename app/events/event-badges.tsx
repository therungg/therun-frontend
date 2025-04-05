import {
    EventFromSearch,
    eventTierShortNames,
    EventWithOrganizerName,
} from "types/events.types";

export const EventBadges = ({
    event,
}: {
    event: EventFromSearch | EventWithOrganizerName;
}) => {
    return (
        <div className="d-flex align-items-center mt-0">
            <span
                className={`badge me-2 ${
                    event.tier === 1
                        ? "bg-warning text-dark"
                        : event.tier === 2
                          ? "bg-success text-white"
                          : event.tier === 3
                            ? "bg-primary text-white"
                            : "bg-secondary text-white"
                }`}
            >
                {eventTierShortNames[
                    event.tier as keyof typeof eventTierShortNames
                ] || event.tier}
            </span>
            <span
                className={`badge me-2 ${
                    event.isOffline
                        ? "bg-danger text-white"
                        : "bg-info text-dark"
                }`}
            >
                {event.isOffline ? "Offline" : "Online"}
            </span>
            <span className="badge bg-primary text-white me-2">
                {event.type}
            </span>
            <span className="badge bg-secondary text-white me-2">
                {event.language}
            </span>
        </div>
    );
};
