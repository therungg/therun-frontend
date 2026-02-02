import Link from 'next/link';
import React from 'react';
import { Col, Row } from 'react-bootstrap';
import { PatreonBar } from './patreon/patreon-bar.component';

export const Footer: React.FunctionComponent = () => {
    return (
        <footer className="bg-body-secondary">
            <PatreonBar />
            <div className="container">
                <Row sm={2} md={4} className="pb-3 text-center row-cols-1">
                    <Col className="mt-3">
                        <h3>General</h3>
                        <Link href="/about" prefetch={false}>
                            About
                        </Link>{' '}
                        <br />
                        <Link href="/roadmap" prefetch={false}>
                            Roadmap
                        </Link>{' '}
                        <br />
                        <Link href="/faq" prefetch={false}>
                            FAQ
                        </Link>{' '}
                        <br />
                        <Link href="/live" prefetch={false}>
                            Live
                        </Link>{' '}
                        <br />
                        <Link href="/blog" prefetch={false}>
                            Blog
                        </Link>{' '}
                        <br />
                    </Col>
                    <Col className="mt-3">
                        <h3>Media</h3>
                        <Link href="/media" prefetch={false}>
                            Media kit
                        </Link>{' '}
                        <br />
                    </Col>
                    <Col className="mt-3">
                        <h3>Privacy and Terms</h3>
                        <Link href="/terms" prefetch={false}>
                            Terms and conditions
                        </Link>{' '}
                        <br />
                        <Link href="/privacy-policy" prefetch={false}>
                            Privacy Policy
                        </Link>
                    </Col>
                    <Col className="mt-3">
                        <h3>Contact</h3>
                        <Link href="/contact" prefetch={false}>
                            Contact form
                        </Link>{' '}
                        <br />
                        <Link
                            rel="noreferrer"
                            target="_blank"
                            href={process.env.NEXT_PUBLIC_DISCORD_URL}
                            prefetch={false}
                        >
                            Discord
                        </Link>
                        <br />
                        <Link
                            rel="noreferrer"
                            target="_blank"
                            href={process.env.NEXT_PUBLIC_TWITTER_URL}
                            prefetch={false}
                        >
                            Twitter
                        </Link>{' '}
                        <br />
                        <Link
                            rel="noreferrer"
                            target="_blank"
                            href={process.env.NEXT_PUBLIC_BLUESKY_URL}
                            prefetch={false}
                        >
                            Bluesky
                        </Link>{' '}
                        <br />
                        <Link
                            rel="noreferrer"
                            target="_blank"
                            href={`mailto:${process.env.NEXT_PUBLIC_CONTACT_EMAIL}`}
                            prefetch={false}
                        >
                            {process.env.NEXT_PUBLIC_CONTACT_EMAIL}
                        </Link>
                    </Col>
                </Row>
            </div>
        </footer>
    );
};
