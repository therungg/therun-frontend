import { Col, Image, Row } from "react-bootstrap";
import styles from "../css/LiveRun.module.scss";
import { useEffect, useState } from "react";
import { UserLink } from "../links/links";
import { TwitchIcon } from "../user/userform";
import { usePatreons } from "../patreon/use-patreons";
import patreonStyles from "../patreon/patreon-styles";
import { DurationToFormatted } from "../util/datetime";
import { LiveRun } from "~app/live/live.types";
import { LiveSplitTimerComponent } from "~app/live/live-split-timer.component";
import { GetGameImageSrc } from "~src/lib/get-game-image-src";

export const LiveUserRun = ({
    liveRun,
    currentlyActive,
    showGameCategory = true,
    leaderboard = null,
    leaderboardGameTime = null,
    isUrl = false,
}: {
    liveRun: LiveRun;
    currentlyActive?: string;
    showGameCategory?: boolean;
    leaderboard?: any;
    leaderboardGameTime?: any;
    isUrl?: boolean;
}) => {
    const [dark, setDark] = useState(true);
    const [liveUserStyles, setLiveUserStyles] = useState({});
    const { data: patreons, isLoading } = usePatreons();
    useEffect(function () {
        setDark(document.documentElement.dataset.theme !== "light");
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
                borderColor = "var(--color-link)";
            }
            setLiveUserStyles({ borderColor, gradient });
        }
    }, [patreons, isLoading, liveRun.user]);

    let tournamentPb = null;
    let tournamentPbGameTime = null;
    let ranking = null;

    if (leaderboard) {
        const pbLeaderboardIndex = leaderboard.findIndex(
            (count) => count.username == liveRun.user
        );

        if (pbLeaderboardIndex > -1) {
            ranking = pbLeaderboardIndex + 1;
            tournamentPb = leaderboard[pbLeaderboardIndex].stat;
        }
    }

    if (leaderboardGameTime) {
        const pbLeaderboardIndex = leaderboardGameTime.findIndex(
            (count) => count.username == liveRun.user
        );

        if (pbLeaderboardIndex > -1) {
            ranking = pbLeaderboardIndex + 1;
            tournamentPbGameTime = leaderboardGameTime[pbLeaderboardIndex].stat;
        }
    }

    return (
        <div
            className={
                styles.liveRunContainer +
                (liveRun.user == currentlyActive
                    ? ` ${styles.activeRunContainer}`
                    : "")
            }
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
                                  : "1px",
                      }
            }
        >
            <div>
                {liveRun.gameImage &&
                    liveRun.gameImage.length > 0 &&
                    liveRun.gameImage != "noimage" && (
                        <div>
                            <Image
                                alt={liveRun.game}
                                src={GetGameImageSrc({
                                    imageSrc: liveRun.gameImage,
                                })}
                                loading={"lazy"}
                                className={styles.gameImage}
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
                    <div style={{ marginTop: "17.5px" }}>
                        <Image
                            alt={"Logo"}
                            src={
                                dark
                                    ? "/logo_dark_theme_no_text_transparent.png"
                                    : "/logo_light_theme_no_text_transparent.png"
                            }
                            width={"75px"}
                            height={"75px"}
                        />
                    </div>
                )}
            </div>
            <div className={styles.infoBody}>
                <div className={styles.maxHeight}>
                    <Row className={styles.maxHeight}>
                        <Col xs={7} style={{ paddingRight: "0" }}>
                            <div className={styles.metadataBody}>
                                <div style={{ width: "calc(100%)" }}>
                                    <div className={styles.username}>
                                        <div>
                                            {ranking && (
                                                <div>
                                                    &nbsp;#{ranking}
                                                    &nbsp;-&nbsp;
                                                </div>
                                            )}
                                        </div>
                                        <div
                                            style={{
                                                whiteSpace: "nowrap",
                                                overflow: "hidden",
                                            }}
                                        >
                                            <UserLink
                                                username={liveRun.user}
                                                parentIsUrl={isUrl}
                                            />
                                        </div>
                                        {liveRun.currentlyStreaming && (
                                            <div
                                                style={{
                                                    marginLeft: "0.6rem",
                                                    alignItems: "flex-start",
                                                }}
                                            >
                                                <TwitchIcon height={22} />
                                            </div>
                                        )}
                                    </div>
                                    {showGameCategory && (
                                        <div className={styles.game}>
                                            {liveRun.game}
                                        </div>
                                    )}
                                    {showGameCategory && (
                                        <div className={styles.category}>
                                            {liveRun.category}
                                        </div>
                                    )}

                                    {!showGameCategory &&
                                        tournamentPbGameTime && (
                                            <div className={styles.game}>
                                                Tournament PB -{" "}
                                                {!!tournamentPbGameTime && (
                                                    <DurationToFormatted
                                                        duration={
                                                            tournamentPbGameTime
                                                        }
                                                    />
                                                )}
                                            </div>
                                        )}

                                    {!showGameCategory &&
                                        tournamentPb &&
                                        !tournamentPbGameTime && (
                                            <div className={styles.game}>
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
                                            <div className={styles.game}>
                                                Personal Best -{" "}
                                                {
                                                    <DurationToFormatted
                                                        duration={liveRun.pb}
                                                    />
                                                }
                                            </div>
                                        )}
                                </div>
                            </div>
                        </Col>
                        <Col xs={5} style={{ paddingLeft: "0" }}>
                            <LiveSplitTimerComponent
                                liveRun={liveRun}
                                dark={dark}
                            />
                        </Col>
                    </Row>
                </div>
            </div>
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

export const Flag = ({ height = 16, dark = false }) => {
    return (
        <Image
            alt={"Flag"}
            src={
                !dark
                    ? "/Flag finish greenTR-darktransparant.png"
                    : "/Flag finish greenTR-lighttransparant(1).png"
            }
            height={height}
            style={{ marginTop: "0.5rem" }}
        />
    );
};
