'use client';

import clsx from 'clsx';
import Image from 'next/image';
import Link from 'next/link';
import { FC, PropsWithChildren } from 'react';
import { Col, Row } from 'react-bootstrap';
import { FaCalendarAlt, FaMapMarkerAlt, FaUser } from 'react-icons/fa';
import { EventFromSearch } from '../../../types/events.types';
import styles from './event.styles.module.css';
import { EventBadges } from './event-badges';
import { EventDates } from './event-dates';
import { EventLocation } from './event-location';

export const SpeedrunEventCard = ({ event }: { event: EventFromSearch }) => {
    return (
        <Link
            href={`/events/${event.slug}`}
            className="text-decoration-none"
            prefetch={false}
        >
            <div
                className={clsx(
                    'container-fluid p-0 game-border mt-3 rounded-4 d-flex align-items-center shadow-lg border',
                    styles['event-card'],
                )}
            >
                <Row className={styles['event-card-row']}>
                    <Col xl={3} lg={12}>
                        <div className="w-100 h-100 d-flex justify-content-center align-items-center">
                            <Image
                                alt={event.name}
                                src={
                                    event.imageUrl ??
                                    '/logo_dark_theme_no_text_transparent.png'
                                }
                                height={180}
                                width={280}
                                style={{ objectFit: 'contain' }}
                                className="rounded-4 ms-xl-2"
                            />
                        </div>
                    </Col>
                    <Col xl={9} lg={12} className="ps-xl-2">
                        <div className="px-3 pb-3 pt-xl-3 d-flex flex-column justify-content-between w-100">
                            <span className="fs-2 fw-bold color-text">
                                {event.name}
                            </span>
                            <EventBadges event={event} />
                            <div className="d-flex mt-3 w-100">
                                <Row className="w-100 g-1">
                                    <Col xl={4}>
                                        <EventCardInfo>
                                            <FaUser className="me-2 text-primary" />
                                            <span className="ms-1 color-text">
                                                {event.organizer}
                                            </span>
                                        </EventCardInfo>
                                    </Col>
                                    <Col xl={4}>
                                        <EventCardInfo>
                                            <FaCalendarAlt className="me-2 text-primary" />
                                            <span className="color-text">
                                                <EventDates event={event} />
                                            </span>
                                        </EventCardInfo>
                                    </Col>
                                    <Col xl={4}>
                                        <EventCardInfo>
                                            <FaMapMarkerAlt className="me-2 text-danger" />
                                            <span className="ms-1 color-text">
                                                <EventLocation
                                                    location={
                                                        !event.isOffline
                                                            ? 'Online'
                                                            : (event.location as string)
                                                    }
                                                    margin={2}
                                                />
                                            </span>
                                        </EventCardInfo>
                                    </Col>
                                </Row>
                            </div>
                            <div className="mt-2">
                                <span className="text-muted">
                                    | {event.shortDescription}
                                </span>
                            </div>
                        </div>
                    </Col>
                </Row>
            </div>
        </Link>
    );
};

const EventCardInfo: FC<PropsWithChildren> = ({ children }) => {
    return (
        <div
            className={clsx(
                'd-flex align-items-center px-3 py-2 rounded border',
                styles['event-card-info'],
            )}
        >
            {children}
        </div>
    );
};
