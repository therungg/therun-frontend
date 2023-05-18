import { Button, Col, Row, Table } from "react-bootstrap";
import { UserLink } from "../components/links/links";
import React from "react";
import styles from "../components/css/Support.module.scss";
import { usePatreons } from "../components/patreon/use-patreons";

const stripePaymentButton = "https://donate.stripe.com/8wMg2RgR3gNfblu7ss";

export const Patron = ({ session }) => {
    const { data: patreonData, isLoading } = usePatreons();

    return (
        <div>
            <h1 className={styles.supportTitle}>Support therun.gg</h1>
            <Row>
                <Col className={styles.supportOption}>
                    <h3 className={styles.becomeAPatreon}>Become a Patron</h3>
                    <div className={styles.unlockText}>
                        Read the section below to discover what you can unlock!
                    </div>
                    <div className={styles.goToPatreonButton}>
                        <a
                            target={"_blank"}
                            rel={"noreferrer"}
                            href={"https://patreon.com/therungg"}
                        >
                            <Button className={styles.learnMoreButton}>
                                Go to Patreon
                            </Button>
                        </a>
                    </div>
                </Col>
                <Col className={styles.supportOptionStripe}>
                    <h3 className={styles.becomeAPatreon}>
                        Donate with Stripe
                    </h3>
                    <div className={styles.unlockText}>
                        To support me on a one-time basis, you can donate with
                        Stripe
                    </div>

                    <div className={styles.goToPatreonButton}>
                        <a
                            target={"_blank"}
                            rel={"noreferrer"}
                            href={stripePaymentButton}
                        >
                            <Button className={styles.learnMoreButtonStripe}>
                                Donate with Stripe
                            </Button>
                        </a>
                    </div>
                </Col>
            </Row>
            <hr />
            <Row>
                <Col lg={6} md={12}>
                    <div className={styles.explainTextMargin}>
                        <PatreonBunnySvg size={95} />
                    </div>

                    <div className={styles.explainTextMargin}>
                        The Run will always be{" "}
                        <span>&nbsp;without ads&nbsp;</span> and{" "}
                        <span>&nbsp;without paywalls</span>.
                    </div>

                    <div className={styles.explainText}>
                        If you like what I do, please consider joining the
                        Patreon program.
                    </div>

                    <div className={styles.explainTextMargin}>
                        This allows me to keep the site running and build more
                        cool stuff in the future!
                    </div>

                    <div className={styles.explainText}>
                        In return for your unending generosity, I will give you
                        some cool little visual perks.
                    </div>

                    <div className={styles.explainTextMargin}>
                        See the table with benefits for what I can give you!
                    </div>
                    {session.username && (
                        <div className={styles.explainText}>
                            To claim your benefits,&nbsp;
                            <a href={"/change-appearance"}>click here!</a>
                        </div>
                    )}

                    <hr />

                    <h2 className={styles.explainText}>Patrons</h2>

                    <Row>
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
                                        <Col
                                            xl={4}
                                            key={n}
                                            className={styles.patron}
                                        >
                                            <UserLink username={key} />
                                        </Col>
                                    );
                                })}
                    </Row>
                </Col>
                <Col>
                    <Table responsive>
                        <thead>
                            <tr>
                                <th style={{ width: "60%" }}></th>
                                <th style={{ width: "20%" }}>
                                    <div className={styles.explainText}>
                                        For free
                                    </div>
                                </th>
                                <th style={{ width: "20%" }}>
                                    <div className={styles.explainText}>
                                        For Patreons
                                    </div>
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>
                                    Unlimited access to data from all your
                                    favorite runners
                                </td>
                                <td>
                                    <div className={styles.explainText}>
                                        <Checkmark />
                                    </div>
                                </td>
                                <td>
                                    <div className={styles.explainText}>
                                        <Checkmark />
                                    </div>
                                </td>
                            </tr>
                            <tr>
                                <td>Profile with overview of all your runs</td>
                                <td>
                                    <div className={styles.explainText}>
                                        <Checkmark />
                                    </div>
                                </td>
                                <td>
                                    <div className={styles.explainText}>
                                        <Checkmark />
                                    </div>
                                </td>
                            </tr>
                            <tr>
                                <td>Advanced stats about all your runs</td>
                                <td>
                                    <div className={styles.explainText}>
                                        <Checkmark />
                                    </div>
                                </td>
                                <td>
                                    <div className={styles.explainText}>
                                        <Checkmark />
                                    </div>
                                </td>
                            </tr>
                            <tr>
                                <td>Compare your stats to others</td>
                                <td>
                                    <div className={styles.explainText}>
                                        <Checkmark />
                                    </div>
                                </td>
                                <td>
                                    <div className={styles.explainText}>
                                        <Checkmark />
                                    </div>
                                </td>
                            </tr>
                            <tr>
                                <td>Access to The Run Live</td>
                                <td>
                                    <div className={styles.explainText}>
                                        <Checkmark />
                                    </div>
                                </td>
                                <td>
                                    <div className={styles.explainText}>
                                        <Checkmark />
                                    </div>
                                </td>
                            </tr>
                            <tr>
                                <td>
                                    Automatic real-time syncing of your splits
                                </td>
                                <td>
                                    <div className={styles.explainText}>
                                        <Checkmark />
                                    </div>
                                </td>
                                <td>
                                    <div className={styles.explainText}>
                                        <Checkmark />
                                    </div>
                                </td>
                            </tr>
                            <tr>
                                <td>Twitch extension</td>
                                <td>
                                    <div className={styles.explainText}>
                                        <Checkmark />
                                    </div>
                                </td>
                                <td>
                                    <div className={styles.explainText}>
                                        <Checkmark />
                                    </div>
                                </td>
                            </tr>
                            <tr>
                                <td>
                                    Any other feature available now or in the
                                    future
                                </td>
                                <td>
                                    <div className={styles.explainText}>
                                        <Checkmark />
                                    </div>
                                </td>
                                <td>
                                    <div className={styles.explainText}>
                                        <Checkmark />
                                    </div>
                                </td>
                            </tr>
                            <tr>
                                <td>Neat game overview</td>
                                <td>
                                    <div className={styles.explainText}>
                                        <Checkmark />
                                    </div>
                                </td>
                                <td>
                                    <div className={styles.explainText}>
                                        <Checkmark />
                                    </div>
                                </td>
                            </tr>
                            <tr>
                                <td>
                                    Game + category leaderboards for a bunch of
                                    stats
                                </td>
                                <td>
                                    <div className={styles.explainText}>
                                        <Checkmark />
                                    </div>
                                </td>
                                <td>
                                    <div className={styles.explainText}>
                                        <Checkmark />
                                    </div>
                                </td>
                            </tr>
                            <tr>
                                <td>
                                    This amazing golden rabbit next to your name{" "}
                                    <PatreonBunnySvg size={20} />
                                </td>
                                <td>
                                    <div className={styles.explainText}>
                                        <Cross />
                                    </div>
                                </td>
                                <td>
                                    <div className={styles.explainText}>
                                        <Checkmark />
                                    </div>
                                </td>
                            </tr>
                            <tr>
                                <td>
                                    Customize how your name shows up on the site
                                </td>
                                <td>
                                    <div className={styles.explainText}>
                                        <Cross />
                                    </div>
                                </td>
                                <td>
                                    <div className={styles.explainText}>
                                        <Checkmark />
                                    </div>
                                </td>
                            </tr>
                            <tr>
                                <td>
                                    Exclusive access to a Patreon Discord-role +
                                    channel
                                </td>
                                <td>
                                    <div className={styles.explainText}>
                                        <Cross />
                                    </div>
                                </td>
                                <td>
                                    <div className={styles.explainText}>
                                        <Checkmark />
                                    </div>
                                </td>
                            </tr>
                            <tr>
                                <td>
                                    Special shoutouts on the site (like on this
                                    page!)
                                </td>
                                <td>
                                    <div className={styles.explainText}>
                                        <Cross />
                                    </div>
                                </td>
                                <td>
                                    <div className={styles.explainText}>
                                        <Checkmark />
                                    </div>
                                </td>
                            </tr>
                            <tr>
                                <td>My eternal thanks and gratitude</td>
                                <td>
                                    <div className={styles.explainText}>
                                        <Cross />
                                    </div>
                                </td>
                                <td>
                                    <div className={styles.explainText}>
                                        <Checkmark />
                                    </div>
                                </td>
                            </tr>
                        </tbody>
                    </Table>
                </Col>
            </Row>
        </div>
    );
};

const Checkmark = () => {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width="32"
            height="32"
            fill="var(--color-link)"
            className="bi bi-check"
            viewBox="0 0 16 16"
        >
            <path d="M10.97 4.97a.75.75 0 0 1 1.07 1.05l-3.99 4.99a.75.75 0 0 1-1.08.02L4.324 8.384a.75.75 0 1 1 1.06-1.06l2.094 2.093 3.473-4.425a.267.267 0 0 1 .02-.022z" />
        </svg>
    );
};

export const Cross = () => {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width="32"
            height="32"
            fill="var(--color-negative)"
            className="bi bi-x-lg"
            viewBox="0 0 16 16"
        >
            <path d="M2.146 2.854a.5.5 0 1 1 .708-.708L8 7.293l5.146-5.147a.5.5 0 0 1 .708.708L8.707 8l5.147 5.146a.5.5 0 0 1-.708.708L8 8.707l-5.146 5.147a.5.5 0 0 1-.708-.708L7.293 8 2.146 2.854Z" />
        </svg>
    );
};

export const PatreonBunnySvg = ({ size = 20, url = "/patron" }) => {
    return (
        <a
            href={url}
            target={"_blank"}
            rel={"noreferrer"}
            style={{ marginBottom: "4%" }}
        >
            <PatreonBunnySvgWithoutLink size={size} url={url} />
        </a>
    );
};

export const PatreonBunnySvgWithoutLink = ({ size = 20 }) => {
    return (
        <span style={{ marginBottom: "4%" }}>
            <svg
                id="Layer_1"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="35 200 612 400"
                height={size}
            >
                <path
                    style={{ fill: "var(--color-gold)" }}
                    d="M103.51,473.8l2.36-3.44c-.37-4.54-1.06-9.06-2.14-13.49-32.19-131.96,197.53-172.35,277.76-106.65,6.68,5.11,16.31,3.34,20.44-3.93l13.36-22.2c-54.41-32.73-68.58-59.52-77.11-70.73-18.57-24.43-19.34-44.31,49.85-16.62,25.44,10.18,38.92,12.46,75.01,55.12,21.22,25.15,56,4.13,78.2,25.54,100.41,97.26-42.64,76.04-90.78,140.49-.43,.57-.78,1.42-1.04,2.44-1.9,7.4,2.52,14.99,9.81,17.29,46.56,14.66,72.89,58.42,28.96,68.6-14.64,3.39-30.05,1.36-43.49-5.36-33.33-16.66-67.47-27.26-99.51-44.39-9.43-5.04-25.73-12.25-36.16-14.6-33.33-7.49-70.05-6.03-96.79,0-12.66,2.86-28.94,6.71-38.41,15.58-29.34,28.85-97.41,118.26-104.63,39.71-2.4-26.13,15.9-44.67,34.32-63.37Z"
                />

                <path
                    style={{ fill: "var(--color-gold)" }}
                    d="M132.32,370.39c-1.48-4.85-3.65-9.48-6.44-13.72-1.43-2.18-3.1-4.31-5.41-5.52-3.41-1.78-7.73-1.15-10.98,.91s-5.53,5.37-7.14,8.86c-.79,1.71-1.46,3.52-2.73,4.92-4.61,5.08-13.62,1.78-19.38,5.5-4.52,2.92-5.22,10.25-1.34,13.98,1.54,1.48,3.64,2.46,4.63,4.35,1.1,2.11,.46,4.64,.36,7.01-.25,5.61,2.94,11.23,7.87,13.9s11.38,2.26,15.94-1.02"
                />
            </svg>
        </span>
    );
};

export const PatreonBunnySvgMarioPipe = ({ size = 20, url = "/patron" }) => {
    return (
        <a
            href={url}
            target={"_blank"}
            rel={"noreferrer"}
            style={{ marginBottom: "4%" }}
        >
            <svg
                id="Layer_1"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="35 100 612 450"
                height={size}
            >
                <path
                    style={{ fill: "var(--color-gold)" }}
                    d="M255.2,440.8l-0.7-2.6c-2.4-1.7-5-3.3-7.7-4.6c-79.7-39.6-2.9-171.8,63.9-184.2c5.4-1.2,8.6-6.8,6.7-11.9
		l-5.5-16.1c-39.4,13.4-58.8,9.2-68,8.8c-20.1-1-30.4-9,12.7-32c15.8-8.4,22.7-14.2,59.3-14.3c21.6,0,25.7-26.3,45.8-28.4
		c91.2-9.2,20.1,53.5,32,104.8c0.1,0.5,0.4,1,0.8,1.6c2.9,4.1,8.6,5.1,12.8,2.4c27-17.1,60.1-11.8,46.6,14.5
		c-4.5,8.8-12,15.6-21.1,19.5c-22.4,9.7-42.2,22.3-64.3,31.1c-6.5,2.6-17,7.7-22.6,12c-17.8,13.5-32.6,32.6-40.9,48.5
		c-3.9,7.6-8.9,17.3-8.4,25.8c2.1,26.9,18.1,98.8-24.3,69.2C258.4,475,256.8,458,255.2,440.8z"
                />
                <path
                    style={{ fill: "var(--color-gold)" }}
                    d="M215.6,382.7c-3.1-1.3-6.3-2.2-9.6-2.6c-1.7-0.2-3.5-0.3-5,0.4c-2.3,1-3.8,3.4-4.2,5.9c-0.3,2.5,0.4,5,1.4,7.3
		c0.5,1.1,1.1,2.2,1.3,3.4c0.6,4.5-4.9,7.6-5.4,12c-0.4,3.5,2.9,6.9,6.4,6.6c1.4-0.1,2.8-0.8,4.1-0.5c1.5,0.3,2.5,1.7,3.7,2.8
		c2.7,2.5,6.9,3.3,10.3,1.9c3.4-1.3,5.9-4.8,6.2-8.4"
                />
                <g>
                    <rect
                        x="177.3"
                        y="443"
                        style={{ fill: "#22763B" }}
                        width="229.6"
                        height="200.8"
                    />
                    <path
                        style={{ fill: "#163119" }}
                        d="M415.9,448.1H168.3c-13.7,0-24.8-11.1-24.8-24.8V377c0-13.7,11.1-24.8,24.8-24.8h247.6
		c13.7,0,24.8,11.1,24.8,24.8v46.4C440.6,437,429.5,448.1,415.9,448.1z"
                    />
                    <path
                        style={{ fill: "#22763B" }}
                        d="M415.9,437.9H168.3c-13.7,0-24.8-11.1-24.8-24.8v-46.4c0-13.7,11.1-24.8,24.8-24.8h247.6
		c13.7,0,24.8,11.1,24.8,24.8v46.4C440.6,426.8,429.5,437.9,415.9,437.9z"
                    />
                    <path
                        style={{ fill: "#39A849" }}
                        d="M237.5,486.5v127.9c0,11.3-9.1,20.4-20.4,20.4h-2.7c-11.3,0-20.4-9.1-20.4-20.4V486.5
		c0-11.3,9.1-20.4,20.4-20.4h2.7C228.4,466.1,237.5,475.2,237.5,486.5z"
                    />
                </g>
            </svg>
        </a>
    );
};

export const PatreonBunnySvgChristmas = ({ size = 30, url = "/patron" }) => {
    return (
        <a
            href={url}
            target={"_blank"}
            rel={"noreferrer"}
            style={{ marginBottom: "4%" }}
        >
            <svg
                id="Layer_2"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 612 792"
                height={size}
            >
                <path
                    style={{ fill: "#fdc545" }}
                    d="M391.88,228.35c-26.41,62.65-20.36,125.85,12.15,131.57,32.89,5.79,53.19-26.92,68.04-93.3,6.39-28.58,7.87-60.93,6.64-78.65-1.06-15.34,10.99-59.56-6.59-64.6-22.13-6.34-57.4,50.81-80.24,104.98Z"
                />
                <path
                    style={{ fill: "#fdc545" }}
                    d="M465.79,473.38c0,80.04,73.9,163.2-135.45,171.76-211.46,8.64-135.45-91.71-135.45-171.76s60.64-144.93,135.45-144.93,135.45,64.89,135.45,144.93Z"
                />
                <path
                    style={{ fill: "#ed1c24" }}
                    d="M449.74,362.29c0,49.43-40.75,43.53-122.71,43.53s-132.14,24.43-132.14-25,49.88-135.79,131.84-135.79,123.01,67.82,123.01,117.25Z"
                />
                <path
                    style={{ fill: "#ed1c24" }}
                    d="M207.25,467.1c-7.08-106.8,124.28-208.75,113.08-221.4-.39-.44-1.04-.67-1.97-.67-20.86,0-179.72,9.22-179.72,117.28s16.33,170.3,30.86,185.26c17.99,18.52,42.53,13.89,37.74-3.05"
                />
                <path
                    style={{ fill: "#fdc545" }}
                    d="M254.73,263.77c26.41,62.65,20.36,125.85-12.15,131.57-32.89,5.79-53.19-26.92-68.04-93.3-6.39-28.58-7.87-60.93-6.64-78.65,1.06-15.34-10.99-59.56,6.59-64.6,22.13-6.34,57.4,50.81,80.24,104.98Z"
                />
                <path
                    style={{ fill: "#e6e7e8" }}
                    d="M388.89,294.61c55.07,33.84-12.47,25.93,62.41,48.43,7.4,2.22,12.67,9.03,12.38,16.75-.08,2.04-.49,4-1.25,5.74-2.12,4.83-1.67,10.4,.72,15.1,10.59,20.81-12.56,47.97-37.5,44.16-.31-.05-.62-.09-.94-.11-6.96-.57-13.67-2.62-19.97-5.65-8.14-3.9-18.06-1.2-22.67,6.57-11.67,19.69-34.76,14.16-53.25,1.1-7.13-5.04-16.9-3.81-22.73,2.69-17.89,19.95-46.43,33.76-60.84,11.04-5.26-8.29-16.31-10.59-24.41-5.04-24.81,16.99-48.34,43.43-55.87-18.91-.7-5.8,1.51-11.65,6.05-15.32,1.33-1.08,2.79-1.98,4.32-2.65,5.33-2.34,9.02-7.31,10.26-13,3.24-14.83,17.77-27.49,33.08-26.85,1.9,.08,3.76,.54,5.52,1.24,35.67,14.14,46.07-56.03,85.07-37.08,1.27,.62,2.46,1.42,3.53,2.33,28.79,24.53,48.27-47.65,76.09-30.56Z"
                />
                <circle
                    style={{ fill: "#e6e7e8" }}
                    cx="368.88"
                    cy="560.75"
                    r="47.88"
                />
                <circle
                    style={{ fill: "#e6e7e8" }}
                    cx="271.77"
                    cy="560.75"
                    r="48.01"
                />
                <path
                    style={{ fill: "#fac3b9" }}
                    d="M330.93,566.99l13.01-23.41c3.38-6.08-1.21-13.51-8.16-13.21l-27.93,1.17c-6.95,.29-10.89,8.08-7.02,13.85l14.93,22.24c3.71,5.52,11.94,5.18,15.17-.64Z"
                />
                <path
                    style={{ fill: "#e6e7e8" }}
                    d="M174.69,599.05c11.83,6.01,33.89-18.48,25.55-26.12,5.02,3.44,13.31,.88,18.23-4.97,11.81-11.56,2.15-39.6-12.43-23.79,9.16-16.28-11.51-28.16-24.1-24.49-13.9,6.98-11.32,25.47-4.3,33.54-5.09-5.05-11.32-10.31-19.26-10.02-22.05,2.31-5.13,36.17,7.3,23.58-21.29,13.64,2.99,24.92,9.01,32.26Z"
                />
            </svg>
        </a>
    );
};

export default Patron;
