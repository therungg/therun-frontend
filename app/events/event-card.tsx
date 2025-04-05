"use client";

import { EventFromSearch } from "../../types/events.types";
import Image from "next/image";
import Link from "next/link";
import { FaCalendarAlt, FaMapMarkerAlt, FaUser } from "react-icons/fa";
import { EventLocation } from "./event-location";
import styles from "./event.styles.module.css";
import clsx from "clsx";
import { FC, PropsWithChildren } from "react";
import { EventBadges } from "./event-badges";
import { EventDates } from "./event-dates";

export const SpeedrunEventCard = ({ event }: { event: EventFromSearch }) => {
    return (
        <Link href={`/events/${event.slug}`} className="text-decoration-none">
            <div
                className={clsx(
                    "container-fluid p-0 game-border mt-3 rounded-4 d-flex align-items-center shadow-lg border border-secondary",
                    styles["event-card"],
                )}
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
                        <span className="fs-2 fw-bold color-text">
                            {event.name}
                        </span>
                        <EventBadges event={event} />
                        <div className="d-flex mt-3">
                            <EventCardInfo>
                                <FaUser className="me-2 text-primary" />
                                <span className="text-muted">Organizer: </span>
                                <span className="ms-1">{event.organizer}</span>
                            </EventCardInfo>
                            <EventCardInfo>
                                <FaCalendarAlt className="me-2 text-primary" />
                                <span className="text-muted">Dates: </span>
                                <EventDates event={event} />
                            </EventCardInfo>
                            <EventCardInfo>
                                <FaMapMarkerAlt className="me-2 text-danger" />
                                <span className="text-muted">Location: </span>
                                <span className="ms-1">
                                    <EventLocation
                                        location={
                                            !event.isOffline
                                                ? "Online"
                                                : (event.location as string)
                                        }
                                        margin={2}
                                    />
                                </span>
                            </EventCardInfo>
                        </div>
                    </div>
                    <div className="mt-2">
                        <span className="text-muted">
                            {event.shortDescription}
                        </span>
                    </div>
                </div>
            </div>
        </Link>
    );
};

const EventCardInfo: FC<PropsWithChildren> = ({ children }) => {
    return (
        <div
            className={clsx(
                "me-3 d-flex align-items-center px-3 py-2 rounded border",
                styles["event-card-info"],
            )}
        >
            {children}
        </div>
    );
};
