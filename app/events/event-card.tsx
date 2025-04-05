"use client";

import { EventFromSearch, eventTierShortNames } from "../../types/events.types";
import Image from "next/image";
import Link from "next/link";
import { FaCalendarAlt, FaMapMarkerAlt, FaUser } from "react-icons/fa";
import { EventLocation } from "./event-location";
import styles from "./event.styles.module.css";
import clsx from "clsx";
import { FC, PropsWithChildren } from "react";

export const SpeedrunEventCard = ({ event }: { event: EventFromSearch }) => {
    return (
        <Link href={`/events/${event.slug}`} className="text-decoration-none">
            <div
                className={clsx(
                    "container-fluid p-0 game-border mt-3 rounded-4 d-flex align-items-center shadow-lg",
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
                        <div className="d-flex mt-3">
                            <EventCardInfo>
                                <FaUser className="me-1 text-primary" />
                                <span className="text-muted">Organizer: </span>
                                <span className="ms-1">{event.organizer}</span>
                            </EventCardInfo>
                            <EventCardInfo>
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
                            </EventCardInfo>
                            <EventCardInfo>
                                <FaMapMarkerAlt className="me-1 text-danger" />
                                <span className="text-muted">Location: </span>
                                <span className="ms-1">
                                    <EventLocation
                                        location={
                                            event.isOffline
                                                ? "Offline"
                                                : (event.location as string)
                                        }
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
