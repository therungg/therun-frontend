'use client';

import Link from 'next/link';
import { Col, Row } from 'react-bootstrap';
import { IconButton } from '~src/components/Button/IconButton';
import { Paginate } from '~src/components/server-pagination/Paginate';
import { PlusIcon } from '~src/icons/plus-icon';
import { EventSearchResult } from '~src/lib/events';
import { Can } from '~src/rbac/Can.component';
import styles from './event.styles.module.scss';
import { SpeedrunEventCard } from './event-card';
import { EventFilters } from './event-filters';
import { EventSearch } from './event-search';

export const Events = ({ events }: { events: EventSearchResult }) => {
    return (
        <div>
            <div className={styles.pageHeader}>
                <h1 className={styles.pageTitle}>Events</h1>
                <Can I="create" an="event">
                    <Link href="/events/create" prefetch={false}>
                        <IconButton icon={<PlusIcon />} iconPosition="right">
                            Create new event
                        </IconButton>
                    </Link>
                </Can>
            </div>
            <Row>
                <Col xl={2} lg={3} md={4} sm={5} xs={12}>
                    <EventFilters filters={events.facets} />
                </Col>
                <Col xl={10} lg={9} md={8} sm={7} xs={12}>
                    <section>
                        <EventSearch />
                        <Row>
                            {events.items.map((event) => {
                                return (
                                    <Col key={event.id} xl={12} lg={6} md={12}>
                                        <Link
                                            href={`/events/${event.slug}`}
                                            className="card-link-wrapper"
                                            prefetch={false}
                                        >
                                            <SpeedrunEventCard event={event} />
                                        </Link>
                                    </Col>
                                );
                            })}
                        </Row>
                        <Paginate data={events} />
                    </section>
                </Col>
            </Row>
        </div>
    );
};
