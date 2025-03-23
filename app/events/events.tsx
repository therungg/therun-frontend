"use client";

import { Can } from "~src/rbac/Can.component";
import Link from "next/link";
import { IconButton } from "~src/components/Button/IconButton";
import { PlusIcon } from "~src/icons/plus-icon";
import { Col, Row } from "react-bootstrap";
import { EventWithOrganizerName } from "../../types/events.types";
import { SpeedrunEventCard } from "./event-card";
import { Paginate } from "~src/components/server-pagination/Paginate";
import { PaginatedData } from "~src/components/pagination/pagination.types";

export const Events = ({
    events,
}: {
    events: PaginatedData<EventWithOrganizerName>;
}) => {
    return (
        <div>
            <Row className="mb-3">
                <Col md={12} lg={7} className="d-flex">
                    <h1>Events</h1>
                </Col>
                <Col
                    md={12}
                    lg={5}
                    className="d-flex mt-3 mt-lg-0 justify-content-end align-items-center"
                >
                    <Can I="create" an="event">
                        <Link href="/events/create">
                            <IconButton
                                icon={<PlusIcon />}
                                iconPosition="right"
                            >
                                Create new event
                            </IconButton>
                        </Link>
                    </Can>
                </Col>
            </Row>
            {events.items.map((event) => {
                return <SpeedrunEventCard event={event} key={event.id} />;
            })}
            <Paginate data={events} />
        </div>
    );
};
