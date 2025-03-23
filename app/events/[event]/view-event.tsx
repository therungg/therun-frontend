"use client";

import Image from "next/image";
import { EventWithOrganizerName } from "../../../types/events.types";
import { Can, subject } from "~src/rbac/Can.component";
import { Button } from "~src/components/Button/Button";
import Link from "next/link";

export const ViewEvent = ({ event }: { event: EventWithOrganizerName }) => {
    return (
        <div className="container mt-5">
            <div className="card">
                <div className="card-body">
                    <div className="d-flex justify-content-between align-items-center">
                        <Image
                            height={300}
                            width={300}
                            src={
                                event.imageUrl ??
                                "/logo_dark_theme_no_text_transparent.png"
                            }
                            alt={event.name}
                        />
                        <Can I="edit" this={subject("event", event)}>
                            <Link href={`/events/${event.id}/edit`}>
                                <Button>Edit</Button>
                            </Link>
                        </Can>
                    </div>
                    <h1 className="card-title">{event.name}</h1>
                    <p className="card-text text-muted">
                        {event.shortDescription}
                    </p>
                    <p className="card-text">{event.description}</p>
                    <ul className="list-group list-group-flush">
                        <li className="list-group-item">
                            <strong>Type:</strong> {event.type}
                        </li>
                        <li className="list-group-item">
                            <strong>Location:</strong> {event.location || "TBD"}
                        </li>
                        <li className="list-group-item">
                            <strong>Language:</strong> {event.language}
                        </li>
                        <li className="list-group-item">
                            <strong>Starts At:</strong>{" "}
                            {new Date(event.startsAt).toLocaleString()}
                        </li>
                        <li className="list-group-item">
                            <strong>Ends At:</strong>{" "}
                            {new Date(event.endsAt).toLocaleString()}
                        </li>
                        <li className="list-group-item">
                            <strong>Organizer:</strong> {event.organizerName}
                        </li>
                    </ul>
                    <div className="mt-3">
                        {event.url && (
                            <a
                                href={event.url}
                                className="btn btn-primary me-2"
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                Event Website
                            </a>
                        )}
                        {event.bluesky && (
                            <a
                                href={event.bluesky}
                                className="btn btn-info me-2"
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                Bluesky
                            </a>
                        )}
                        {event.discord && (
                            <a
                                href={event.discord}
                                className="btn btn-secondary"
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                Discord
                            </a>
                        )}
                    </div>
                </div>
                <div className="card-footer text-muted">
                    Created by {event.createdBy} on{" "}
                    {new Date(event.createdAt).toLocaleDateString()}
                </div>
            </div>
        </div>
    );
};
