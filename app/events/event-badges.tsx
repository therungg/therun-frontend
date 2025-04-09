import { FaCrown, FaHeart } from "react-icons/fa6";
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
    const isLive =
        new Date().getTime() < new Date(event.endsAt).getTime() &&
        new Date().getTime() > new Date(event.startsAt).getTime();

    return (
        <div className="d-flex align-items-center mt-0 flex-wrap">
            {
                // This was vibe coded
                isLive && (
                    <span className="badge bg-danger text-white me-2">
                        <span className="ping-dot-container me-1">
                            <span className="ping-dot-ping"></span>
                            <span className="ping-dot"></span>
                        </span>
                        LIVE NOW
                    </span>
                )
            }
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
                ] || event.tier}{" "}
                {event.tier === 1 && <FaCrown />}
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
            {event.isForCharity && (
                <span className="badge bg-info text-dark me-2">
                    For Charity <FaHeart size={8} />
                </span>
            )}
            <span className="badge bg-secondary text-white me-2">
                {event.language}
            </span>
        </div>
    );
};
