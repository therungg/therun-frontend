import { Col, Form, Row } from "react-bootstrap";
import { Button } from "~src/components/Button/Button";
import React from "react";
import { Event } from "../../../types/events.types";

export const EventForm = ({ event }: { event?: Event }) => {
    return (
        <>
            <Row>
                <Col md={6}>
                    <Form.Group className="mb-3">
                        <Form.Label>Event Name</Form.Label>
                        <Form.Control
                            type="text"
                            name="name"
                            defaultValue={event?.name || ""}
                            required
                        />
                    </Form.Group>
                </Col>
                <Col md={6}>
                    <Form.Group className="mb-3">
                        <Form.Label>Type</Form.Label>
                        <Form.Control
                            type="text"
                            name="type"
                            defaultValue={event?.type || ""}
                            required
                        />
                    </Form.Group>
                </Col>
            </Row>

            <Row>
                <Col md={6}>
                    <Form.Group className="mb-3">
                        <Form.Label>Starts At</Form.Label>
                        <Form.Control
                            type="datetime-local"
                            name="startsAt"
                            defaultValue={event?.startsAt.toISOString() || ""}
                            required
                        />
                    </Form.Group>
                </Col>
                <Col md={6}>
                    <Form.Group className="mb-3">
                        <Form.Label>Ends At</Form.Label>
                        <Form.Control
                            type="datetime-local"
                            name="endsAt"
                            defaultValue={event?.endsAt.toISOString() || ""}
                            required
                        />
                    </Form.Group>
                </Col>
            </Row>

            <Form.Group className="mb-3">
                <Form.Label>Location</Form.Label>
                <Form.Control
                    type="text"
                    name="location"
                    defaultValue={event?.location || ""}
                />
            </Form.Group>

            <Row>
                <Col md={6}>
                    <Form.Group className="mb-3">
                        <Form.Label>Bluesky URL</Form.Label>
                        <Form.Control
                            type="url"
                            name="bluesky"
                            defaultValue={event?.bluesky || ""}
                        />
                    </Form.Group>
                </Col>
                <Col md={6}>
                    <Form.Group className="mb-3">
                        <Form.Label>Discord URL</Form.Label>
                        <Form.Control
                            type="url"
                            name="discord"
                            defaultValue={event?.discord || ""}
                        />
                    </Form.Group>
                </Col>
            </Row>

            <Form.Group className="mb-3">
                <Form.Label>Language</Form.Label>
                <Form.Control
                    type="text"
                    name="language"
                    defaultValue={event?.language || ""}
                    required
                />
            </Form.Group>

            <Form.Group className="mb-3">
                <Form.Label>Short Description</Form.Label>
                <Form.Control
                    as="textarea"
                    rows={2}
                    name="shortDescription"
                    defaultValue={event?.shortDescription || ""}
                    required
                />
            </Form.Group>

            <Form.Group className="mb-3">
                <Form.Label>Description</Form.Label>
                <Form.Control
                    as="textarea"
                    rows={4}
                    name="description"
                    defaultValue={event?.description || ""}
                    required
                />
            </Form.Group>

            <Row>
                <Col md={6}>
                    <Form.Group className="mb-3">
                        <Form.Label>Event URL</Form.Label>
                        <Form.Control
                            type="url"
                            name="url"
                            defaultValue={event?.url || ""}
                        />
                    </Form.Group>
                </Col>
                <Col md={6}>
                    <Form.Group className="mb-3">
                        <Form.Label>Image URL</Form.Label>
                        <Form.Control
                            type="url"
                            name="imageUrl"
                            defaultValue={event?.imageUrl || ""}
                        />
                    </Form.Group>
                </Col>
            </Row>

            <Button variant="primary" type="submit">
                {event ? "Edit Event" : "Create Event"}
            </Button>
        </>
    );
};
