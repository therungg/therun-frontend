"use client";

import { PatreonBunnySvg } from "~app/patron/patreon-info";
import { Button, Col, Row } from "react-bootstrap";
import React, { useState } from "react";
import Switch from "react-switch";
import styles from "~src/components/css/Appearance.module.scss";
import axios from "axios";
import Router from "next/router";
import patreonStyles from "~src/components/patreon/patreon-styles";
import PatreonName from "~src/components/patreon/patreon-name";
import { User } from "../../types/session.types";

interface PatreonPreferences {
    hide: boolean;
    featureInScrollbar: boolean;
    featureOnOverview: boolean;
    showIcon: boolean;
    colorPreference: number;
}

interface PatreonSectionProps {
    userPatreonData: any;
    session: User;
}

export default function PatreonSection({
    userPatreonData,
    session,
}: PatreonSectionProps) {
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
}

const YouAreAPatreon = ({ userPatreonData, session }: PatreonSectionProps) => {
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

const PatreonSettings = ({ userPatreonData, session }: PatreonSectionProps) => {
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
            <h1 className="mb-2">Patreon Customization</h1>
            <div className="mb-4">
                Thank you for supporting! You can now choose your preferences.
            </div>
            <div className="d-flex justify-content-center mb-5 fs-xxx-large">
                <div className="bg-body-secondary py-4 px-5 border border-secondary-subtle">
                    <PatreonName
                        name={session.username}
                        color={colorPreference}
                        icon={showIcon}
                        size={40}
                    />
                </div>
            </div>
            <Col>
                <h3 className="mb-3">Color customization</h3>
                {[1, 2, 3].map((n) => {
                    return (
                        <Row key={n} className="w-100 text-center">
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
                                                        parseInt(
                                                            style.id as string
                                                        )
                                                    );
                                                } else {
                                                    alert(
                                                        `This color is only available for tier ${n} Patreons or higher.`
                                                    );
                                                }
                                            }}
                                        >
                                            <div
                                                className={`mx-2 ${
                                                    userPatreonData.tier >= n
                                                        ? "border border-hover cursor-pointer"
                                                        : " "
                                                } ${
                                                    colorPreference == style.id
                                                        ? "border border-secondary"
                                                        : ""
                                                }`}
                                            >
                                                <div className="bg-dark">
                                                    <span
                                                        style={{
                                                            ...style.style[0],
                                                        }}
                                                    >
                                                        {session.username}
                                                    </span>
                                                </div>
                                                <div className="bg-light">
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
            <Col className="ms-5">
                <h3 className="mb-3">Display preferences</h3>
                <div className="d-flex justify-content-start align-items-center mb-3">
                    <Switch
                        name={"switch"}
                        onChange={(checked) => {
                            setHide(!checked);
                        }}
                        checked={!hide}
                    />
                    <label htmlFor={"switch"} className="ms-2 text-nowrap">
                        Display me as Patreon{" "}
                        <span className="d-none d-lg-inline">
                            (overrides all other settings when switched off)
                        </span>
                    </label>
                </div>
                <div className="d-flex justify-content-start align-items-center mb-3">
                    <Switch
                        name={"switch"}
                        onChange={(checked) => {
                            setShowIcon(checked);
                        }}
                        checked={showIcon}
                    />
                    <label htmlFor={"switch"} className="ms-2 text-nowrap">
                        Show the <PatreonBunnySvg /> next to my name
                    </label>
                </div>
                <div className="d-flex justify-content-start align-items-center mb-3">
                    <Switch
                        name={"switch"}
                        onChange={(checked) => {
                            setFeatureOnOverview(checked);
                        }}
                        checked={featureOnOverview}
                    />
                    <label htmlFor={"switch"} className="ms-2 text-nowrap">
                        Display my name on the Support page
                    </label>
                </div>
                {(userPatreonData.tier > 2 ||
                    session.username == "joeys64") && (
                    <div className="d-flex justify-content-start align-items-center mb-3">
                        <Switch
                            name={"switch"}
                            onChange={(checked) => {
                                setFeatureInScrollbar(checked);
                            }}
                            checked={featureInScrollbar}
                        />
                        <label htmlFor={"switch"} className="ms-2 text-nowrap">
                            Display my name in the scrolling bar
                        </label>
                    </div>
                )}
                <div className="d-flex justify-content-end">
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
