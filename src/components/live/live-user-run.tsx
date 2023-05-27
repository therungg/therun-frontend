import { Col, Image, Row } from "react-bootstrap";
import styles from "../css/LiveRun.module.scss";
import { useEffect, useState } from "react";
import { UserLink } from "../links/links";
import { TwitchIcon } from "../user/userform";
import { LivesplitTimer } from "../../pages/live";
import { Run } from "../../common/types";
import { MarathonEvent } from "../marathon/send-marathon-data-button";
import { usePatreons } from "../patreon/use-patreons";
import patreonStyles from "../patreon/patreon-styles";
import { DurationToFormatted } from "../util/datetime";

export interface LiveRun {
    user: string;
    currentSplitIndex: number;
    currentSplitName: string;
    currentTime: number;
    currentComparison?: string;
    game: string;
    category: string;
    startedAt?: string;
    endedAt?: string;
    insertedAt: number;
    emulator: boolean;
    gameTime: boolean;
    hasReset: boolean;
    region: string;
    platform: string;
    variables: Variables;
    splits: Split[];
    importance: number;
    pb: number;
    bestPossible: number;
    sob: number;
    delta: number;
    picture?: string;
    gameImage?: string;
    currentlyStreaming?: boolean;
    url: string;
    gameData?: Run;
    currentPrediction?: string;
    events: MarathonEvent[];
}

interface Variables {
    [key: string]: string;
}

interface Comparisons {
    [key: string]: number;
}

interface SplitDefault {
    attemptsFinished: number;
    attemptsStarted: number;
    average: number;
    consistency: number;
    deltaToPredicted?: number | null;
    predictedSingleTime: number | null;
    predictedTotalTime: number | null;
    recentCompletionsSingle: number[];
    recentCompletionsTotal: number[];
    single: any;
    total: any;
    name: string;
    pbSplitTime?: number;
    bestPossible?: number;
    splitTime?: number;
    comparisons: Comparisons;
}

type Split = Comparisons & SplitDefault;

export const LiveUserRun = ({
    liveRun,
    currentlyActive,
    showGameCategory = true,
    leaderboard = null,
    leaderboardGameTime = null,
}: {
    liveRun: LiveRun;
    currentlyActive?: string;
    showGameCategory?: boolean;
    leaderboard?: any;
    leaderboardGameTime?: any;
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
                                alt={"Game Image"}
                                src={liveRun.gameImage}
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
                                            <UserLink username={liveRun.user} />
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
                            <LivesplitTimer liveRun={liveRun} dark={dark} />
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
