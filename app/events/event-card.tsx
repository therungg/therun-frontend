"use client";

import { EventFromSearch, eventTierShortNames } from "../../types/events.types";
import Image from "next/image";
import Link from "next/link";
import { FaCalendarAlt, FaMapMarkerAlt, FaUser } from "react-icons/fa";

export const SpeedrunEventCard = ({ event }: { event: EventFromSearch }) => {
    return (
        <Link href={"/events/" + event.slug} className="text-decoration-none">
            <div
                className="container-fluid p-0 game-border mt-3 rounded-4 d-flex align-items-center shadow-lg bg-body-secondary hover-bg-primary"
                style={{
                    height: "200px",
                    transition: "background-color 0.3s ease",
                }}
            >
                <Image
                    alt={event.name}
                    src={
                        event.imageUrl ??
                        "/logo_dark_theme_no_text_transparent.png"
                    }
                    height={200}
                    width={200}
                    className="rounded-start-4"
                />
                <div
                    className="p-3 d-flex flex-column justify-content-between"
                    style={{ flex: 1 }}
                >
                    <div>
                        <span className="fs-2 fw-bold text-primary">
                            {event.name}
                        </span>
                        <div className="d-flex align-items-center mt-2">
                            <span className="badge bg-primary me-2">
                                {event.type}
                            </span>
                            <span className="badge bg-secondary me-2">
                                {event.language}
                            </span>
                            <span className="badge bg-info">
                                {eventTierShortNames[
                                    event.tier as keyof typeof eventTierShortNames
                                ] || event.tier}
                            </span>
                        </div>
                        <div className="d-flex mt-2">
                            <div
                                className="me-3 d-flex align-items-center p-2 border rounded bg-body-tertiary"
                                style={{ borderColor: "#007bff" }}
                            >
                                <FaUser className="me-1 text-primary" />
                                <span className="text-muted">Organizer: </span>
                                <span className="ms-1">{event.organizer}</span>
                            </div>
                            <div
                                className="me-3 d-flex align-items-center p-2 border rounded bg-body-tertiary"
                                style={{ borderColor: "#007bff" }}
                            >
                                <FaCalendarAlt className="me-1 text-primary" />
                                <span className="text-muted">Dates: </span>
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
                            </div>
                            <div
                                className="d-flex align-items-center p-2 border rounded bg-body-tertiary"
                                style={{ borderColor: "#dc3545" }}
                            >
                                <FaMapMarkerAlt className="me-1 text-danger" />
                                <span className="text-muted">Location: </span>
                                <span className="ms-1">{event.location}</span>
                            </div>
                        </div>
                    </div>
                    <div className="mt-2">
                        <span className="text-muted">
                            | {event.shortDescription}
                        </span>
                    </div>
                </div>
            </div>
        </Link>
    );
};
