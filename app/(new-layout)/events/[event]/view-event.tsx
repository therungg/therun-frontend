'use client';

import clsx from 'clsx';
import Image from 'next/image';
import { redirect, usePathname } from 'next/navigation';
import { Col, Row } from 'react-bootstrap';
import {
    FaCalendarAlt,
    FaFileAlt,
    FaHeart,
    FaLink,
    FaMapMarkerAlt,
    FaTags,
    FaUserAlt,
} from 'react-icons/fa';
import {
    FaBluesky,
    FaDiscord,
    FaRetweet,
    FaRocket,
    FaTwitch,
    FaTwitter,
} from 'react-icons/fa6';
import { Button } from '~src/components/Button/Button';
import {
    Breadcrumb,
    BreadcrumbItem,
} from '~src/components/breadcrumbs/breadcrumb';
import Link from '~src/components/link';
import { Can, subject } from '~src/rbac/Can.component';
import { EventWithOrganizerName } from '../../../../types/events.types';
import { deleteEventAction } from '../actions/delete-event.action';
import styles from '../event.styles.module.scss';
import { EventBadges } from '../event-badges';
import { EventDates } from '../event-dates';
import { EventLocation } from '../event-location';

export const ViewEvent = ({ event }: { event: EventWithOrganizerName }) => {
    const breadcrumbs: BreadcrumbItem[] = [
        { content: 'Events', href: '/events' },
        { content: event.name, href: '/events/' + event.id },
    ];
    const pathname = usePathname();

    console.log(pathname);

    return (
        <>
            <div className="d-flex justify-content-between">
                <Breadcrumb breadcrumbs={breadcrumbs} />

                <div className="d-flex justify-content-end">
                    <Can I="edit" this={subject('event', event)}>
                        <Link href={`/events/${event.id}/edit`}>
                            <Button>Edit Event</Button>
                        </Link>
                    </Can>
                    <Can I="delete" this={subject('event', event)}>
                        <Button
                            className="ms-2"
                            variant="danger"
                            onClick={async () => {
                                if (
                                    confirm(
                                        'Are you sure you want to delete this event?',
                                    )
                                ) {
                                    await deleteEventAction(event.id);

                                    redirect('/events');
                                }
                            }}
                        >
                            Delete Event
                        </Button>
                    </Can>
                </div>
            </div>
            <div className="mt-3">
                <div
                    className={clsx(
                        'container-fluid p-0 mt-3 d-flex align-items-center',
                        styles.detailHero,
                    )}
                >
                    <Row className={styles.eventCardRow}>
                        <Col xl={2} lg={3} md={4} sm={5}>
                            <div className="w-100 d-flex justify-content-center align-items-center">
                                <Image
                                    alt={event.name}
                                    src={
                                        event.imageUrl ??
                                        '/logo_dark_theme_no_text_transparent.png'
                                    }
                                    height={200}
                                    width={200}
                                    style={{ objectFit: 'contain' }}
                                    className="rounded-3 ms-xl-1"
                                />
                            </div>
                        </Col>
                        <Col xl={10} lg={9} md={8} sm={7}>
                            <div className="ms-4 pt-4">
                                <h1 className={styles.eventCardTitle}>
                                    {event.name}
                                </h1>
                                <p className="mb-1">
                                    <EventDates event={event} />
                                </p>
                                <div className="d-flex">
                                    <EventBadges event={event} />
                                </div>
                                <div
                                    className={clsx(
                                        styles.eventCardDescription,
                                        'mb-3',
                                    )}
                                >
                                    {event.shortDescription}
                                </div>
                            </div>
                        </Col>
                    </Row>
                </div>

                {/* Description and Details Section */}
                <div className={clsx(styles.detailSection, 'mt-4')}>
                    <Row className="row-gap-3 mb-2">
                        <Col xl={8} lg={8}>
                            <h3 className={styles.detailSectionTitle}>
                                <FaFileAlt className="me-2 mb-1 text-primary" />
                                Event Description
                            </h3>
                            <div
                                className={styles.detailDescription}
                                dangerouslySetInnerHTML={{
                                    __html: event.description,
                                }}
                            ></div>
                        </Col>
                        <Col xl={4} lg={4}>
                            <h3 className={styles.detailSectionTitle}>
                                <FaHeart className="me-2 text-primary" />
                                Event Details
                            </h3>
                            <div className={styles.detailInfoPanel}>
                                <div className={styles.detailInfoItem}>
                                    <FaUserAlt
                                        className={clsx(
                                            'text-primary',
                                            styles.detailInfoIcon,
                                        )}
                                    />
                                    <div className="ms-2 mb-1">
                                        <div className={styles.detailInfoLabel}>
                                            Organizer
                                        </div>
                                        <div className={styles.detailInfoValue}>
                                            {event.organizerName}
                                        </div>
                                    </div>
                                </div>
                                {event.location && (
                                    <div className={styles.detailInfoItem}>
                                        <FaMapMarkerAlt
                                            className={clsx(
                                                'text-danger',
                                                styles.detailInfoIcon,
                                            )}
                                        />
                                        <div className="ms-2 mb-1">
                                            <div
                                                className={
                                                    styles.detailInfoLabel
                                                }
                                            >
                                                Location
                                            </div>
                                            <div
                                                className={
                                                    styles.detailInfoValue
                                                }
                                            >
                                                <EventLocation
                                                    location={event.location}
                                                    margin={2}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}
                                <div className={styles.detailInfoItem}>
                                    <FaCalendarAlt
                                        className={clsx(
                                            'text-primary',
                                            styles.detailInfoIcon,
                                        )}
                                    />
                                    <div className="ms-2 mb-1">
                                        <div className={styles.detailInfoLabel}>
                                            Dates
                                        </div>
                                        <div className={styles.detailInfoValue}>
                                            <EventDates event={event} />
                                        </div>
                                    </div>
                                </div>
                                {event.isForCharity && (
                                    <div className={styles.detailInfoItem}>
                                        <FaHeart
                                            className={clsx(
                                                'text-danger',
                                                styles.detailInfoIcon,
                                            )}
                                        />
                                        <div className="ms-2 mb-1">
                                            <div
                                                className={
                                                    styles.detailInfoLabel
                                                }
                                            >
                                                Charity
                                            </div>
                                            <div
                                                className={
                                                    styles.detailInfoValue
                                                }
                                            >
                                                {event.charityName ||
                                                    'Event is for charity!'}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div className="mt-2">
                                <h3 className={styles.detailSectionTitle}>
                                    <FaLink className="text-primary" /> Links
                                </h3>

                                <div className={styles.detailInfoPanel}>
                                    <EventLink
                                        text="Event URL"
                                        url={
                                            event.url ??
                                            'https://therun.gg/events/' +
                                                event.slug
                                        }
                                    />
                                    <EventLink
                                        text="Schedule URL"
                                        url={event.scheduleUrl}
                                    />
                                    <EventLink
                                        text="Twitch URL"
                                        url={event.twitch}
                                    />
                                    <EventLink
                                        text="Charity URL"
                                        url={event.charityUrl}
                                    />
                                    <EventLink
                                        text="Discord URL"
                                        url={event.discord}
                                    />
                                    <EventLink
                                        text="Bluesky URL"
                                        url={event.bluesky}
                                    />
                                    <EventLink
                                        text={
                                            event.submissionsUrl &&
                                            event.submissionsUrl
                                                .toLowerCase()
                                                .includes('oengus')
                                                ? 'Oengus URL'
                                                : 'Submissions URL'
                                        }
                                        url={event.submissionsUrl}
                                    />
                                    <EventLink
                                        text="Twitter URL"
                                        url={event.twitter}
                                    />
                                </div>
                                {event.restreams &&
                                    event.restreams.length > 0 && (
                                        <div className="mt-2">
                                            <h3
                                                className={
                                                    styles.detailSectionTitle
                                                }
                                            >
                                                <FaRetweet className="text-primary" />{' '}
                                                Restreams
                                            </h3>

                                            <div
                                                className={
                                                    styles.detailInfoPanel
                                                }
                                            >
                                                {event.restreams.map(
                                                    (restream) => {
                                                        return (
                                                            <div
                                                                className={
                                                                    styles.detailLink
                                                                }
                                                                key={
                                                                    restream.language
                                                                }
                                                            >
                                                                <FaRetweet
                                                                    className={clsx(
                                                                        'text-primary',
                                                                        styles.detailInfoIcon,
                                                                    )}
                                                                />
                                                                <div
                                                                    className="ms-2 mb-1"
                                                                    style={{
                                                                        minWidth: 0,
                                                                        flex: 1,
                                                                    }}
                                                                >
                                                                    <div
                                                                        className={
                                                                            styles.detailInfoLabel
                                                                        }
                                                                    >
                                                                        {
                                                                            restream.language
                                                                        }{' '}
                                                                        restream
                                                                        by{' '}
                                                                        {
                                                                            restream.organizer
                                                                        }
                                                                    </div>
                                                                    <div
                                                                        className={
                                                                            styles.detailInfoValue
                                                                        }
                                                                    >
                                                                        <a
                                                                            href={
                                                                                restream.url
                                                                            }
                                                                            className="color-text"
                                                                            rel="noreferrer"
                                                                            target="_blank"
                                                                            style={{
                                                                                width: '100%',
                                                                                overflow:
                                                                                    'hidden',
                                                                                textOverflow:
                                                                                    'ellipsis',
                                                                                whiteSpace:
                                                                                    'nowrap',
                                                                            }}
                                                                        >
                                                                            {
                                                                                restream.url
                                                                            }
                                                                        </a>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        );
                                                    },
                                                )}
                                            </div>
                                        </div>
                                    )}
                            </div>
                        </Col>
                    </Row>
                    <h3
                        className={clsx(
                            styles.detailSectionTitle,
                            'mt-3 mt-md-0',
                        )}
                    >
                        <FaTags className="me-2 text-primary" />
                        Event Tags
                    </h3>
                    <div>
                        {(event.tags ?? []).map((tag) => {
                            return (
                                <span key={tag} className={styles.eventTag}>
                                    {tag}
                                </span>
                            );
                        })}
                    </div>
                </div>
            </div>
        </>
    );
};

const EventLink = ({ text, url }: { text: string; url: string | null }) => {
    let Icon = FaLink;
    let iconColor = 'var(--bs-gold)';

    if (text.toLowerCase().includes('charity')) {
        Icon = FaHeart;
        iconColor = 'var(--bs-danger)';
    }
    if (text.toLowerCase().includes('bluesky')) {
        Icon = FaBluesky;
        iconColor = '#36c';
    }
    if (text.toLowerCase().includes('discord')) {
        Icon = FaDiscord;
        iconColor = '#7289d9';
    }
    if (text.toLowerCase().includes('twitch')) {
        Icon = FaTwitch;
        iconColor = '#6441a5';
    }
    if (text.toLowerCase().includes('twitter')) {
        Icon = FaTwitter;
        iconColor = '#1DA1F2';
    }
    if (
        text.toLowerCase().includes('submissions') ||
        text.toLowerCase().includes('oengus')
    ) {
        Icon = FaRocket;
        iconColor = 'var(--bs-primary)';
    }

    return (
        <>
            {url && (
                <div className={styles.detailLink}>
                    <Icon
                        className={styles.detailInfoIcon}
                        style={{ color: iconColor }}
                    />
                    <div className="ms-2 mb-1" style={{ minWidth: 0, flex: 1 }}>
                        <div className={styles.detailInfoLabel}>{text}</div>
                        <div className={styles.detailInfoValue}>
                            <a href={url} rel="noreferrer" target="_blank">
                                {url}
                            </a>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};
