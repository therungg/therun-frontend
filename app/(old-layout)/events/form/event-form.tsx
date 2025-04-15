"use client";

import { Col, Form, Modal, Row } from "react-bootstrap";
import { Button } from "~src/components/Button/Button";
import React, { ReactElement, useEffect, useState } from "react";
import {
    Event,
    EventOrganizer,
    eventTypes,
    eventTierNames,
    EventRestream,
} from "../../../../types/events.types";
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
    const [selectedIsForCharity, setSelectedIsForCharity] = useState(
        event?.isForCharity || false,
    );
    const [editorContent, setEditorContent] = useState<string>(
        event?.description || "",
    );
    const [slug, setSlug] = useState<string>(event?.slug || "");

    // --- Restream State ---
    // Initialize with one empty restream row, or existing data if available
    // For simplicity, assuming event.restreams is the correct structure if it exists
    const [restreams, setRestreams] = useState<EventRestream[]>(
        (event?.restreams as EventRestream[]) || [
            { language: "", url: "", organizer: "" },
        ],
    );
    // --- End Restream State ---

    const [showModal, setShowModal] = useState("");

    const fetchEventOrganizers = async () => {
        const organizers = await getAllEventOrganizers();
        setEventOrganizers(organizers);
    };

    useEffect(() => {
        fetchEventOrganizers();
    }, []);

    const handleAddOrganizer = async () => {
        if (newOrganizerName.trim()) {
            try {
                const newOrganizer = await createEventOrganizer({
                    name: newOrganizerName.trim(),
                });
                setNewOrganizerName("");
                await fetchEventOrganizers(); // Refetch to update the list
                toast.success("Organizer added successfully");
                // Automatically select the newly added organizer
                if (newOrganizer) {
                    setSelectedOrganizerId(newOrganizer.id);
                }
            } catch (error) {
                toast.error("Failed to add organizer.");
                console.error("Error adding organizer:", error);
            }
        }
    };

    // --- Restream Handlers ---
    const handleRestreamChange = (
        index: number,
        field: keyof EventRestream,
        value: string,
    ) => {
        const updatedRestreams = [...restreams];
        updatedRestreams[index] = {
            ...updatedRestreams[index],
            [field]: value,
        };
        setRestreams(updatedRestreams);
    };

    const addRestreamRow = () => {
        if (restreams.length < 10) {
            setRestreams([
                ...restreams,
                { language: "", url: "", organizer: "" },
            ]);
        } else {
            toast.warn("Maximum of 10 restreams allowed.");
        }
    };

    const removeRestreamRow = (index: number) => {
        const updatedRestreams = restreams.filter((_, i) => i !== index);
        setRestreams(updatedRestreams);
    };

    const ExplanationModal = ({
        header,
        text,
    }: {
        header: string;
        text: string | ReactElement;
    }) => {
        const handleClose = () => setShowModal("");
        const handleShow = () => setShowModal(header);

        return (
            <>
                <a
                    href="#"
                    className="text-muted ms-2 fs-small cursor-pointer"
                    onClick={(e) => {
                        e.preventDefault();
                        handleShow();
                    }}
                >
                    Explanation
                </a>

                <Modal
                    show={showModal === header}
                    onHide={handleClose}
                    centered
                >
                    <Modal.Header closeButton>
                        <Modal.Title>{header}</Modal.Title>
                    </Modal.Header>
                    <Modal.Body>{text}</Modal.Body>
                    <Modal.Footer>
                        <Button variant="secondary" onClick={handleClose}>
                            Ok I get it
                        </Button>
                    </Modal.Footer>
                </Modal>
            </>
        );
    };

    // Memoize language options to avoid recalculating on every render
    const languageOptions = React.useMemo(
        () => Array.from(Object.entries(languages())),
        [],
    );
    const countryOptions = React.useMemo(
        () => Array.from(Object.entries(countries())),
        [],
    );

    return (
        <>
            {/* Sections 1, 2, 3 remain the same... */}
            <h5>1. Core Event Information</h5>
            <Row>
                <Col md={6} lg={3}>
                    <Form.Group>
                        {" "}
                        {/* Added mb-3 */}
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
                <Col md={6} lg={3}>
                    <Form.Group>
                        {" "}
                        {/* Added mb-3 */}
                        <Form.Label htmlFor="slug">
                            URL (therun.gg/events/{slug}) <EventFieldRequired />
                        </Form.Label>
                        <Form.Control
                            id="slug"
                            type="text"
                            name="slug"
                            value={slug}
                            required
                            minLength={1}
                            maxLength={50}
                            onChange={(e) => {
                                const value = e.target.value
                                    .toLowerCase()
                                    .replace(/\s+/g, "-")
                                    .replace(/[^a-z0-9-]/g, "");
                                setSlug(value);
                            }}
                        />
                        <Form.Text>
                            {"https://therun.gg/events/<the-url-you-input>"}
                        </Form.Text>
                    </Form.Group>
                </Col>
                <Col md={6} lg={3}>
                    <Form.Group>
                        {" "}
                        {/* Added mb-3 */}
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
                <Col md={6} lg={3}>
                    <Form.Group>
                        {" "}
                        {/* Added mb-3 */}
                        <Form.Label htmlFor="eventTier">
                            Tier <EventFieldRequired />
                            <ExplanationModal
                                key="Event Tier"
                                header="Event Tier"
                                text="This is hard to decide sometimes, but it is useful for users to be able to find events by size. Please make an educated guess based on the amount of entrants, viewers, significance, donations, etc. Discuss with Joey if unclear."
                            />
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

            <hr className="my-4" />

            <h5>2. Date & Location</h5>
            <Row>
                <Col md={4}>
                    <Form.Group>
                        <Form.Label htmlFor="isOffline">
                            Event Format
                        </Form.Label>
                        <Form.Check
                            id="isOffline"
                            type="checkbox"
                            name="isOffline"
                            checked={selectedIsOffline}
                            onChange={(e) =>
                                setSelectedIsOffline(e.target.checked)
                            }
                            label="The event is held (at least partially) in-person"
                        />
                        <Form.Text>
                            Select this if your event happens, at least
                            partially, in-person with other people.
                        </Form.Text>
                    </Form.Group>
                </Col>
                <Col md={4}>
                    <Form.Group>
                        <Form.Label htmlFor="language">
                            Primary Language <EventFieldRequired />
                        </Form.Label>
                        <Form.Select
                            id="language"
                            name="language"
                            defaultValue={event?.language || "English"}
                            required // Added required
                        >
                            {/* Removed placeholder option as defaultValue is set */}
                            {languageOptions.map(([_, value]) => {
                                return (
                                    <option key={value} value={value}>
                                        {value}
                                    </option>
                                );
                            })}
                        </Form.Select>
                        <Form.Text>
                            Enter the primary language that is spoken in the
                            venue, or on the stream.
                        </Form.Text>
                    </Form.Group>
                </Col>
                <Col md={4}>
                    {selectedIsOffline && (
                        <Form.Group>
                            <Form.Label htmlFor="location">
                                Location (Country) <EventFieldRequired />{" "}
                                {/* Added required indication */}
                            </Form.Label>
                            <Form.Select
                                id="location"
                                name="location"
                                defaultValue={event?.location || ""}
                                disabled={!selectedIsOffline}
                                required={selectedIsOffline} // Conditionally required
                            >
                                <option value="">Select Country</option>
                                {countryOptions.map(([key, value]) => {
                                    return (
                                        <option key={key} value={key}>
                                            {value}
                                        </option>
                                    );
                                })}
                            </Form.Select>
                            {/* Removed disabled attribute */}
                            {/* Removed Form.Text */}
                        </Form.Group>
                    )}
                </Col>
            </Row>
            <Row>
                <Col md={6}>
                    <Form.Group>
                        {" "}
                        {/* Added mb-3 */}
                        <Form.Label htmlFor="startsAt">
                            Start Date & Time <EventFieldRequired />
                        </Form.Label>
                        <Form.Control
                            id="startsAt"
                            type="datetime-local"
                            name="startsAt"
                            defaultValue={
                                event?.startsAt
                                    ? new Date(
                                          new Date(event.startsAt).getTime() -
                                              new Date().getTimezoneOffset() *
                                                  60000,
                                      ) // Adjust for local timezone for input default
                                          .toISOString()
                                          .slice(0, 16)
                                    : ""
                            }
                            required
                        />
                    </Form.Group>
                </Col>
                <Col md={6}>
                    <Form.Group>
                        {" "}
                        {/* Added mb-3 */}
                        <Form.Label htmlFor="endsAt">
                            End Date & Time <EventFieldRequired />
                        </Form.Label>
                        <Form.Control
                            id="endsAt"
                            type="datetime-local"
                            name="endsAt"
                            defaultValue={
                                event?.endsAt
                                    ? new Date(
                                          new Date(event.endsAt).getTime() -
                                              new Date().getTimezoneOffset() *
                                                  60000,
                                      ) // Adjust for local timezone
                                          .toISOString()
                                          .slice(0, 16)
                                    : ""
                            }
                            required
                        />
                    </Form.Group>
                </Col>
            </Row>

            <hr className="my-4" />

            <h5>3. Organization</h5>
            <Row className="align-items-end mb-3">
                {" "}
                {/* Added mb-3 */}
                <Col md={6}>
                    <Form.Group>
                        <Form.Label htmlFor="organizer">
                            Event Organizer <EventFieldRequired />
                        </Form.Label>
                        <Form.Select
                            id="organizer"
                            name="organizerId"
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
                        <Form.Text muted>
                            Select the person/organization/group organizing this
                            event. If you are sure it is not already in the
                            list, add a new Organizer.
                        </Form.Text>
                    </Form.Group>
                </Col>
                <Col md={6}>
                    <Form.Group>
                        <Form.Label htmlFor="newOrganizerName">
                            Add New Event Organizer
                        </Form.Label>
                        <Row>
                            <Col xs={8} sm={9}>
                                <Form.Control
                                    id="newOrganizerName"
                                    type="text"
                                    value={newOrganizerName}
                                    onChange={(e) =>
                                        setNewOrganizerName(e.target.value)
                                    }
                                    placeholder="New Organizer Name"
                                />
                            </Col>
                            <Col xs={4} sm={3}>
                                <Button
                                    onClick={handleAddOrganizer}
                                    variant="secondary"
                                    className="w-100"
                                    disabled={!newOrganizerName.trim()}
                                >
                                    Add
                                </Button>
                            </Col>
                        </Row>
                        <Form.Text muted>
                            Used to search for events by Organizer.
                        </Form.Text>
                    </Form.Group>
                </Col>
            </Row>

            <hr className="my-4" />

            <h5>4. Online Presence & Links</h5>
            <Row>
                <Col md={4}>
                    <Form.Group>
                        <Form.Label htmlFor="url">Event Website URL</Form.Label>
                        <Form.Control
                            id="url"
                            type="url"
                            name="url"
                            placeholder="https://..."
                            defaultValue={event?.url || ""}
                        />
                    </Form.Group>
                </Col>
                <Col md={4}>
                    <Form.Group>
                        <Form.Label htmlFor="scheduleUrl">
                            Schedule URL
                        </Form.Label>
                        <Form.Control
                            id="scheduleUrl"
                            type="url"
                            name="scheduleUrl"
                            placeholder="https://horaro.org/..."
                            defaultValue={event?.scheduleUrl || ""}
                        />
                    </Form.Group>
                </Col>
                <Col md={4}>
                    <Form.Group>
                        <Form.Label htmlFor="twitch">Twitch URL </Form.Label>
                        <Form.Control
                            id="twitch"
                            type="url"
                            name="twitch"
                            placeholder="https://twitch.tv/..."
                            defaultValue={event?.twitch || ""}
                        />
                    </Form.Group>
                </Col>
            </Row>
            <Row>
                <Col md={3}>
                    <Form.Group>
                        {" "}
                        {/* Added mb-3 */}
                        <Form.Label htmlFor="discord">Discord URL </Form.Label>
                        <Form.Control
                            id="discord"
                            type="url"
                            name="discord"
                            placeholder="https://discord.gg/..."
                            defaultValue={event?.discord || ""}
                        />
                    </Form.Group>
                </Col>
                <Col md={3}>
                    <Form.Group>
                        {" "}
                        {/* Added mb-3 */}
                        <Form.Label htmlFor="twitter">Twitter URL </Form.Label>
                        <Form.Control
                            id="twitter"
                            type="url"
                            name="twitter"
                            placeholder="https://twitter.com/..."
                            defaultValue={event?.twitter || ""}
                        />
                    </Form.Group>
                </Col>
                <Col md={3}>
                    <Form.Group>
                        {" "}
                        {/* Added mb-3 */}
                        <Form.Label htmlFor="submissionsUrl">
                            Submissions URL{" "}
                        </Form.Label>
                        <Form.Control
                            id="submissionsUrl"
                            type="url"
                            name="submissionsUrl"
                            placeholder="https://oengus.io/..."
                            defaultValue={event?.submissionsUrl || ""}
                        />
                    </Form.Group>
                </Col>
                <Col md={3}>
                    <Form.Group>
                        <Form.Label htmlFor="bluesky">Bluesky URL </Form.Label>
                        <Form.Control
                            id="bluesky"
                            type="url"
                            name="bluesky"
                            placeholder="https://bsky.app/..."
                            defaultValue={event?.bluesky || ""}
                        />
                    </Form.Group>
                </Col>
            </Row>

            <h6 className="mt-3">Restreams</h6>
            {restreams.map((restream, index) => (
                <Row key={`restream-${index}`} className="mb-3 align-items-end">
                    <Col md={3}>
                        <Form.Group>
                            <Form.Label htmlFor={`restreamLanguage${index}`}>
                                Language #{index + 1}
                            </Form.Label>
                            <Form.Select
                                id={`restreamLanguage${index}`}
                                name={`restreams[${index}].language`}
                                value={restream.language}
                                onChange={(e) =>
                                    handleRestreamChange(
                                        index,
                                        "language",
                                        e.target.value,
                                    )
                                }
                            >
                                <option value="">Select Language</option>
                                {languageOptions.map(([_, value]) => (
                                    <option key={value} value={value}>
                                        {value}
                                    </option>
                                ))}
                            </Form.Select>
                        </Form.Group>
                    </Col>

                    <Col md={4}>
                        <Form.Group>
                            <Form.Label htmlFor={`restreamUrl${index}`}>
                                URL #{index + 1}
                            </Form.Label>
                            <Form.Control
                                id={`restreamUrl${index}`}
                                type="url"
                                name={`restreams[${index}].url`}
                                placeholder="https://twitch.tv/restreamer"
                                value={restream.url}
                                onChange={(e) =>
                                    handleRestreamChange(
                                        index,
                                        "url",
                                        e.target.value,
                                    )
                                }
                            />
                        </Form.Group>
                    </Col>

                    <Col md={3}>
                        <Form.Group>
                            <Form.Label htmlFor={`restreamOrganizer${index}`}>
                                Organizer #{index + 1}
                            </Form.Label>
                            <Form.Control
                                id={`restreamOrganizer${index}`}
                                type="text"
                                name={`restreams[${index}].organizer`}
                                placeholder="Restream Organizer Name"
                                value={restream.organizer}
                                onChange={(e) =>
                                    handleRestreamChange(
                                        index,
                                        "organizer",
                                        e.target.value,
                                    )
                                }
                            />
                        </Form.Group>
                    </Col>

                    <Col md={2} className="text-end">
                        {restreams.length > 0 && (
                            <Button
                                variant="danger"
                                onClick={() => removeRestreamRow(index)}
                                aria-label={`Remove Restream ${index + 1}`}
                            >
                                Remove
                            </Button>
                        )}
                    </Col>
                </Row>
            ))}

            <Row>
                <Col className="text-start">
                    <Button
                        variant="secondary"
                        onClick={addRestreamRow}
                        disabled={restreams.length >= 10}
                    >
                        + Add Restream
                    </Button>
                    {restreams.length >= 10 && (
                        <Form.Text className="ms-2 text-muted">
                            Maximum 10 restreams reached.
                        </Form.Text>
                    )}
                </Col>
            </Row>

            <hr className="my-4" />

            <h5>5. Event Details & Content</h5>
            <Row>
                <Col>
                    <Form.Group>
                        <Form.Label htmlFor="shortDescription">
                            Short Description (Summary/Teaser){" "}
                            <EventFieldRequired />
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
                        <Form.Text muted>
                            This short description will show up as a quote in
                            the Event Overview. Keep it short and to the point
                            (max 255 characters).
                        </Form.Text>
                    </Form.Group>

                    <Form.Group>
                        <Form.Label htmlFor="description">
                            Full Event Description <EventFieldRequired />
                        </Form.Label>

                        <Tiptap
                            onChange={setEditorContent}
                            initialContent={editorContent}
                        />
                        <input
                            required={
                                !editorContent || editorContent === "<p></p>"
                            }
                            type="hidden"
                            id="description"
                            name="description"
                            value={editorContent}
                        />
                        <Form.Text muted>
                            This detailed description will show up on the Event
                            page. You can use basic formatting. Include details
                            like rules, schedule links, charity info, etc.
                        </Form.Text>
                    </Form.Group>

                    <Form.Group>
                        <EventTagInput event={event} />
                        <Form.Text muted>
                            Help users find your event (e.g., Charity, Marathon,
                            Europe). Press Enter to Submit.
                        </Form.Text>
                    </Form.Group>
                </Col>
            </Row>

            {event && (
                <input
                    type="hidden"
                    id="eventId"
                    name="eventId"
                    value={event.id}
                />
            )}

            <hr className="my-4" />

            <h5>6. Charity</h5>
            <Row className="align-items-center mb-3">
                {" "}
                {/* Added mb-3 */}
                <Col md={4}>
                    <Form.Group>
                        <Form.Label htmlFor="isForCharity">
                            Event is for Charity
                        </Form.Label>
                        <Form.Check
                            id="isForCharity"
                            type="checkbox"
                            name="isForCharity"
                            checked={selectedIsForCharity}
                            onChange={(e) =>
                                setSelectedIsForCharity(e.target.checked)
                            }
                            label="The event raises funds for a charity"
                        />
                    </Form.Group>
                </Col>
                {selectedIsForCharity && (
                    <>
                        <Col md={4}>
                            <Form.Group>
                                <Form.Label htmlFor="charityName">
                                    Charity Name <EventFieldRequired />
                                </Form.Label>
                                <Form.Control
                                    id="charityName"
                                    type="text"
                                    name="charityName"
                                    defaultValue={event?.charityName || ""}
                                    required={selectedIsForCharity}
                                />
                            </Form.Group>
                        </Col>
                        <Col md={4}>
                            <Form.Group>
                                <Form.Label htmlFor="charityUrl">
                                    Charity URL{" "}
                                </Form.Label>
                                <Form.Control
                                    id="charityUrl"
                                    type="url"
                                    name="charityUrl"
                                    placeholder="https://..."
                                    defaultValue={event?.charityUrl || ""}
                                />
                            </Form.Group>
                        </Col>
                    </>
                )}
            </Row>

            <hr className="my-4" />

            <h5>7. Visuals</h5>
            <Row className="align-items-center mb-3">
                <Col md={event?.imageUrl ? 6 : 12}>
                    <Form.Group>
                        <Form.Label htmlFor="eventImage">
                            {event?.imageUrl
                                ? "Upload New Event Logo (Optional)"
                                : "Upload Event Logo"}
                        </Form.Label>
                        <Form.Control
                            id="eventImage"
                            type="file"
                            name="image"
                            accept="image/png, image/jpeg, image/webp"
                        />
                    </Form.Group>
                    <Form.Text muted>
                        Recommended: Square image (e.g., 500x500px). Non-square
                        images may be cropped or distorted. Max file size: 10MB.
                        Formats: JPG, PNG, WEBP.
                    </Form.Text>
                </Col>
                {event?.imageUrl && (
                    <Col md={6} className="mb-3 text-center text-md-start">
                        <div>Current image:</div>
                        <Image
                            height={150}
                            width={150}
                            src={event.imageUrl}
                            alt={`${event.name} current logo`}
                            style={{
                                objectFit: "contain",
                                maxWidth: "100%",
                                height: "auto",
                                border: "1px solid #dee2e6",
                                borderRadius: "0.25rem",
                                marginTop: "0.5rem",
                            }}
                        />
                    </Col>
                )}
            </Row>

            <Row>
                <Col className="text-end">
                    <Button variant="primary" type="submit">
                        {event ? "Save Changes" : "Create Event"}
                    </Button>
                </Col>
            </Row>
        </>
    );
};
