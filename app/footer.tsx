import React from "react";
import { Col, Row } from "react-bootstrap";
import { PatreonBar } from "./patreon/patreon-bar.component";

export const Footer: React.FunctionComponent = () => {
    return (
        <footer className="bg-body-secondary">
            <PatreonBar />
            <div className="container">
                <Row sm={2} md={4} className="pb-3 text-center row-cols-1">
                    <Col className="mt-3">
                        <h3>General</h3>
                        <a href="/about">About</a> <br />
                        <a href="/roadmap">Roadmap</a> <br />
                        <a href="/faq">FAQ</a> <br />
                        <a href="/live">Live</a> <br />
                        <a href="/blog">Blog</a> <br />
                    </Col>
                    <Col className="mt-3">
                        <h3>Media</h3>
                        <a href="/media">Media kit</a> <br />
                    </Col>
                    <Col className="mt-3">
                        <h3>Privacy and Terms</h3>
                        <a href="/terms">Terms and conditions</a> <br />
                        <a href="/privacy-policy">Privacy Policy</a>
                    </Col>
                    <Col className="mt-3">
                        <h3>Contact</h3>
                        <a href="/contact">Contact form</a> <br />
                        <a
                            rel="noreferrer"
                            target="_blank"
                            href={process.env.NEXT_PUBLIC_DISCORD_URL}
                        >
                            Discord
                        </a>
                        <br />
                        <a
                            rel="noreferrer"
                            target="_blank"
                            href={process.env.NEXT_PUBLIC_TWITTER_URL}
                        >
                            Twitter
                        </a>{" "}
                        <br />
                        <a
                            rel="noreferrer"
                            target="_blank"
                            href={`mailto:${process.env.NEXT_PUBLIC_CONTACT_EMAIL}`}
                        >
                            {process.env.NEXT_PUBLIC_CONTACT_EMAIL}
                        </a>
                    </Col>
                </Row>
            </div>
        </footer>
    );
};
