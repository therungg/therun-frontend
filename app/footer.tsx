import React from "react";
import { Col, Row } from "react-bootstrap";
import { PatreonBar } from "./patreon/patreon-bar.component";
import Link from "next/link";

export const Footer: React.FunctionComponent = () => {
    return (
        <footer className="bg-body-secondary">
            <PatreonBar />
            <div className="container">
                <Row sm={2} md={4} className="pb-3 text-center row-cols-1">
                    <Col className="mt-3">
                        <h3>General</h3>
                        <Link href="/about">About</Link> <br />
                        <Link href="/roadmap">Roadmap</Link> <br />
                        <Link href="/faq">FAQ</Link> <br />
                        <Link href="/live">Live</Link> <br />
                        <Link href="/blog">Blog</Link> <br />
                    </Col>
                    <Col className="mt-3">
                        <h3>Media</h3>
                        <Link href="/media">Media kit</Link> <br />
                    </Col>
                    <Col className="mt-3">
                        <h3>Privacy and Terms</h3>
                        <Link href="/terms">Terms and conditions</Link> <br />
                        <Link href="/privacy-policy">Privacy Policy</Link>
                    </Col>
                    <Col className="mt-3">
                        <h3>Contact</h3>
                        <Link href="/contact">Contact form</Link> <br />
                        <Link
                            rel="noreferrer"
                            target="_blank"
                            href={process.env.NEXT_PUBLIC_DISCORD_URL}
                        >
                            Discord
                        </Link>
                        <br />
                        <Link
                            rel="noreferrer"
                            target="_blank"
                            href={process.env.NEXT_PUBLIC_TWITTER_URL}
                        >
                            Twitter
                        </Link>{" "}
                        <br />
                        <Link
                            rel="noreferrer"
                            target="_blank"
                            href={process.env.NEXT_PUBLIC_BLUESKY_URL}
                        >
                            Bluesky
                        </Link>{" "}
                        <br />
                        <Link
                            rel="noreferrer"
                            target="_blank"
                            href={`mailto:${process.env.NEXT_PUBLIC_CONTACT_EMAIL}`}
                        >
                            {process.env.NEXT_PUBLIC_CONTACT_EMAIL}
                        </Link>
                    </Col>
                </Row>
            </div>
        </footer>
    );
};
