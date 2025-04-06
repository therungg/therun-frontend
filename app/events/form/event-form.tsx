"use client";

import { Col, Form, Row } from "react-bootstrap";
import { Button } from "~src/components/Button/Button";
import React, { useEffect, useState } from "react";
import {
    Event,
    EventOrganizer,
    eventTypes,
    eventTierNames,
} from "../../../types/events.types";
import { createEventOrganizer, getAllEventOrganizers } from "~src/lib/events";
import { toast } from "react-toastify";
import { countries } from "~src/common/countries";
import { languages } from "~src/common/languages";
import Tiptap from "~src/components/TipTap";
import Image from "next/image";
import { EventTagInput } from "./inputs/event-tag-input";
import { EventFieldRequired } from "./event-field-required";

export const EventForm = ({ event }: { event?: Event }) => {
    const [eventOrganizers, setEventOrganizers] = useState<EventOrganizer[]>(
        [],
    );
    const [newOrganizerName, setNewOrganizerName] = useState("");
    const [selectedOrganizerId, setSelectedOrganizerId] = useState(
        event?.organizerId || "",
    );
    const [selectedIsOffline, setSelectedIsOffline] = useState(
        event?.isOffline || false,
    );
    const [editorContent, setEditorContent] = useState<string>(
        event?.description || "",
    );
    const [slug, setSlug] = useState<string>(event?.slug || "");

    const fetchEventOrganizers = async () => {
        const organizers = await getAllEventOrganizers();
        setEventOrganizers(organizers);
    };

    useEffect(() => {
        fetchEventOrganizers();
    }, []);

    const handleAddOrganizer = async () => {
        if (newOrganizerName.trim()) {
            const newOrganizer = await createEventOrganizer({
                name: newOrganizerName.trim(),
            });
            setNewOrganizerName("");
            await fetchEventOrganizers();
            toast.success("Organizer added successfully");
            setSelectedOrganizerId(newOrganizer.id);
        }
    };

    return (
        <>
            <Row>
                <Col md={3}>
                    <Form.Group className="mb-3">
                        <Form.Label htmlFor="eventName">
                            Event Name <EventFieldRequired />
                        </Form.Label>
                        <Form.Control
                            id="eventName"
                            type="text"
                            name="name"
                            defaultValue={event?.name || ""}
                            required
                        />
                    </Form.Group>
                </Col>
                <Col md={3}>
                    <Form.Group className="mb-3">
                        <Form.Label htmlFor="slug">
                            URL (therun.gg/events/{slug}) <EventFieldRequired />
                        </Form.Label>
                        <Form.Control
                            id="slug"
                            type="text"
                            name="slug"
                            defaultValue={event?.slug || ""}
                            required
                            min="1"
                            max="50"
                            onChange={(e) => {
                                const value = e.target.value
                                    .toLowerCase()
                                    .replace(/\s+/g, "-")
                                    .replace(/[^a-z0-9-]/g, "");
                                setSlug(value);
                            }}
                        />
                    </Form.Group>
                </Col>
                <Col md={3}>
                    <Form.Group className="mb-3">
                        <Form.Label htmlFor="eventType">
                            Type <EventFieldRequired />
                        </Form.Label>
                        <Form.Select
                            id="eventType"
                            name="type"
                            defaultValue={event?.type || ""}
                            required
                        >
                            <option value="">Select Type</option>
                            {eventTypes.map((type) => (
                                <option key={type} value={type}>
                                    {type}
                                </option>
                            ))}
                        </Form.Select>
                    </Form.Group>
                </Col>
                <Col md={3}>
                    <Form.Group className="mb-3">
                        <Form.Label htmlFor="eventTier">
                            Tier <EventFieldRequired />
                        </Form.Label>
                        <Form.Select
                            id="eventTier"
                            name="tier"
                            defaultValue={event?.tier || ""}
                            required
                        >
                            <option value="">Select Tier</option>
                            {Object.entries(eventTierNames).map(
                                ([key, value]) => (
                                    <option key={key} value={key}>
                                        {value}
                                    </option>
                                ),
                            )}
                        </Form.Select>
                    </Form.Group>
                </Col>
            </Row>

            <Row>
                <Col md={4}>
                    <Form.Group className="mb-3">
                        <Form.Label htmlFor="isOffline">
                            Is In-person event
                        </Form.Label>
                        <Form.Check
                            id="isOffline"
                            type="checkbox"
                            name="isOffline"
                            checked={selectedIsOffline}
                            onChange={(e) =>
                                setSelectedIsOffline(e.target.checked)
                            }
                            label="The event is held in-person, not online"
                        />
                    </Form.Group>
                </Col>
                <Col md={4}>
                    <Form.Group className="mb-3">
                        <Form.Label htmlFor="language">
                            Language <EventFieldRequired />
                        </Form.Label>
                        <Form.Select
                            id="language"
                            name="language"
                            defaultValue={event?.language || "English"}
                            as="select"
                        >
                            {Array.from(Object.entries(languages())).map(
                                ([_, value]) => {
                                    return (
                                        <option key={value} value={value}>
                                            {value}
                                        </option>
                                    );
                                },
                            )}
                        </Form.Select>
                    </Form.Group>
                </Col>
                <Col md={4}>
                    {selectedIsOffline && (
                        <Form.Group className="mb-3">
                            <Form.Label htmlFor="location">Location</Form.Label>
                            <Form.Select
                                id="location"
                                name="location"
                                defaultValue={event?.location || ""}
                                as="select"
                                disabled={!selectedIsOffline}
                            >
                                <option>-</option>
                                {Array.from(Object.entries(countries())).map(
                                    ([key, value]) => {
                                        return (
                                            <option key={key} value={key}>
                                                {value}
                                            </option>
                                        );
                                    },
                                )}
                            </Form.Select>
                        </Form.Group>
                    )}
                </Col>
            </Row>

            <Row>
                <Col md={6}>
                    <Form.Group className="mb-4">
                        <Form.Label htmlFor="organizer">
                            Event Organizer <EventFieldRequired />
                        </Form.Label>
                        <Form.Select
                            id="organizer"
                            name="organizer"
                            value={selectedOrganizerId}
                            onChange={(e) =>
                                setSelectedOrganizerId(e.target.value)
                            }
                            required
                        >
                            <option value="">Select Organizer</option>
                            {eventOrganizers.map((organizer) => (
                                <option key={organizer.id} value={organizer.id}>
                                    {organizer.name}
                                </option>
                            ))}
                        </Form.Select>
                    </Form.Group>
                </Col>
                <Col>
                    <Row>
                        <Form.Label htmlFor="newOrganizerName">
                            Add new Event Organizer
                        </Form.Label>
                        <Col md={9}>
                            <Form.Control
                                id="newOrganizerName"
                                type="text"
                                value={newOrganizerName}
                                onChange={(e) =>
                                    setNewOrganizerName(e.target.value)
                                }
                                placeholder="New Organizer"
                            />
                        </Col>
                        <Col md={3}>
                            <Button
                                onClick={handleAddOrganizer}
                                variant="secondary"
                            >
                                Add Organizer
                            </Button>
                        </Col>
                    </Row>
                </Col>
            </Row>

            <Row>
                <Col md={6}>
                    <Form.Group className="mb-3">
                        <Form.Label htmlFor="startsAt">
                            Starts At <EventFieldRequired />
                        </Form.Label>
                        <Form.Control
                            id="startsAt"
                            type="datetime-local"
                            name="startsAt"
                            defaultValue={
                                event?.startsAt
                                    ? new Date(event.startsAt)
                                          .toISOString()
                                          .slice(0, -1)
                                    : ""
                            }
                            required
                        />
                    </Form.Group>
                </Col>
                <Col md={6}>
                    <Form.Group className="mb-3">
                        <Form.Label htmlFor="endsAt">
                            Ends At <EventFieldRequired />
                        </Form.Label>
                        <Form.Control
                            id="endsAt"
                            type="datetime-local"
                            name="endsAt"
                            defaultValue={
                                event?.endsAt
                                    ? new Date(event.endsAt)
                                          .toISOString()
                                          .slice(0, -1)
                                    : ""
                            }
                            required
                        />
                    </Form.Group>
                </Col>
            </Row>

            <Row>
                <Col md={4}>
                    <Form.Group className="mb-3">
                        <Form.Label htmlFor="url">Event URL</Form.Label>
                        <Form.Control
                            id="url"
                            type="url"
                            name="url"
                            defaultValue={event?.url || ""}
                        />
                    </Form.Group>
                </Col>
                <Col md={4}>
                    <Form.Group className="mb-3">
                        <Form.Label htmlFor="scheduleUrl">
                            Schedule URL
                        </Form.Label>
                        <Form.Control
                            id="scheduleUrl"
                            type="url"
                            name="scheduleUrl"
                            defaultValue={event?.scheduleUrl || ""}
                        />
                    </Form.Group>
                </Col>
                <Col md={4}>
                    <Form.Group className="mb-3">
                        <Form.Label htmlFor="twitch">Twitch URL</Form.Label>
                        <Form.Control
                            id="twitch"
                            type="url"
                            name="twitch"
                            defaultValue={event?.twitch || ""}
                        />
                    </Form.Group>
                </Col>
            </Row>

            <Row>
                <Col md={4}>
                    <Form.Group className="mb-3">
                        <Form.Label htmlFor="bluesky">Bluesky URL</Form.Label>
                        <Form.Control
                            id="bluesky"
                            type="url"
                            name="bluesky"
                            defaultValue={event?.bluesky || ""}
                        />
                    </Form.Group>
                </Col>
                <Col md={4}>
                    <Form.Group className="mb-3">
                        <Form.Label htmlFor="discord">Discord URL</Form.Label>
                        <Form.Control
                            id="discord"
                            type="url"
                            name="discord"
                            defaultValue={event?.discord || ""}
                        />
                    </Form.Group>
                </Col>
                <Col md={4}>
                    <Form.Group className="mb-3">
                        <Form.Label htmlFor="oengus">Oengus URL</Form.Label>
                        <Form.Control
                            id="oengus"
                            type="url"
                            name="oengus"
                            defaultValue={event?.oengus || ""}
                        />
                    </Form.Group>
                </Col>
            </Row>

            <Form.Group className="mb-3">
                <Form.Label htmlFor="shortDescription">
                    Short Description <EventFieldRequired />
                </Form.Label>
                <Form.Control
                    id="shortDescription"
                    as="textarea"
                    rows={2}
                    name="shortDescription"
                    defaultValue={event?.shortDescription || ""}
                    required
                    maxLength={255}
                />
            </Form.Group>

            <Form.Group className="mb-3">
                <Form.Label htmlFor="description">
                    Description <EventFieldRequired />
                </Form.Label>

                <Tiptap
                    onChange={setEditorContent}
                    initialContent={editorContent}
                />

                <input
                    required
                    type="hidden"
                    id="description"
                    name="description"
                    value={editorContent}
                />
            </Form.Group>

            {event && (
                <input
                    type="hidden"
                    required
                    id="eventId"
                    name="eventId"
                    value={event.id}
                />
            )}

            <Row>
                <Col>
                    <EventTagInput event={event} />
                </Col>
            </Row>

            <Row>
                <Col md={6}>
                    <Form.Group className="mb-3">
                        <Form.Label htmlFor="eventImage">
                            Upload Event Image
                        </Form.Label>
                        <Form.Control
                            id="eventImage"
                            type="file"
                            name="image"
                        />
                    </Form.Group>
                </Col>
                {event?.imageUrl && (
                    <Col md={6}>
                        Current image:
                        <Image
                            height={300}
                            width={300}
                            src={event.imageUrl}
                            alt={event.name}
                        />
                    </Col>
                )}
            </Row>

            <Button variant="primary" type="submit">
                {event ? "Save Event" : "Create Event"}
            </Button>
        </>
    );
};
