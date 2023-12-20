import { Title } from "../title";
import React, { useState } from "react";
import { Button, Form } from "react-bootstrap";
import { countries } from "~src/common/countries";
import { hasFlag } from "country-flag-icons";
import { NameAsPatreon } from "../patreon/patreon-name";
import { TimezoneSelect } from "~src/vendor/timezone-select-js/lib";
import Image from "next/image";
import {
    Twitch as TwitchIcon,
    Twitter as TwitterIcon,
    Youtube as YoutubeIcon,
} from "react-bootstrap-icons";
import { Can, subject } from "~src/rbac/Can.component";

//TODO:: Would be better to use some form lib, not sure why i built it this way
export const Userform = ({ username, session, userData }) => {
    const [editingInfo, setEditingInfo] = useState(false);

    if (userData.socials) {
        if (userData.socials.twitter) {
            const split = userData.socials.twitter.toString().split(".com/");

            userData.socials.twitter = split[split.length - 1];
        }

        if (userData.socials.youtube) {
            let split = userData.socials.youtube.toString().split(".com/");
            if (split.length === 1) {
                split = split[0].split(".be/");
            }
            userData.socials.youtube = split[split.length - 1];
        }
    }

    const [form, setForm] = useState({
        pronouns: userData.pronouns,
        socials: userData.socials,
        bio: userData.bio,
        country: userData.country,
        aka: userData.aka,
        timezone:
            userData.timezone ||
            Intl.DateTimeFormat().resolvedOptions().timeZone,
    });

    return (
        <div>
            {!editingInfo &&
                Display({ username, form, showTimezone: !!userData.timezone })}
            {editingInfo && Edit({ username, form, setForm })}

            <Can I={"edit"} this={subject("user", username)}>
                <div className="mt-3 d-flex align-items-center">
                    <Button
                        variant={"primary"}
                        className="w-240p"
                        onClick={async () => {
                            if (editingInfo) {
                                await fetch(
                                    `/api/users/${session.id}-${username}`,
                                    {
                                        method: "PUT",
                                        body: JSON.stringify(form),
                                    },
                                );
                            }

                            setEditingInfo(!editingInfo);
                        }}
                    >
                        {editingInfo ? "Update info" : "Edit info"}
                    </Button>
                    {editingInfo && (
                        <Button
                            variant={"danger"}
                            className="ms-3"
                            onClick={() => {
                                setEditingInfo(false);
                            }}
                        >
                            {" "}
                            Cancel
                        </Button>
                    )}
                </div>
            </Can>
        </div>
    );
};

const Display = ({ username, form, showTimezone = false }) => {
    return (
        <div>
            <div className="d-flex column-gap-2 align-items-center">
                <div className="d-flex column-gap-2 ">
                    <Title>
                        <NameAsPatreon name={username} />
                    </Title>
                    {form.aka && (
                        <span>
                            (<b>{form.aka}</b>)
                        </span>
                    )}
                </div>
                <a
                    href={`https://twitch.tv/${username}`}
                    target={"_blank"}
                    rel={"noreferrer"}
                >
                    <TwitchIcon size={24} color={"#6441a5"} />
                </a>
                {form.socials && form.socials.youtube && (
                    <a
                        href={`https://youtube.com/${form.socials.youtube}`}
                        target={"_blank"}
                        rel={"noreferrer"}
                    >
                        <YoutubeIcon size={24} color={"red"} />
                    </a>
                )}
                {form.socials && form.socials.twitter && (
                    <a
                        href={`https://twitter.com/${form.socials.twitter}`}
                        target={"_blank"}
                        rel={"noreferrer"}
                    >
                        <TwitterIcon size={24} color={"#1DA1F2"} />
                    </a>
                )}
            </div>
            {form.pronouns && <div>{form.pronouns}</div>}
            {!!form.country && hasFlag(form.country) && (
                <div>
                    {countries()[form.country]}&nbsp;{" "}
                    <CountryIcon countryCode={form.country} />
                </div>
            )}
            {showTimezone && form.timezone && <div>{form.timezone}</div>}
            {!!form.bio && (
                <div>
                    <i>{form.bio}</i>
                </div>
            )}
        </div>
    );
};

const Edit = ({ username, form, setForm }) => {
    return (
        <>
            <Title>{username}</Title>
            <Form className="row g-3">
                <div className="col col-12 col-lg-6">
                    <fieldset className="border py-3 px-4">
                        <legend className="w-auto mb-0">About</legend>
                        <div className="row g-3">
                            <Form.Group
                                className="col-12 col-md-6 col-lg-12 col-xl-6"
                                controlId={"pronouns"}
                            >
                                <Form.Label>Pronouns</Form.Label>
                                <Form.Control
                                    maxLength={25}
                                    type="text"
                                    defaultValue={form.pronouns}
                                    placeholder="Enter pronouns"
                                    onChange={(e) =>
                                        setForm({
                                            ...form,
                                            pronouns: e.target.value,
                                        })
                                    }
                                />
                            </Form.Group>

                            <Form.Group
                                className="col-12 col-md-6 col-lg-12 col-xl-6"
                                controlId={"alias"}
                            >
                                <Form.Label>Also known as</Form.Label>
                                <Form.Control
                                    defaultValue={form.aka}
                                    maxLength={25}
                                    type="text"
                                    placeholder="A.k.a..."
                                    onChange={(e) =>
                                        setForm({
                                            ...form,
                                            aka: e.target.value,
                                        })
                                    }
                                />
                            </Form.Group>

                            <Form.Group
                                className="col-12 col-md-6 col-lg-12 col-xl-6"
                                controlId={"country"}
                            >
                                <Form.Label>Country</Form.Label>
                                <Form.Control
                                    defaultValue={form.country}
                                    as="select"
                                    type="text"
                                    onChange={(e) =>
                                        setForm({
                                            ...form,
                                            country: e.target.value,
                                        })
                                    }
                                >
                                    <option value={""}>Show no country</option>
                                    {Array.from(
                                        Object.entries(countries()),
                                    ).map(([key, value]) => {
                                        return (
                                            <option key={key} value={key}>
                                                {value}
                                            </option>
                                        );
                                    })}
                                </Form.Control>
                            </Form.Group>

                            <Form.Group
                                className="col-12 col-md-6 col-lg-12 col-xl-6"
                                controlId={"timezone"}
                            >
                                <Form.Label>Timezone</Form.Label>
                                <TimezoneSelect
                                    className="timeZoneSelect"
                                    value={form.timezone}
                                    onChange={(e) =>
                                        setForm({ ...form, timezone: e.value })
                                    }
                                />
                            </Form.Group>

                            <Form.Group className="col-12" controlId={"bio"}>
                                <Form.Label>
                                    About (max. 100 characters)
                                </Form.Label>
                                <Form.Control
                                    className="h-180p"
                                    as="textarea"
                                    maxLength={100}
                                    type="textarea"
                                    defaultValue={form.bio}
                                    placeholder="Enter bio"
                                    onChange={(e) =>
                                        setForm({
                                            ...form,
                                            bio: e.target.value,
                                        })
                                    }
                                />
                            </Form.Group>
                        </div>
                    </fieldset>
                </div>
                <div className="col col-12 col-lg-6">
                    <fieldset className="border py-3 px-4 h-100">
                        <legend className="w-auto mb-0">Socials</legend>
                        <div className="row g-3">
                            <Form.Group
                                className="col-12 col-md-6 col-lg-12 col-xl-6"
                                controlId={"youtube"}
                            >
                                <Form.Label>
                                    Youtube{" "}
                                    <YoutubeIcon size={24} color={"red"} />
                                </Form.Label>
                                <Form.Control
                                    maxLength={100}
                                    type="text"
                                    defaultValue={
                                        form.socials && form.socials.youtube
                                            ? form.socials.youtube
                                            : ""
                                    }
                                    placeholder="youtube.com/..."
                                    onChange={(e) =>
                                        setForm({
                                            ...form,
                                            socials: {
                                                ...form.socials,
                                                youtube: e.target.value,
                                            },
                                        })
                                    }
                                />
                            </Form.Group>

                            <Form.Group
                                className="col-12 col-md-6 col-lg-12 col-xl-6"
                                controlId={"twitter"}
                            >
                                <Form.Label>
                                    Twitter{" "}
                                    <TwitterIcon size={24} color={"#1DA1F2"} />
                                </Form.Label>
                                <Form.Control
                                    maxLength={100}
                                    type="text"
                                    defaultValue={
                                        form.socials && form.socials.twitter
                                            ? form.socials.twitter
                                            : ""
                                    }
                                    placeholder="twitter.com/..."
                                    onChange={(e) =>
                                        setForm({
                                            ...form,
                                            socials: {
                                                ...form.socials,
                                                twitter: e.target.value,
                                            },
                                        })
                                    }
                                />
                            </Form.Group>
                        </div>
                    </fieldset>
                </div>
            </Form>
        </>
    );
};

export const CountryIcon = ({ countryCode }) => {
    return (
        <Image
            className="img-fluid"
            width={24}
            height={16}
            alt={countries()[countryCode] as string}
            src={`https://raw.githubusercontent.com/hampusborgos/country-flags/main/svg/${countryCode.toLowerCase()}.svg`}
        />
    );
};
