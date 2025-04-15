"use client";

import { Can } from "~src/rbac/Can.component";
import Link from "next/link";
import { IconButton } from "~src/components/Button/IconButton";
import { PlusIcon } from "~src/icons/plus-icon";
import { Col, Row } from "react-bootstrap";
import { EventFromSearch } from "../../../types/events.types";
import { SpeedrunEventCard } from "./event-card";
import { Paginate } from "~src/components/server-pagination/Paginate";
import { PaginatedData } from "~src/components/pagination/pagination.types";
import { SearchResponse } from "algoliasearch";
import { EventSearch } from "./event-search";
import { EventFilters } from "./event-filters";

export const Events = ({
    events,
    pagination,
}: {
    events: SearchResponse<EventFromSearch>;
    pagination: PaginatedData<EventFromSearch>;
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
            <Row>
                <Col xl={2} lg={3} md={4} sm={5} xs={12}>
                    <EventFilters filters={events.facets!} />
                </Col>
                <Col xl={10} lg={9} md={8} sm={7} xs={12}>
                    <section>
                        <EventSearch />
                        <Row>
                            {events.hits.map((event) => {
                                return (
                                    <Col key={event.id} xl={12} lg={6} md={12}>
                                        <Link
                                            href={`/events/${event.slug}`}
                                            className="text-decoration-none"
                                        >
                                            <SpeedrunEventCard event={event} />
                                        </Link>
                                    </Col>
                                );
                            })}
                        </Row>
                        <Paginate data={pagination} />
                    </section>
                </Col>
            </Row>
        </div>
    );
};
