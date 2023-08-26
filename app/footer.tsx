"use client";
import React from "react";
import { Col, Row } from "react-bootstrap";
import { usePatreons } from "~src/components/patreon/use-patreons";
import { UserLink } from "~src/components/links/links";

const DEFAULT_ANIMATION_DURATION = 30;

export const Footer = () => {
    const { data: patreonData } = usePatreons();
    const patronCount = Object.keys(patreonData || {}).length;
    const animationDuration =
        Math.floor(patronCount * 0.5) + DEFAULT_ANIMATION_DURATION;
    return (
        <footer className="bg-body-secondary">
            <div className="patreon-scroll-bar bg-body-tertiary">
                <div
                    style={{
                        animationDuration: `${animationDuration}s`,
                    }}
                >
                    <div className="d-flex">
                        <span className="me-4">
                            A special thanks to our Tier 3 Patrons:
                        </span>

                        {Object.entries(patreonData || {})
                            .sort(() => Math.random() - 0.5)
                            .filter(([, v]) => {
                                if (!v.tier || v.tier < 3) return false;

                                return (
                                    !v.preferences ||
                                    v.preferences.featureInScrollbar
                                );
                            })
                            .map(([k]) => {
                                return (
                                    <div className="me-4" key={`${k}patron`}>
                                        <UserLink
                                            key={`${k}patron`}
                                            username={k}
                                        />
                                    </div>
                                );
                            })}
                    </div>
                </div>
            </div>

            <div className="container">
                <Row sm={2} md={4} className="pb-3 text-center row-cols-1">
                    <Col className="mt-3">
                        <h3>General</h3>
                        <a href={"/about"}>About</a> <br />
                        <a href={"/roadmap"}>Roadmap</a> <br />
                        <a href={"/faq"}>FAQ</a> <br />
                        <a href={"/live"}>Live</a> <br />
                        <a href={"/blog"}>Blog</a> <br />
                    </Col>
                    <Col className="mt-3">
                        <h3>Media</h3>
                        <a href={"/media"}>Media kit</a> <br />
                    </Col>
                    <Col className="mt-3">
                        <h3>Privacy and Terms</h3>
                        <a href={"/terms"}>Terms and conditions</a> <br />
                        <a href={"/privacy-policy"}>Privacy Policy</a>
                    </Col>
                    <Col className="mt-3">
                        <h3>Contact</h3>
                        <a href={"/contact"}>Contact form</a> <br />
                        <a
                            rel={"noreferrer"}
                            target={"_blank"}
                            href={process.env.NEXT_PUBLIC_DISCORD_URL}
                        >
                            Discord
                        </a>
                        <br />
                        <a
                            rel={"noreferrer"}
                            target={"_blank"}
                            href={process.env.NEXT_PUBLIC_TWITTER_URL}
                        >
                            Twitter
                        </a>{" "}
                        <br />
                        <a
                            rel={"noreferrer"}
                            target={"_blank"}
                            href={"mailto:info@therun.gg"}
                        >
                            info@therun.gg
                        </a>
                    </Col>
                </Row>
            </div>
        </footer>
    );
};
