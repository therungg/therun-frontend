import { Col, Image, Row } from "react-bootstrap";
import styles from "../css/LiveRun.module.scss";
import React, { useEffect, useState } from "react";
import { UserLink } from "../links/links";
import { usePatreons } from "../patreon/use-patreons";
import patreonStyles from "../patreon/patreon-styles";
import { DurationToFormatted } from "../util/datetime";
import { LiveRun } from "~app/live/live.types";
import { LiveSplitTimerComponent } from "~app/live/live-split-timer.component";
import { GameImage } from "~src/components/image/gameimage";
import { Twitch as TwitchIcon } from "react-bootstrap-icons";
import { getColorMode } from "~src/utils/colormode";
import { CombinedLeaderboardStat } from "~app/tournaments/[tournament]/get-combined-tournament-leaderboard.component";

export const LiveUserRun = ({
    liveRun,
    currentlyActive,
    showGameCategory = true,
    leaderboard = null,
    leaderboardGameTime = null,
    isUrl = false,
    seedingTable = [],
}: {
    liveRun: LiveRun;
    currentlyActive?: string;
    showGameCategory?: boolean;
    leaderboard?: any;
    leaderboardGameTime?: any;
    isUrl?: boolean;
    seedingTable?: CombinedLeaderboardStat[];
}) => {
    const [dark, setDark] = useState(true);
    const [liveUserStyles, setLiveUserStyles] = useState({});
    const { data: patreons, isLoading } = usePatreons();
    useEffect(function () {
        setDark(getColorMode() !== "light");
    }, []);

    useEffect(() => {
        if (!isLoading && patreons && patreons[liveRun.user]) {
            const patreonData = patreons[liveRun.user];
            let borderColor = "";
            let gradient = "";

            if (!patreonData.preferences || !patreonData.preferences.hide) {
                const colors = patreonStyles();
                const color = patreonData.preferences?.colorPreference ?? 0;

                const style =
                    colors.find((val) => val.id === color) ?? colors[0];
                const [darkStyle, lightStyle] = style.style;
                borderColor = dark ? darkStyle.color : lightStyle.color;
                gradient = dark
                    ? darkStyle.backgroundImage
                    : lightStyle.backgroundImage;
            } else {
                borderColor = "var(--bs-link-color)";
            }
            setLiveUserStyles({ borderColor, gradient });
        }
    }, [patreons, isLoading, liveRun.user]);

    let tournamentPb = null;
    let tournamentPbGameTime = null;
    let ranking = null;
    let seed = null;

    if (leaderboard) {
        const pbLeaderboardIndex = leaderboard.findIndex(
            (count) => count.username == liveRun.user,
        );

        if (pbLeaderboardIndex > -1) {
            ranking = pbLeaderboardIndex + 1;
            tournamentPb = leaderboard[pbLeaderboardIndex].stat;
        }
    }

    if (leaderboardGameTime) {
        const pbLeaderboardIndex = leaderboardGameTime.findIndex(
            (count) => count.username == liveRun.user,
        );

        if (pbLeaderboardIndex > -1) {
            ranking = pbLeaderboardIndex + 1;
            tournamentPbGameTime = leaderboardGameTime[pbLeaderboardIndex].stat;
        }
    }

    if (seedingTable) {
        const userSeed = seedingTable.findIndex(
            (val) => val.username === liveRun.user,
        );

        if (userSeed > -1) seed = userSeed + 1;
    }

    return (
        <div
            className={`card d-flex flex-row rounded-0 h-110p overflow-hidden w-100 game-border ${
                styles.liveRunContainer
            } ${
                liveRun.user == currentlyActive
                    ? "bg-body-tertiary"
                    : "bg-body-secondary"
            }`}
            style={
                liveUserStyles.gradient
                    ? {
                          borderImageSource: liveUserStyles.gradient,
                          borderImageSlice: 1,
                          borderWidth: "2px",
                      }
                    : {
                          borderColor: liveUserStyles.borderColor,
                          borderWidth:
                              liveUserStyles.gradient ||
                              liveUserStyles.borderColor
                                  ? "2px"
                                  : "",
                      }
            }
        >
            {liveRun.gameImage &&
                liveRun.gameImage.length > 0 &&
                liveRun.gameImage != "noimage" && (
                    <div
                        style={{
                            minWidth: "81px",
                            maxWidth: "81px",
                        }}
                    >
                        <GameImage
                            alt={liveRun.game}
                            src={liveRun.gameImage}
                            quality={"small"}
                            height={108}
                            width={81}
                            style={
                                liveUserStyles.gradient ||
                                liveUserStyles.borderColor
                                    ? {
                                          height: liveUserStyles.gradient
                                              ? "106px"
                                              : "106px",
                                      }
                                    : {}
                            }
                        />
                    </div>
                )}
            {(!liveRun.gameImage ||
                liveRun.gameImage.length < 1 ||
                liveRun.gameImage == "noimage") && (
                <div
                    style={{
                        minWidth: "81px",
                        maxWidth: "81px",
                    }}
                >
                    <Image
                        alt={"Logo"}
                        src={
                            dark
                                ? "/logo_dark_theme_no_text_transparent.png"
                                : "/logo_light_theme_no_text_transparent.png"
                        }
                        width={"75px"}
                        height={"75px"}
                        className="mt-3"
                    />
                </div>
            )}

            <Row
                className="h-100 py-2 px-3 flex-1 w-100 justify-content-between"
                style={{
                    minWidth: "calc(100% - 81px + var(--bs-gutter-x))",
                    maxWidth: "calc(100% - 81px + var(--bs-gutter-x))",
                }}
            >
                <Col xs={7} className="mw-350p ps-3">
                    <div className="fs-responsive-large d-flex">
                        {ranking && !seed && (
                            <div>
                                #{ranking}
                                &nbsp;-&nbsp;
                            </div>
                        )}
                        {seed && <div>#{seed}&nbsp;-&nbsp;</div>}
                        <UserLink
                            username={liveRun.user}
                            parentIsUrl={isUrl}
                            icon={false}
                        />
                        {liveRun.currentlyStreaming && (
                            <div className="ms-2">
                                <TwitchIcon height={22} color={"#6441a5"} />
                            </div>
                        )}
                    </div>
                    {showGameCategory && (
                        <div className="text-truncate fs-large">
                            {liveRun.game}
                        </div>
                    )}
                    {showGameCategory && (
                        <div className="text-truncate fs-large">
                            {liveRun.category}
                        </div>
                    )}

                    {!showGameCategory && tournamentPbGameTime && (
                        <div className="text-truncate fs-large">
                            Tournament PB -{" "}
                            {!!tournamentPbGameTime && (
                                <DurationToFormatted
                                    duration={tournamentPbGameTime}
                                />
                            )}
                        </div>
                    )}

                    {!showGameCategory &&
                        tournamentPb &&
                        !tournamentPbGameTime && (
                            <div className="text-truncate">
                                Tournament PB -{" "}
                                {!!tournamentPb && (
                                    <DurationToFormatted
                                        duration={tournamentPb}
                                    />
                                )}
                            </div>
                        )}

                    {!showGameCategory &&
                        liveRun.pb &&
                        liveRun.pb != tournamentPbGameTime &&
                        liveRun.pb != tournamentPb && (
                            <div className="text-truncate">
                                Personal Best -{" "}
                                {<DurationToFormatted duration={liveRun.pb} />}
                            </div>
                        )}
                </Col>
                <Col
                    xs={5}
                    className="d-flex justify-content-end align-items-center"
                >
                    <LiveSplitTimerComponent liveRun={liveRun} dark={dark} />
                </Col>
            </Row>
        </div>
    );
};

export const LiveIcon = ({ height = 16, dark = false }) => {
    return (
        <Image
            alt={"Live Icon"}
            src={!dark ? "/LiveTR-light.png" : "/LiveTR-dark.png"}
            height={height}
        />
    );
};

export const Flag = ({ className = "", height = 16, dark = false }) => {
    return (
        <Image
            alt={"Flag"}
            src={
                !dark
                    ? "/Flag finish greenTR-darktransparant.png"
                    : "/Flag finish greenTR-lighttransparant(1).png"
            }
            height={height}
            className={`mt-2 ${className}`}
        />
    );
};
