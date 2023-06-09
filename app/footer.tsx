"use client";
import React from "react";
import { Col, Row } from "react-bootstrap";
import { usePatreons } from "../src/components/patreon/use-patreons";
import { UserLink } from "../src/components/links/links";

const DEFAULT_ANIMATION_DURATION = 30;

export const Footer = () => {
    const { data: patreonData } = usePatreons();
    const patronCount = Object.keys(patreonData || {}).length;
    const animationDuration =
        Math.floor(patronCount * 0.5) + DEFAULT_ANIMATION_DURATION;
    return (
        <footer className={"footer"}>
            <div className="scroll-bar">
                <div
                    style={{
                        animationDuration: `${animationDuration}s`,
                    }}
                >
                    <div style={{ display: "flex" }}>
                        <span style={{ marginRight: "2rem" }}>
                            A special thanks to our Tier 3 Patrons:
                        </span>

                        {Object.entries(patreonData || {})
                            .sort(() => Math.random() - 0.5)
                            .filter(([, v]) => {
                                if (!v.tier || v.tier < 3) return false;

                                return (
                                    !v.preferences ||
                                    !!v.preferences.featureInScrollbar
                                );
                            })
                            .map(([k]) => {
                                return (
                                    <div
                                        key={`${k}patron`}
                                        style={{
                                            marginRight: "2rem",
                                        }}
                                    >
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

            <div style={{ paddingTop: "1rem" }}>
                <div className={"container"}>
                    <Row>
                        <Col>
                            <h3>General</h3>
                            <a href={"/about"}>About</a> <br />
                            <a href={"/roadmap"}>Roadmap</a> <br />
                            <a href={"/faq"}>FAQ</a> <br />
                            <a href={"/live"}>Live</a> <br />
                            <a href={"/blog"}>Blog</a> <br />
                        </Col>
                        <Col>
                            <h3>Media</h3>
                            <a href={"/media"}>Media kit</a> <br />
                        </Col>
                        <Col>
                            <h3>Privacy and Terms</h3>
                            <a href={"/terms"}>Terms and conditions</a> <br />
                            <a href={"/privacy-policy"}>Privacy Policy</a>
                        </Col>
                        <Col>
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
            </div>
        </footer>
    );
};
