"use client";

import Image from "next/image";
import { EventWithOrganizerName } from "../../../types/events.types";
import { Can, subject } from "~src/rbac/Can.component";
import { Button } from "~src/components/Button/Button";
import Link from "next/link";
import { deleteEventAction } from "../actions/delete-event.action";
import { redirect, usePathname } from "next/navigation";
import {
    Breadcrumb,
    BreadcrumbItem,
} from "~src/components/breadcrumbs/breadcrumb";
import { EventDates } from "../event-dates";
import { EventBadges } from "../event-badges";
import { Badge, Col, Row } from "react-bootstrap";
import {
    FaCalendarAlt,
    FaFileAlt,
    FaHeart,
    FaLink,
    FaMapMarkerAlt,
    FaTags,
    FaUserAlt,
} from "react-icons/fa";
import { EventLocation } from "../event-location";
import styles from "../event.styles.module.css";
import clsx from "clsx";
import {
    FaBluesky,
    FaDiscord,
    FaRetweet,
    FaRocket,
    FaTwitch,
    FaTwitter,
} from "react-icons/fa6";

export const ViewEvent = ({ event }: { event: EventWithOrganizerName }) => {
    const breadcrumbs: BreadcrumbItem[] = [
        { content: "Events", href: "/events" },
        { content: event.name, href: "/events/" + event.id },
    ];
    const pathname = usePathname();

    console.log(pathname);

    return (
        <>
            <div className="d-flex justify-content-between">
                <Breadcrumb breadcrumbs={breadcrumbs} />

                <div className="d-flex justify-content-end">
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
            <div className="mt-3">
                <div
                    className={clsx(
                        "container-fluid p-0 game-border mt-3 rounded-4 d-flex align-items-center shadow-lg border border-secondary",
                        styles["event-card"],
                    )}
                >
                    <Row className={clsx(styles["event-card-row"])}>
                        <Col xl={2} lg={3} md={4} sm={5}>
                            <div className="w-100 d-flex justify-content-center align-items-center">
                                <Image
                                    alt={event.name}
                                    src={
                                        event.imageUrl ??
                                        "/logo_dark_theme_no_text_transparent.png"
                                    }
                                    height={200}
                                    width={200}
                                    style={{ objectFit: "contain" }}
                                    className="rounded-4 ms-xl-1"
                                />
                            </div>
                        </Col>
                        <Col xl={10} lg={9} md={8} sm={7}>
                            <div className="ms-4 pt-4">
                                <h1 className="fw-bold">{event.name}</h1>
                                <p className="mb-1">
                                    <EventDates event={event} />
                                </p>
                                <div className="d-flex">
                                    <EventBadges event={event} />
                                </div>
                                <div className="card-text text-muted mt-3 border-start ps-2 mb-3">
                                    {event.shortDescription}
                                </div>
                            </div>
                        </Col>
                    </Row>
                </div>

                {/* Description and Details Section */}
                <div className="card mt-4">
                    <div className="card-body">
                        <Row className="row-gap-3 mb-2">
                            <Col xl={8} lg={8}>
                                <h3 className="card-title">
                                    <FaFileAlt className="me-2 mb-2 text-primary" />
                                    Event Description
                                </h3>
                                <div
                                    className="card-text border rounded-2 p-3 bg-body-tertiary"
                                    style={{
                                        maxHeight: "50rem",
                                        overflowY: "auto",
                                        backgroundColor: "var(--bg-body)",
                                    }}
                                    dangerouslySetInnerHTML={{
                                        __html: event.description,
                                    }}
                                ></div>
                            </Col>
                            <Col xl={4} lg={4}>
                                <h3 className="card-title mb-2">
                                    <FaHeart className="me-2 text-primary" />
                                    Event Details
                                </h3>
                                <div className="card-text border rounded-2 p-3 bg-body-tertiary">
                                    <div className="d-flex mb-3">
                                        <FaUserAlt className="me-2 text-primary flex-center h-100 mt-2" />
                                        <div className="ms-2 mb-1">
                                            <div>Organizer</div>
                                            <div className="fw-bold fs-5">
                                                {event.organizerName}
                                            </div>
                                        </div>
                                    </div>
                                    {event.location && (
                                        <div className="d-flex mb-3">
                                            <FaMapMarkerAlt className="me-2 text-danger flex-center h-100 mt-2" />
                                            <div className="ms-2 mb-1">
                                                <div>Location</div>
                                                <div className="fw-bold fs-5">
                                                    <EventLocation
                                                        location={
                                                            event.location
                                                        }
                                                        margin={2}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                    <div className="d-flex">
                                        <FaCalendarAlt className="me-2 text-primary flex-center h-100 mt-2" />
                                        <div className="ms-2 mb-1">
                                            <div>Dates</div>
                                            <div className="fw-bold fs-5">
                                                <EventDates event={event} />
                                            </div>
                                        </div>
                                    </div>
                                    {event.isForCharity && (
                                        <div className="d-flex mt-3">
                                            <FaHeart className="me-2 text-danger flex-center h-100 mt-2" />
                                            <div className="ms-2 mb-1">
                                                <div>Charity</div>
                                                <div className="fw-bold fs-5">
                                                    <div className="fw-bold fs-5">
                                                        {event.charityName ||
                                                            "Event is for charity!"}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <div className="mt-2">
                                    <h3 className="card-title mb-2">
                                        <FaLink className="text-primary" />{" "}
                                        Links
                                    </h3>

                                    <div className="card-text border rounded-2 px-3 pb-3 bg-body-tertiary">
                                        <EventLink
                                            text="Event URL"
                                            url={
                                                event.url ??
                                                "https://therun.gg/events/" +
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
                                                    .includes("oengus")
                                                    ? "Oengus URL"
                                                    : "Submissions URL"
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
                                                <h3 className="card-title mb-2">
                                                    <FaRetweet className="text-primary" />{" "}
                                                    Restreams
                                                </h3>

                                                <div className="card-text border rounded-2 px-3 pb-3 bg-body-tertiary">
                                                    {event.restreams.map(
                                                        (restream) => {
                                                            return (
                                                                <div
                                                                    className="d-flex mt-3"
                                                                    key={
                                                                        restream.language
                                                                    }
                                                                >
                                                                    <FaRetweet className="me-2 flex-center h-100 mt-2 text-primary" />
                                                                    <div
                                                                        className="ms-2 mb-1"
                                                                        style={{
                                                                            minWidth: 0,
                                                                            flex: 1,
                                                                        }}
                                                                    >
                                                                        <div>
                                                                            {
                                                                                restream.language
                                                                            }{" "}
                                                                            restream
                                                                            by{" "}
                                                                            {
                                                                                restream.organizer
                                                                            }
                                                                        </div>
                                                                        <div
                                                                            className="fw-bold fs-6"
                                                                            style={{
                                                                                width: "100%",
                                                                            }}
                                                                        >
                                                                            <a
                                                                                href={
                                                                                    restream.url
                                                                                }
                                                                                className="color-text"
                                                                                rel="noreferrer"
                                                                                target="_blank"
                                                                                style={{
                                                                                    width: "100%",
                                                                                    overflow:
                                                                                        "hidden",
                                                                                    textOverflow:
                                                                                        "ellipsis",
                                                                                    whiteSpace:
                                                                                        "nowrap",
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
                        <h3 className="card-title mt-3 mt-md-0">
                            <FaTags className="me-2 text-primary" />
                            Event Tags
                        </h3>
                        <div>
                            {(event.tags ?? []).map((tag) => {
                                return (
                                    <Badge
                                        key={tag}
                                        bg="primary"
                                        className="ms-2 pt-2 pb-2 px-3 mt-2"
                                        pill={true}
                                        style={{ fillOpacity: "50%" }}
                                    >
                                        <span className="fs-6">{tag}</span>
                                    </Badge>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

const EventLink = ({ text, url }: { text: string; url: string | null }) => {
    let Icon = FaLink;
    let iconColor = "var(--bs-secondary)";

    if (text.toLowerCase().includes("charity")) {
        Icon = FaHeart;
        iconColor = "var(--bs-danger)";
    }
    if (text.toLowerCase().includes("bluesky")) {
        Icon = FaBluesky;
        iconColor = "#36c";
    }
    if (text.toLowerCase().includes("discord")) {
        Icon = FaDiscord;
        iconColor = "#7289d9";
    }
    if (text.toLowerCase().includes("twitch")) {
        Icon = FaTwitch;
        iconColor = "#6441a5";
    }
    if (text.toLowerCase().includes("twitter")) {
        Icon = FaTwitter;
        iconColor = "#1DA1F2";
    }
    if (
        text.toLowerCase().includes("submissions") ||
        text.toLowerCase().includes("oengus")
    ) {
        Icon = FaRocket;
        iconColor = "var(--bs-primary)";
    }

    return (
        <>
            {url && (
                <div className="d-flex mt-3">
                    <Icon
                        className="me-2 flex-center h-100 mt-2"
                        style={{ color: iconColor }}
                    />
                    <div className="ms-2 mb-1" style={{ minWidth: 0, flex: 1 }}>
                        <div>{text}</div>
                        <div className="fw-bold fs-6" style={{ width: "100%" }}>
                            <a
                                href={url}
                                className="color-text"
                                rel="noreferrer"
                                target="_blank"
                                style={{
                                    display: "block",
                                    width: "100%",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    whiteSpace: "nowrap",
                                }}
                            >
                                {url}
                            </a>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};
