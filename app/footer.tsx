import React from "react";
import { Col, Row } from "react-bootstrap";
//import { PatreonBar } from "./patreon/patreon-bar.component";
import Link from "next/link";

export const Footer: React.FunctionComponent = () => {
    return (
        <footer>
            {/*<PatreonBar />*/}
            <div className="container">
                <Row className="py-6 text-white lh-lg row-gap-5">
                    <Col className="col-6 col-md-4">
                        <h5>The Run</h5>
                        <Link className="text-white" href="/about">
                            About
                        </Link>{" "}
                        <br />
                        <Link className="text-white" href="/faq">
                            FAQ
                        </Link>{" "}
                        <br />
                        <Link className="text-white" href="/live">
                            Live
                        </Link>{" "}
                        <br />
                        <Link className="text-white" href="/contact">
                            Contact
                        </Link>{" "}
                        <br />
                    </Col>
                    <Col className="col-6 col-md-4">
                        <h5>Follow us</h5>
                        <Link
                            className="text-white"
                            rel="noreferrer"
                            target="_blank"
                            href={process.env.NEXT_PUBLIC_DISCORD_URL}
                        >
                            Discord
                        </Link>
                        <br />
                        <Link
                            className="text-white"
                            rel="noreferrer"
                            target="_blank"
                            href={process.env.NEXT_PUBLIC_TWITTER_URL}
                        >
                            X
                        </Link>{" "}
                        <br />
                        <Link
                            className="text-white"
                            rel="noreferrer"
                            target="_blank"
                            href={process.env.NEXT_PUBLIC_BLUESKY_URL}
                        >
                            Bluesky
                        </Link>{" "}
                    </Col>
                    <Col className="col-md-4">
                        <h5 className="mb-3">
                            If you like what I do, consider becoming a Patron!
                        </h5>
                        <p className="lh-base">
                            This allows me to keep the site running and build
                            more cool stuff in the future! In return for your
                            unending generosity, I will give you some little
                            visual perks.
                        </p>
                    </Col>
                    <Col className="mt-3 d-none">
                        <h5>Contact</h5>
                        <Link href="/privacy-policy">Privacy Policy</Link>
                        <Link href="/media">Media kit</Link> <br />
                        <Link href="/roadmap">Roadmap</Link> <br />
                        <Link href="/blog">Blog</Link> <br />
                    </Col>
                </Row>
                <div className="footer-copyright border-top py-4 d-flex flex-column flex-md-row column-gap-5 row-gap-2 text-center text-md-start">
                    <Link className="text-white" href="/terms">
                        Terms and conditions
                    </Link>
                    <Link className="text-white" href="/privacy-policy">
                        Privacy Policy
                    </Link>
                    <Link
                        className="text-white ms-md-auto"
                        rel="noreferrer"
                        target="_blank"
                        href={`mailto:${process.env.NEXT_PUBLIC_CONTACT_EMAIL}`}
                    >
                        {process.env.NEXT_PUBLIC_CONTACT_EMAIL}
                    </Link>
                </div>
            </div>
        </footer>
    );
};
