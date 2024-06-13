"use client";
import { Alert, Button, Col, Form, Image, Row } from "react-bootstrap";
import type React from "react";
import { useState } from "react";
import axios from "axios";

interface ContactFormData {
    email: string;
    subject: string;
    category: string;
    text: string;
}

// TODO:: This should just be some form library, not this custom stuff
export const Contact = () => {
    const [validated, setValidated] = useState(false);
    const [show, setShow] = useState(false);
    const [state, setState] = useState<ContactFormData>({
        email: "",
        subject: "",
        category: "",
        text: "",
    });

    const submit = async (data: ContactFormData) => {
        await axios.post("api/form", data);
    };

    const handleSubmit: React.FormEventHandler<HTMLFormElement> = async (
        event,
    ) => {
        event.preventDefault();

        const form = event.currentTarget;
        if (form.checkValidity() === false) {
            event.preventDefault();
            event.stopPropagation();
        } else {
            setShow(true);
            await submit(state);
        }

        setValidated(true);
    };

    return (
        <div>
            {show && (
                <Alert
                    variant="success"
                    onClose={() => {
                        setShow(false);

                        setState({
                            email: "",
                            subject: "",
                            category: "",
                            text: "",
                        });
                    }}
                    dismissible
                >
                    <Alert.Heading>Message sent!</Alert.Heading>
                    <p>
                        I will try to respond as soon as possible. Hang in
                        there!
                    </p>
                </Alert>
            )}
            <h1>Contact me</h1>
            <p>
                Therun.gg is in an Beta version and will improve and change a
                lot over the coming months. I would love to get your
                suggestions, tips or remarks.
            </p>
            <p>
                If you want to, I made a
                <a
                    rel="noreferrer"
                    target="_blank"
                    href={process.env.NEXT_PUBLIC_DISCORD_URL}
                >
                    {" "}
                    Discord
                </a>
                , you can message me on
                <a
                    rel="noreferrer"
                    target="_blank"
                    href={process.env.NEXT_PUBLIC_TWITTER_URL}
                >
                    {" "}
                    Twitter
                </a>{" "}
                or send me an email at
                <a
                    rel="noreferrer"
                    target="_blank"
                    href="mailto:info@therun.gg"
                >
                    {" "}
                    info@therun.gg
                </a>
                . Alternatively, just fill in this form!
            </p>
            <Row className="mt-5 pt-4 justify-content-center">
                <Col
                    xl={4}
                    lg={6}
                    md={8}
                    sm={12}
                    className="text-center align-items-center"
                >
                    <Form
                        validated={validated}
                        onSubmit={handleSubmit}
                        noValidate
                    >
                        <Form.Group className="mb-3" controlId="formBasicEmail">
                            <Form.Label>Email address</Form.Label>
                            <Form.Control
                                type="email"
                                placeholder="Enter email"
                                required
                                value={state.email}
                                onChange={(e) =>
                                    setState({
                                        ...state,
                                        email: e.target.value,
                                    })
                                }
                            />
                        </Form.Group>
                        <Form.Group
                            className="mb-3"
                            controlId="formBasicSubject"
                        >
                            <Form.Label>Subject</Form.Label>
                            <Form.Control
                                type="text"
                                placeholder="Enter subject"
                                required
                                value={state.subject}
                                onChange={(e) =>
                                    setState({
                                        ...state,
                                        subject: e.target.value,
                                    })
                                }
                            />
                        </Form.Group>
                        <Form.Group
                            className="mb-3"
                            controlId="formBasicCategory"
                        >
                            <Form.Label>Category</Form.Label>
                            <Form.Control
                                required
                                as="select"
                                value={state.category}
                                onChange={(e) =>
                                    setState({
                                        ...state,
                                        category: e.target.value,
                                    })
                                }
                            >
                                <option value="">Select a category</option>
                                <option value="bug">
                                    I want to report a bug
                                </option>
                                <option value="change">
                                    I want to make a change suggestion
                                </option>
                                <option value="feature">
                                    I want to request a new feature
                                </option>
                                <option value="question">
                                    I want to ask a question
                                </option>
                                <option value="ask">I just want to talk</option>
                            </Form.Control>
                        </Form.Group>
                        <Form.Group
                            className="mb-3"
                            controlId="formBasicSubject"
                        >
                            <Form.Label>Message</Form.Label>
                            <Form.Control
                                as="textarea"
                                placeholder="Enter message"
                                required
                                value={state.text}
                                onChange={(e) =>
                                    setState({ ...state, text: e.target.value })
                                }
                            />
                        </Form.Group>
                        <Button variant="primary" type="submit">
                            Submit
                        </Button>
                    </Form>
                </Col>
            </Row>

            <div className="d-flex justify-content-end">
                <Image
                    src="/ContactformTR-light.png"
                    alt="Contact"
                    height={220}
                />
            </div>
        </div>
    );
};

export default Contact;
