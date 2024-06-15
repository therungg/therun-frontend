import { Run } from "~src/common/types";
import { Button, Form } from "react-bootstrap";
import styles from "../../../components/css/Userform.module.scss";
import { useState } from "react";
import { User } from "types/session.types";

export const EditRun = ({
    run,
    abort,
    session,
    username,
    forceUpdate,
}: {
    run: Run;
    abort: () => void;
    session: User;
    username: string;

    forceUpdate: (newRun: Run) => void;
}) => {
    const [form, setForm] = useState({
        description: run.description,
        vod: run.vod,
        customUrl: run.originalRun?.endsWith(run.customUrl as string)
            ? ""
            : run.customUrl,
    });

    const [valid, setValid] = useState(true);

    return (
        <div style={{ marginBottom: "2rem" }}>
            <Form>
                <fieldset className={`border p ${styles.fieldset}`}>
                    <legend className="w-auto">
                        Editing {run.game} - {run.run}
                    </legend>

                    <Form.Group className="mb-3" controlId="alias">
                        <Form.Label>
                            VOD url (Twitch or youtube only, insert full url)
                        </Form.Label>
                        <Form.Control
                            defaultValue={form.vod}
                            style={{ width: "30rem" }}
                            maxLength={250}
                            type="text"
                            placeholder="eg. https://www.twitch.tv/videos/40861387"
                            onChange={(e) =>
                                setForm({ ...form, vod: e.target.value })
                            }
                        />
                        {!valid && (
                            <div style={{ color: "red" }}>
                                This does not appear to be a twitch or youtube
                                url...
                            </div>
                        )}
                    </Form.Group>

                    <Form.Group className="mb-3" controlId="bio">
                        <Form.Label>
                            Description (max. 250 characters)
                        </Form.Label>
                        <Form.Control
                            as="textarea"
                            style={{ height: "6rem" }}
                            maxLength={250}
                            type="textarea"
                            defaultValue={form.description}
                            placeholder="Enter description"
                            onChange={(e) =>
                                setForm({
                                    ...form,
                                    description: e.target.value,
                                })
                            }
                        />
                    </Form.Group>
                    <div style={{ display: "flex" }}>
                        <div
                            style={{
                                display: "flex",
                                alignContent: "flex-end",
                                alignSelf: "flex-end",
                                marginBottom: "1.3rem",
                                marginRight: "1rem",
                            }}
                        >
                            therun.gg/{username}/
                        </div>

                        <Form.Group className="mb-3" controlId="customUrl">
                            <Form.Label>
                                Custom URL (max. 50 characters)
                            </Form.Label>
                            <Form.Control
                                style={{ width: "30rem" }}
                                maxLength={50}
                                type="text"
                                defaultValue={form.customUrl}
                                placeholder="Enter custom url"
                                onChange={(e) =>
                                    setForm({
                                        ...form,
                                        customUrl: e.target.value,
                                    })
                                }
                            />
                        </Form.Group>
                    </div>
                </fieldset>
                <div style={{ marginTop: "1rem" }}>
                    <Button
                        variant="primary"
                        className={styles.editInfoButton}
                        onClick={async () => {
                            const userIdentifier = `${session.id}-${username}`;
                            const deleteUrl = run.url.replace(
                                username,
                                userIdentifier,
                            );

                            const res = await fetch(`/api/users/${deleteUrl}`, {
                                method: "PUT",
                                body: JSON.stringify(form),
                            });

                            const result = await res.json();

                            if (res.status > 399) {
                                setValid(false);
                            } else {
                                setValid(true);
                                forceUpdate(result.result);
                                abort();
                            }
                        }}
                    >
                        Submit
                    </Button>
                    <Button
                        variant="secondary"
                        className={styles.cancelButton}
                        onClick={() => {
                            abort();
                        }}
                    >
                        {" "}
                        Cancel
                    </Button>
                </div>
            </Form>
        </div>
    );
};
