'use client';

import { useState } from 'react';
import { Form, Modal } from 'react-bootstrap';
import {
    Twitter as TwitterIcon,
    Youtube as YoutubeIcon,
} from 'react-bootstrap-icons';
import TimezoneSelect from 'react-timezone-select';
import type { User as IUser } from 'types/session.types';
import { countries } from '~src/common/countries';
import { Button } from '~src/components/Button/Button';
import { BlueskyIcon } from '~src/icons/bluesky-icon';
import type { UserData } from '~src/lib/get-session-data';
import styles from '../profile.module.scss';

// The API returns more fields than the UserData type declares.
// Extend locally to account for additional profile fields.
interface ExtendedUserData extends UserData {
    bio?: string;
    country?: string;
    aka?: string;
    socials: UserData['socials'] & { bluesky?: string };
}

interface ProfileEditModalProps {
    show: boolean;
    onHide: () => void;
    username: string;
    session: IUser;
    userData: UserData;
}

function normalizeSocials(data: ExtendedUserData) {
    const socials = { ...data.socials };

    if (socials.twitter) {
        const split = socials.twitter.toString().split('.com/');
        socials.twitter = split[split.length - 1];
    }

    if (socials.youtube) {
        let split = socials.youtube.toString().split('.com/');
        if (split.length === 1) {
            split = split[0].split('.be/');
        }
        socials.youtube = split[split.length - 1];
    }

    return socials;
}

export const ProfileEditModal = ({
    show,
    onHide,
    username,
    session,
    userData,
}: ProfileEditModalProps) => {
    const data = userData as ExtendedUserData;
    const normalizedSocials = normalizeSocials(data);

    const [form, setForm] = useState({
        pronouns: data.pronouns,
        socials: normalizedSocials,
        bio: data.bio,
        country: data.country,
        aka: data.aka,
        timezone:
            data.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
    });

    const handleSave = async () => {
        await fetch(`/api/users/${session.id}-${username}`, {
            method: 'PUT',
            body: JSON.stringify(form),
        });
        onHide();
    };

    return (
        <Modal
            size="lg"
            show={show}
            onHide={onHide}
            className={styles.editModal}
        >
            <Modal.Header closeButton>
                <Modal.Title>Edit Profile</Modal.Title>
            </Modal.Header>
            <Modal.Body className={styles.editModalBody}>
                <Form className="row g-3">
                    <div className="col col-12 col-lg-6">
                        <fieldset className="border py-3 px-4">
                            <legend className="w-auto mb-0">About</legend>
                            <div className="row g-3">
                                <Form.Group
                                    className="col-12 col-md-6 col-lg-12 col-xl-6"
                                    controlId="pronouns"
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
                                    controlId="alias"
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
                                    controlId="country"
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
                                        <option>Show no country</option>
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
                                    controlId="timezone"
                                >
                                    <Form.Label>Timezone</Form.Label>
                                    <TimezoneSelect
                                        className="timeZoneSelect"
                                        value={form.timezone}
                                        onChange={(e) =>
                                            setForm({
                                                ...form,
                                                timezone: e.value,
                                            })
                                        }
                                    />
                                </Form.Group>

                                <Form.Group className="col-12" controlId="bio">
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
                                    controlId="youtube"
                                >
                                    <Form.Label>
                                        Youtube{' '}
                                        <YoutubeIcon size={24} color="red" />
                                    </Form.Label>
                                    <Form.Control
                                        maxLength={100}
                                        type="text"
                                        defaultValue={
                                            form.socials && form.socials.youtube
                                                ? form.socials.youtube
                                                : ''
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
                                    controlId="twitter"
                                >
                                    <Form.Label>
                                        Twitter{' '}
                                        <TwitterIcon
                                            size={24}
                                            color="#1DA1F2"
                                        />
                                    </Form.Label>
                                    <Form.Control
                                        maxLength={100}
                                        type="text"
                                        defaultValue={
                                            form.socials && form.socials.twitter
                                                ? form.socials.twitter
                                                : ''
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

                                <Form.Group
                                    className="col-12 col-md-6 col-lg-12 col-xl-6"
                                    controlId="bluesky"
                                >
                                    <Form.Label>
                                        Bluesky <BlueskyIcon />
                                    </Form.Label>
                                    <Form.Control
                                        maxLength={100}
                                        type="text"
                                        defaultValue={
                                            form.socials && form.socials.bluesky
                                                ? form.socials.bluesky
                                                : ''
                                        }
                                        placeholder="bsky.app/profile/..."
                                        onChange={(e) =>
                                            setForm({
                                                ...form,
                                                socials: {
                                                    ...form.socials,
                                                    bluesky: e.target.value,
                                                },
                                            })
                                        }
                                    />
                                </Form.Group>
                            </div>
                        </fieldset>
                    </div>
                </Form>
            </Modal.Body>
            <Modal.Footer>
                <Button variant="danger" onClick={onHide}>
                    Cancel
                </Button>
                <Button onClick={handleSave}>Save Changes</Button>
            </Modal.Footer>
        </Modal>
    );
};
