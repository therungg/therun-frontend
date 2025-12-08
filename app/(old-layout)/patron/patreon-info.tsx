"use client";

import React from "react";
import Link from "next/link";
import { usePatreons } from "~src/components/patreon/use-patreons";
import { Col, Row, Table } from "react-bootstrap";
import { UserLink } from "~src/components/links/links";
import { CheckmarkIcon } from "~src/icons/checkmark-icon";
import { CrossIcon } from "~src/icons/cross-icon";
import { BunnyIcon } from "~src/icons/bunny-icon";
import { Button } from "~src/components/Button/Button";

const stripePaymentButton = "https://donate.stripe.com/8wMg2RgR3gNfblu7ss";

export function PatreonInfo({ session }: { session: { username: string } }) {
    const { data: patreonData, isLoading } = usePatreons();

    return (
        <>
            <Row className="g-4 mb-4 text-center">
                <h1 className="text-center">Support therun.gg</h1>
                <Col xs={10} xl={5} className="mx-auto">
                    <div className="h-100 p-4 p-md-5 bg-body-secondary border rounded-3 border-secondary border-2">
                        <h3>Become a Patron</h3>
                        <p className="mb-4">
                            Read the section below to discover what you can
                            unlock!
                        </p>
                        <Link
                            target="_blank"
                            rel="noreferrer"
                            href="https://patreon.com/therungg"
                            prefetch={false}
                        >
                            <Button
                                variant="secondary"
                                className="btn-secondary btn-lg border-2 px-3 h-3r fw-medium w-240p h-4r fs-large mw-100"
                            >
                                Go to Patreon
                            </Button>
                        </Link>
                    </div>
                </Col>
                <Col xs={10} xl={5} className="mx-auto">
                    <div className="h-100 p-4 p-md-5 bg-body-secondary border rounded-3 border-primary border-2">
                        <h3>Donate with Stripe</h3>
                        <p className="mb-4">
                            To support me on a one-time basis, you can donate
                            with Stripe
                        </p>
                        <Link
                            target="_blank"
                            rel="noreferrer"
                            href={stripePaymentButton}
                            prefetch={false}
                        >
                            <Button className="btn-lg border-2 px-3 h-3r fw-medium w-240p h-4r fs-large mw-100">
                                Donate with Stripe
                            </Button>
                        </Link>
                    </div>
                </Col>
            </Row>
            <hr />
            <Row>
                <Col lg={6} md={12} className="text-center">
                    <div className="d-flex justify-content-center mb-3">
                        <PatreonBunnySvg size={95} />
                    </div>
                    <p>
                        The Run will always be without ads and without paywalls.
                    </p>
                    <p>
                        If you like what I do, please consider joining the
                        Patreon program.
                        <br />
                        This allows me to keep the site running and build more
                        cool stuff in the future!
                    </p>

                    <p>
                        In return for your unending generosity, I will give you
                        some cool little visual perks.
                        <br />
                        See the table with benefits for what I can give you!
                    </p>
                    {session.username && (
                        <p>
                            To claim your benefits,&nbsp;
                            <a href="/change-appearance">click here!</a>
                        </p>
                    )}

                    <hr />

                    <h2 className="mb-3">Patrons</h2>
                    <Row xs={1} sm={2} md={3} lg={2} xl={3} className="g-3">
                        {patreonData &&
                            !isLoading &&
                            Object.keys(patreonData)
                                .filter((key) => {
                                    const pref = patreonData[key];
                                    if (!pref.preferences) return true;
                                    if (pref.preferences.hide) return false;
                                    return pref.preferences.featureOnOverview;
                                })
                                .map((key, n) => {
                                    return (
                                        <Col key={n} className="fs-x-large">
                                            <UserLink username={key} />
                                        </Col>
                                    );
                                })}
                    </Row>
                </Col>
                <Col className="text-center">
                    <Table responsive>
                        <thead>
                            <tr>
                                <th className="w-60"></th>
                                <th className="w-20">For free</th>
                                <th className="w-20">For Patreons</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td className="text-start">
                                    Unlimited access to data from all your
                                    favorite runners
                                </td>
                                <td>
                                    <CheckmarkIcon />
                                </td>
                                <td>
                                    <CheckmarkIcon />
                                </td>
                            </tr>
                            <tr>
                                <td className="text-start">
                                    Profile with overview of all your runs
                                </td>
                                <td>
                                    <CheckmarkIcon />
                                </td>
                                <td>
                                    <CheckmarkIcon />
                                </td>
                            </tr>
                            <tr>
                                <td className="text-start">
                                    Advanced stats about all your runs
                                </td>
                                <td>
                                    <CheckmarkIcon />
                                </td>
                                <td>
                                    <CheckmarkIcon />
                                </td>
                            </tr>
                            <tr>
                                <td className="text-start">
                                    Compare your stats to others
                                </td>
                                <td>
                                    <CheckmarkIcon />
                                </td>
                                <td>
                                    <CheckmarkIcon />
                                </td>
                            </tr>
                            <tr>
                                <td className="text-start">
                                    Access to The Run Live
                                </td>
                                <td>
                                    <CheckmarkIcon />
                                </td>
                                <td>
                                    <CheckmarkIcon />
                                </td>
                            </tr>
                            <tr>
                                <td className="text-start">
                                    Automatic real-time syncing of your splits
                                </td>
                                <td>
                                    <CheckmarkIcon />
                                </td>
                                <td>
                                    <CheckmarkIcon />
                                </td>
                            </tr>
                            <tr>
                                <td className="text-start">Twitch extension</td>
                                <td>
                                    <CheckmarkIcon />
                                </td>
                                <td>
                                    <CheckmarkIcon />
                                </td>
                            </tr>
                            <tr>
                                <td className="text-start">
                                    Any other feature available now or in the
                                    future
                                </td>
                                <td>
                                    <CheckmarkIcon />
                                </td>
                                <td>
                                    <CheckmarkIcon />
                                </td>
                            </tr>
                            <tr>
                                <td className="text-start">
                                    Neat game overview
                                </td>
                                <td>
                                    <CheckmarkIcon />
                                </td>
                                <td>
                                    <CheckmarkIcon />
                                </td>
                            </tr>
                            <tr>
                                <td className="text-start">
                                    Game + category leaderboards for a bunch of
                                    stats
                                </td>
                                <td>
                                    <CheckmarkIcon />
                                </td>
                                <td>
                                    <CheckmarkIcon />
                                </td>
                            </tr>
                            <tr>
                                <td className="text-start">
                                    This amazing golden rabbit next to your name{" "}
                                    <PatreonBunnySvg size={20} />
                                </td>
                                <td>
                                    <CrossIcon />
                                </td>
                                <td>
                                    <CheckmarkIcon />
                                </td>
                            </tr>
                            <tr>
                                <td className="text-start">
                                    Customize how your name shows up on the site
                                </td>
                                <td>
                                    <CrossIcon />
                                </td>
                                <td>
                                    <CheckmarkIcon />
                                </td>
                            </tr>
                            <tr>
                                <td className="text-start">
                                    Exclusive access to a Patreon Discord-role +
                                    channel
                                </td>
                                <td>
                                    <CrossIcon />
                                </td>
                                <td>
                                    <CheckmarkIcon />
                                </td>
                            </tr>
                            <tr>
                                <td className="text-start">
                                    Special shoutouts on the site (like on this
                                    page!)
                                </td>
                                <td>
                                    <CrossIcon />
                                </td>
                                <td>
                                    <CheckmarkIcon />
                                </td>
                            </tr>
                            <tr>
                                <td className="text-start">
                                    My eternal thanks and gratitude
                                </td>
                                <td>
                                    <CrossIcon />
                                </td>
                                <td>
                                    <CheckmarkIcon />
                                </td>
                            </tr>
                        </tbody>
                    </Table>
                </Col>
            </Row>
        </>
    );
}

export const PatreonBunnySvg = ({ size = 20, url = "/patron" }) => {
    return (
        <a
            href={url}
            target="_blank"
            rel="noreferrer"
            style={{ marginBottom: "4%" }}
        >
            <BunnyIcon size={size} />
        </a>
    );
};
