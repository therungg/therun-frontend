import { Title } from "../title";
import React, { useState } from "react";
import { Button, Form } from "react-bootstrap";
import styles from "../css/Userform.module.scss";
import { countries } from "../../common/countries";
import { hasFlag } from "country-flag-icons";
import { NameAsPatreon } from "../patreon/patreon-name";

import { TimezoneSelect } from "../../vendor/timezone-select-js/lib/index";
import Image from "next/image";

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

            {session.username &&
                [username, "joeys64", "therun_gg"].includes(
                    session.username
                ) && (
                    <div className={styles.editInfoButtonContainer}>
                        <Button
                            variant={"primary"}
                            className={styles.editInfoButton}
                            onClick={async () => {
                                if (editingInfo) {
                                    await fetch(
                                        `/api/users/${session.id}-${username}`,
                                        {
                                            method: "PUT",
                                            body: JSON.stringify(form),
                                        }
                                    );
                                }

                                setEditingInfo(!editingInfo);
                            }}
                        >
                            {editingInfo ? "Update info" : "Edit info"}
                        </Button>
                        {editingInfo && (
                            <Button
                                variant={"secondary"}
                                className={styles.cancelButton}
                                onClick={() => {
                                    setEditingInfo(false);
                                }}
                            >
                                {" "}
                                Cancel
                            </Button>
                        )}
                    </div>
                )}
        </div>
    );
};

const Display = ({ username, form, showTimezone = false }) => {
    return (
        <div>
            <div style={{ display: "flex" }}>
                <div style={{ display: "flex" }}>
                    <Title>
                        <NameAsPatreon name={username} />
                    </Title>
                    {form.aka && (
                        <div
                            style={{
                                marginLeft: "0.5rem",
                                justifyContent: "flex-end",
                                alignSelf: "flex-start",
                            }}
                        >
                            (<b>{form.aka}</b>)
                        </div>
                    )}
                </div>
                <div
                    style={{
                        marginLeft: "0.5rem",
                        alignSelf: "center",
                        justifyContent: "center",
                    }}
                >
                    <a
                        href={`https://twitch.tv/${username}`}
                        target={"_blank"}
                        rel={"noreferrer"}
                    >
                        <TwitchIcon />
                    </a>
                </div>
                {form.socials && form.socials.youtube && (
                    <div
                        style={{
                            marginLeft: "0.5rem",
                            alignSelf: "center",
                            justifyContent: "center",
                        }}
                    >
                        <a
                            href={`https://youtube.com/${form.socials.youtube}`}
                            target={"_blank"}
                            rel={"noreferrer"}
                        >
                            <YoutubeIcon />
                        </a>
                    </div>
                )}
                {form.socials && form.socials.twitter && (
                    <div
                        style={{
                            marginLeft: "0.5rem",
                            alignSelf: "center",
                            justifyContent: "center",
                        }}
                    >
                        <a
                            href={`https://twitter.com/${form.socials.twitter}`}
                            target={"_blank"}
                            rel={"noreferrer"}
                        >
                            <TwitterIcon />
                        </a>
                    </div>
                )}
            </div>
            {form.pronouns && (
                <div style={{ alignSelf: "", justifyContent: "center" }}>
                    {form.pronouns}
                </div>
            )}
            {!!form.country && hasFlag(form.country) && (
                <div>
                    {countries()[form.country]}&nbsp;{" "}
                    <CountryIcon countryCode={form.country} />
                </div>
            )}
            {showTimezone && form.timezone && (
                <div style={{ alignSelf: "", justifyContent: "center" }}>
                    {form.timezone}
                </div>
            )}
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
        <div style={{ marginBottom: "1rem" }}>
            <div style={{ display: "flex" }}>
                <Title>{username}</Title>
            </div>
            <Form>
                <fieldset className={`border p ${styles.fieldset}`}>
                    <legend className={"w-auto"}>About</legend>

                    <Form.Group className={"mb-3"} controlId={"pronouns"}>
                        <Form.Label>Pronouns</Form.Label>
                        <Form.Control
                            style={{ width: "15rem" }}
                            maxLength={25}
                            type="text"
                            defaultValue={form.pronouns}
                            placeholder="Enter pronouns"
                            onChange={(e) =>
                                setForm({ ...form, pronouns: e.target.value })
                            }
                        />
                    </Form.Group>

                    <Form.Group className={"mb-3"} controlId={"alias"}>
                        <Form.Label>Also known as</Form.Label>
                        <Form.Control
                            defaultValue={form.aka}
                            style={{ width: "15rem" }}
                            maxLength={25}
                            type="text"
                            placeholder="A.k.a..."
                            onChange={(e) =>
                                setForm({ ...form, aka: e.target.value })
                            }
                        />
                    </Form.Group>

                    <Form.Group className={"mb-3"} controlId={"country"}>
                        <Form.Label>Country</Form.Label>
                        <Form.Control
                            defaultValue={form.country}
                            as="select"
                            style={{ width: "15rem" }}
                            type="text"
                            onChange={(e) =>
                                setForm({ ...form, country: e.target.value })
                            }
                        >
                            <option value={""}>Show no country</option>
                            {Array.from(Object.entries(countries())).map(
                                ([key, value]) => {
                                    return (
                                        <option key={key} value={key}>
                                            {value}
                                        </option>
                                    );
                                }
                            )}
                        </Form.Control>
                    </Form.Group>

                    <Form.Group className={"mb-3"} controlId={"timezone"}>
                        <Form.Label>Timezone</Form.Label>

                        <div style={{ width: "40rem" }}>
                            <TimezoneSelect
                                value={form.timezone}
                                onChange={(e) =>
                                    setForm({ ...form, timezone: e.value })
                                }
                            />
                        </div>
                    </Form.Group>

                    <Form.Group className={"mb-3"} controlId={"bio"}>
                        <Form.Label>About (max. 100 characters)</Form.Label>
                        <Form.Control
                            as="textarea"
                            style={{ height: "10rem" }}
                            maxLength={100}
                            type="textarea"
                            defaultValue={form.bio}
                            placeholder="Enter bio"
                            onChange={(e) =>
                                setForm({ ...form, bio: e.target.value })
                            }
                        />
                    </Form.Group>
                </fieldset>

                <fieldset className={`border p ${styles.fieldset}`}>
                    <legend className={"w-auto"}>Socials</legend>

                    <Form.Group className={"mb-3"} controlId={"youtube"}>
                        <Form.Label>
                            Youtube <YoutubeIcon />
                        </Form.Label>
                        <Form.Control
                            style={{ width: "15rem" }}
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

                    <Form.Group className={"mb-3"} controlId={"twitter"}>
                        <Form.Label>
                            Twitter <TwitterIcon />
                        </Form.Label>
                        <Form.Control
                            style={{ width: "15rem" }}
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
                </fieldset>
            </Form>
        </div>
    );
};

export const TwitchIcon = ({ height = 24 }) => {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width={height}
            height={height}
            fill="#6441a5"
            className="bi bi-twitch"
            viewBox="0 0 16 16"
        >
            <path d="M3.857 0 1 2.857v10.286h3.429V16l2.857-2.857H9.57L14.714 8V0H3.857zm9.714 7.429-2.285 2.285H9l-2 2v-2H4.429V1.143h9.142v6.286z" />
            <path d="M11.857 3.143h-1.143V6.57h1.143V3.143zm-3.143 0H7.571V6.57h1.143V3.143z" />
        </svg>
    );
};

export const YoutubeIcon = () => {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            fill="red"
            className="bi bi-youtube"
            viewBox="0 0 16 16"
        >
            <path d="M8.051 1.999h.089c.822.003 4.987.033 6.11.335a2.01 2.01 0 0 1 1.415 1.42c.101.38.172.883.22 1.402l.01.104.022.26.008.104c.065.914.073 1.77.074 1.957v.075c-.001.194-.01 1.108-.082 2.06l-.008.105-.009.104c-.05.572-.124 1.14-.235 1.558a2.007 2.007 0 0 1-1.415 1.42c-1.16.312-5.569.334-6.18.335h-.142c-.309 0-1.587-.006-2.927-.052l-.17-.006-.087-.004-.171-.007-.171-.007c-1.11-.049-2.167-.128-2.654-.26a2.007 2.007 0 0 1-1.415-1.419c-.111-.417-.185-.986-.235-1.558L.09 9.82l-.008-.104A31.4 31.4 0 0 1 0 7.68v-.123c.002-.215.01-.958.064-1.778l.007-.103.003-.052.008-.104.022-.26.01-.104c.048-.519.119-1.023.22-1.402a2.007 2.007 0 0 1 1.415-1.42c.487-.13 1.544-.21 2.654-.26l.17-.007.172-.006.086-.003.171-.007A99.788 99.788 0 0 1 7.858 2h.193zM6.4 5.209v4.818l4.157-2.408L6.4 5.209z" />
        </svg>
    );
};

export const TwitterIcon = () => {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            fill="#1DA1F2"
            className="bi bi-twitter"
            viewBox="0 0 16 16"
        >
            <path d="M5.026 15c6.038 0 9.341-5.003 9.341-9.334 0-.14 0-.282-.006-.422A6.685 6.685 0 0 0 16 3.542a6.658 6.658 0 0 1-1.889.518 3.301 3.301 0 0 0 1.447-1.817 6.533 6.533 0 0 1-2.087.793A3.286 3.286 0 0 0 7.875 6.03a9.325 9.325 0 0 1-6.767-3.429 3.289 3.289 0 0 0 1.018 4.382A3.323 3.323 0 0 1 .64 6.575v.045a3.288 3.288 0 0 0 2.632 3.218 3.203 3.203 0 0 1-.865.115 3.23 3.23 0 0 1-.614-.057 3.283 3.283 0 0 0 3.067 2.277A6.588 6.588 0 0 1 .78 13.58a6.32 6.32 0 0 1-.78-.045A9.344 9.344 0 0 0 5.026 15z" />
        </svg>
    );
};

export const CountryIcon = ({ countryCode }) => {
    return (
        <Image
            width={24}
            height={16}
            alt={countries()[countryCode] as string}
            src={`https://purecatamphetamine.github.io/country-flag-icons/3x2/${countryCode}.svg`}
        />
    );
};
