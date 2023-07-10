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
