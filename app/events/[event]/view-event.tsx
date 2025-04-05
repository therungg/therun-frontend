"use client";

import Image from "next/image";
import { EventWithOrganizerName } from "../../../types/events.types";
import { Can, subject } from "~src/rbac/Can.component";
import { Button } from "~src/components/Button/Button";
import Link from "next/link";
import { deleteEventAction } from "../actions/delete-event.action";
import { redirect } from "next/navigation";
import {
    Breadcrumb,
    BreadcrumbItem,
} from "~src/components/breadcrumbs/breadcrumb";

export const ViewEvent = ({ event }: { event: EventWithOrganizerName }) => {
    const breadcrumbs: BreadcrumbItem[] = [
        { content: "Events", href: "/events" },
        { content: event.name, href: "/events/" + event.id },
    ];

    return (
        <>
            <Breadcrumb breadcrumbs={breadcrumbs} />
            <div className="container mt-4">
                <div
                    className="d-flex align-items-center p-4 rounded shadow-lg bg-body-secondary"
                    style={{
                        height: "300px",
                        color: "white",
                    }}
                >
                    <Image
                        src={
                            event.imageUrl ??
                            "/logo_dark_theme_no_text_transparent.png"
                        }
                        alt={event.name}
                        height={200}
                        width={200}
                    />
                    <div className="ms-4">
                        <h1 className="fw-bold">{event.name}</h1>
                        <p className="mb-1">
                            {new Intl.DateTimeFormat("en-US", {
                                month: "long",
                                day: "numeric",
                                year: "numeric",
                            }).format(new Date(event.startsAt))}{" "}
                            -{" "}
                            {new Intl.DateTimeFormat("en-US", {
                                month: "long",
                                day: "numeric",
                                year: "numeric",
                            }).format(new Date(event.endsAt))}
                        </p>
                        <div className="d-flex">
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
                                Tier {event.tier}
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
                            <span className="badge bg-secondary text-white">
                                {event.language}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Description and Details Section */}
                <div className="card mt-4">
                    <div className="card-body">
                        <h2 className="card-title">About the Event</h2>
                        <p className="card-text text-muted">
                            {event.shortDescription}
                        </p>
                        <p
                            className="card-text"
                            dangerouslySetInnerHTML={{
                                __html: event.description,
                            }}
                        ></p>

                        <h3 className="mt-4">Details</h3>
                        <ul className="list-group list-group-flush">
                            <li className="list-group-item">
                                <strong>Location:</strong>{" "}
                                {event.location || "TBD"}
                            </li>
                            <li className="list-group-item">
                                <strong>Organizer:</strong>{" "}
                                {event.organizerName}
                            </li>
                            <li className="list-group-item">
                                <strong>Created By:</strong> {event.createdBy}{" "}
                                on{" "}
                                {new Date(event.createdAt).toLocaleDateString()}
                            </li>
                        </ul>

                        <h3 className="mt-4">Links</h3>
                        <div className="d-flex flex-wrap">
                            {event.url && (
                                <a
                                    href={event.url}
                                    className="btn btn-primary me-2 mb-2"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    Event Website
                                </a>
                            )}
                            {event.bluesky && (
                                <a
                                    href={event.bluesky}
                                    className="btn btn-info me-2 mb-2"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    Bluesky
                                </a>
                            )}
                            {event.discord && (
                                <a
                                    href={event.discord}
                                    className="btn btn-secondary me-2 mb-2"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    Discord
                                </a>
                            )}
                        </div>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="mt-4 d-flex justify-content-end">
                    <Can I="edit" this={subject("event", event)}>
                        <Link href={`/events/${event.id}/edit`}>
                            <Button>Edit Event</Button>
                        </Link>
                    </Can>
                    <Can I="delete" this={subject("event", event)}>
                        <Button
                            className="ms-2"
                            variant="danger"
                            onClick={async () => {
                                if (
                                    confirm(
                                        "Are you sure you want to delete this event?",
                                    )
                                ) {
                                    await deleteEventAction(event.id);

                                    redirect("/events");
                                }
                            }}
                        >
                            Delete Event
                        </Button>
                    </Can>
                </div>
            </div>
        </>
    );
};
