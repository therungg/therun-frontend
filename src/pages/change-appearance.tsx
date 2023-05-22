import { PatreonBunnySvg } from "./patron";
import { Button, Col, Row } from "react-bootstrap";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import Switch from "react-switch";
import styles from "../components/css/Appearance.module.scss";
import axios from "axios";
import Router from "next/router";
import patreonStyles from "../components/patreon/patreon-styles";
import PatreonName from "../components/patreon/patreon-name";
import { AppContext } from "../common/app.context";
import { TwitchLoginServer } from "../components/twitch/TwitchLoginButton.server";

const patreonApiBaseUrl = process.env.NEXT_PUBLIC_PATREON_API_URL;

interface PatreonPreferences {
    hide: boolean;
    featureInScrollbar: boolean;
    featureOnOverview: boolean;
    showIcon: boolean;
    colorPreference: number;
}

export const ChangeAppearance = ({ session, userPatreonData }) => {
    return (
        <div>
            {!userPatreonData && (
                <div
                    style={{
                        display: "flex",
                        justifyContent: "center",
                        marginBottom: "2rem",
                    }}
                >
                    <LoginWithPatreonSection session={session} />
                </div>
            )}
            {userPatreonData && (
                <CustomPatreonSection
                    session={session}
                    userPatreonData={userPatreonData}
                />
            )}
        </div>
    );
};

const CustomPatreonSection = ({ userPatreonData, session }) => {
    return (
        <div>
            {userPatreonData.tier && (
                <YouAreAPatreon
                    session={session}
                    userPatreonData={userPatreonData}
                />
            )}
            {!userPatreonData.tier && "You are not a patreon!"}
        </div>
    );
};

const YouAreAPatreon = ({ userPatreonData, session }) => {
    return (
        <div>
            <div>
                <PatreonSettings
                    userPatreonData={userPatreonData}
                    session={session}
                />
            </div>
        </div>
    );
};

const PatreonSettings = ({ userPatreonData, session }) => {
    const preferences: PatreonPreferences = userPatreonData.preferences
        ? userPatreonData.preferences
        : {
              hide: false,
              showIcon: true,
              featureInScrollbar: true,
              featureOnOverview: true,
              colorPreference: 0,
          };

    const [hide, setHide] = useState(preferences.hide);
    const [showIcon, setShowIcon] = useState(preferences.showIcon);
    const [featureOnOverview, setFeatureOnOverview] = useState(
        preferences.featureOnOverview
    );
    const [featureInScrollbar, setFeatureInScrollbar] = useState(
        preferences.featureInScrollbar
    );
    const [colorPreference, setColorPreference] = useState(
        preferences.colorPreference
    );

    return (
        <Row>
            <h1 style={{ marginBottom: "0.5rem" }}>Patreon Customization</h1>
            <div style={{ marginBottom: "2rem" }}>
                Thank you for supporting! You can now choose your preferences.
            </div>
            <div className={styles.patreonNamePreviewContainer}>
                <div className={styles.patreonNamePreview}>
                    <PatreonName
                        name={session.username}
                        color={colorPreference}
                        icon={showIcon}
                        size={40}
                    />
                </div>
            </div>
            <Col>
                <h3 className={styles.patreonColorCustomizationText}>
                    Color customization
                </h3>
                {[1, 2, 3].map((n) => {
                    return (
                        <Row key={n} style={{ width: "100%" }}>
                            {patreonStyles()
                                .filter((style) => style.tier == n)
                                .map((style, key) => {
                                    return (
                                        <Col
                                            xs={6}
                                            sm={4}
                                            key={key}
                                            className={
                                                styles.patreonColorContainer
                                            }
                                            onClick={() => {
                                                if (
                                                    userPatreonData.tier >= n ||
                                                    session.username ==
                                                        "joeys64"
                                                ) {
                                                    setColorPreference(
                                                        style.id
                                                    );
                                                } else {
                                                    alert(
                                                        `This color is only available for tier ${n} Patreons or higher.`
                                                    );
                                                }
                                            }}
                                        >
                                            <div
                                                className={`${
                                                    userPatreonData.tier >= n
                                                        ? styles.nameSelector
                                                        : " "
                                                } ${
                                                    colorPreference == style.id
                                                        ? styles.nameSelectorSelected
                                                        : ""
                                                }`}
                                                style={{ margin: "0 0.5rem" }}
                                            >
                                                <div
                                                    className={
                                                        styles.patreonColorLight
                                                    }
                                                >
                                                    <span
                                                        style={{
                                                            ...style.style[0],
                                                        }}
                                                    >
                                                        {session.username}
                                                    </span>
                                                </div>
                                                <div
                                                    className={
                                                        styles.patreonColorDark
                                                    }
                                                >
                                                    <span
                                                        style={{
                                                            ...style.style[1],
                                                        }}
                                                    >
                                                        {session.username}
                                                    </span>
                                                </div>
                                            </div>
                                        </Col>
                                    );
                                })}
                            <hr />
                        </Row>
                    );
                })}
            </Col>
            <Col style={{ marginLeft: "3rem" }}>
                <h3 className={styles.displayPreferencesText}>
                    Display preferences
                </h3>
                <div className={styles.preferenceContainer}>
                    <div className={styles.preference}>
                        <Switch
                            name={"switch"}
                            onChange={(checked) => {
                                setHide(!checked);
                            }}
                            checked={!hide}
                        />
                        <label
                            htmlFor={"switch"}
                            className={styles.preferenceLabel}
                        >
                            Display me as Patreon{" "}
                            <span className={styles.flavourText}>
                                (overrides all other settings when switched off)
                            </span>
                        </label>
                    </div>
                </div>
                <div className={styles.preferenceContainer}>
                    <div className={styles.preference}>
                        <Switch
                            name={"switch"}
                            onChange={(checked) => {
                                setShowIcon(checked);
                            }}
                            checked={showIcon}
                        />
                        <label
                            htmlFor={"switch"}
                            className={styles.preferenceLabel}
                        >
                            Show the <PatreonBunnySvg /> next to my name
                        </label>
                    </div>
                </div>
                <div className={styles.preferenceContainer}>
                    <div className={styles.preference}>
                        <Switch
                            name={"switch"}
                            onChange={(checked) => {
                                setFeatureOnOverview(checked);
                            }}
                            checked={featureOnOverview}
                        />
                        <label
                            htmlFor={"switch"}
                            className={styles.preferenceLabel}
                        >
                            Display my name on the Support page
                        </label>
                    </div>
                </div>
                {(userPatreonData.tier > 2 ||
                    session.username == "joeys64") && (
                    <div className={styles.preferenceContainer}>
                        <div className={styles.preference}>
                            <Switch
                                name={"switch"}
                                onChange={(checked) => {
                                    setFeatureInScrollbar(checked);
                                }}
                                checked={featureInScrollbar}
                            />
                            <label
                                htmlFor={"switch"}
                                className={styles.preferenceLabel}
                            >
                                Display my name in the scrolling bar
                            </label>
                        </div>
                    </div>
                )}
                <div className={styles.saveButtonContainer}>
                    <Button
                        className={styles.saveButton}
                        onClick={async () => {
                            await axios.post(
                                `/api/users/${session.id}-${session.username}/patreon-settings`,
                                {
                                    hide,
                                    showIcon,
                                    featureOnOverview,
                                    featureInScrollbar,
                                    colorPreference,
                                }
                            );

                            Router.reload();
                        }}
                    >
                        Save settings
                    </Button>
                </div>
            </Col>
        </Row>
    );
};

const LoginWithPatreonSection = ({ session }) => {
    const { baseUrl } = React.useContext(AppContext);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(false);
    }, []);

    if (loading) {
        return <div>Loading...</div>;
    }

    if (!session.username) {
        return (
            <div>
                To connect your Patreon account, login with Twitch first.
                <div style={{ display: "flex", justifyContent: "center" }}>
                    <TwitchLoginServer redirect={"/change-appearance"} />
                </div>
            </div>
        );
    }

    let base = baseUrl;
    if (!base) {
        base = "https://therun.gg%2Fchange-appearance";
    } else {
        base += "%2fchange-appearance";
    }

    const url = `https://patreon.com/oauth2/authorize?response_type=code&client_id=QLyBxIC3dSTxWEVqx_YJZCJSHHWxyt3LhE8Nue4_aOXmYlMsq9whaL2-VcqyCf1n&scope=identity&redirect_uri=${base}`;

    return (
        <div>
            <div className={styles.matchText}>
                To match your Patreon with your therun.gg account, link your
                Patreon account here!
            </div>
            <div className={styles.linkPatreonButtonContainer}>
                <Link passHref href={url} legacyBehavior>
                    <Button>Link with Patreon</Button>
                </Link>
            </div>
        </div>
    );
};

ChangeAppearance.getInitialProps = async (ctx) => {
    let baseUrl = "";

    if (ctx.req) {
        const host = ctx.req.headers.host;
        const protocol = host === "localhost:3000" ? "http://" : "https://";
        baseUrl = protocol + baseUrl;
    }

    if (ctx.query.code && ctx.session && ctx.session.id && !ctx.query.scope) {
        const base = encodeURIComponent(`${baseUrl}/change-appearance`);

        const loginUrl = `${process.env.NEXT_PUBLIC_PATREON_LOGIN_URL}?code=${ctx.query.code}&redirect_uri=${base}&session_id=${ctx.session.id}`;
        const patreonLinkData = await fetch(loginUrl);
        const result = await patreonLinkData.json();

        return {
            userPatreonData: result,
        };
    } else if (ctx.session && ctx.session.username) {
        const patreonDataUrl = `${patreonApiBaseUrl}/patreon/${ctx.session.username}`;
        const patreonLinkData = await fetch(patreonDataUrl);
        const result = await patreonLinkData.json();

        return {
            userPatreonData: result,
        };
    }

    return {};
};

export default ChangeAppearance;
