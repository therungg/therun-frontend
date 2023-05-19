import { LiveRun } from "./live-user-run";
import { Col, Row } from "react-bootstrap";
import styles from "../../components/css/LiveRun.module.scss";
import { useEffect, useRef, useState } from "react";
import { TwitchEmbed } from "../../vendor/react-twitch-embed/dist/index";
import { LiverunStatsPanel } from "./liverun-stats-panel";
import { SplitsViewer } from "./splits-viewer";
import patreonStyles from "../patreon/patreon-styles";
import { usePatreons } from "../patreon/use-patreons";

export const RecommendedStream = ({
    liveRun,
    stream = null,
}: {
    liveRun: LiveRun;
    stream?: string | null;
}) => {
    const [dark, setDark] = useState(true);
    const [activeLiveRun, setActiveLiveRun] = useState(liveRun);
    const [selectedSplit, setSelectedSplit] = useState(
        liveRun.currentSplitIndex
    );
    const [recommendedStyles, setRecommendedStyles] = useState({});
    const [manuallyChangedSplit, setManuallyChangedSplit] = useState(false);

    // Not sure how else to do this, but this works
    const pixelsForSplit = 27.9;

    const usePrevious = <T extends unknown>(value: T): T | undefined => {
        const ref = useRef<T>();
        useEffect(() => {
            ref.current = value;
        });
        return ref.current;
    };

    const previous = usePrevious({ activeLiveRun });

    useEffect(function () {
        setDark(document.body.dataset.theme !== "light");
    }, []);

    useEffect(() => {
        const scrollDistance = activeLiveRun.currentSplitIndex * pixelsForSplit;
        const scrollBox = document.getElementById("scrollBox");

        if (scrollBox) {
            if (
                activeLiveRun.currentSplitIndex !=
                previous?.activeLiveRun.currentSplitIndex
            ) {
                scrollBox.scrollTop = scrollDistance - 4 * pixelsForSplit;
            }

            if (
                !manuallyChangedSplit ||
                (previous && previous.activeLiveRun.user != activeLiveRun.user)
            ) {
                setSelectedSplit(activeLiveRun.currentSplitIndex);
            }
        }
    }, [activeLiveRun]);

    useEffect(() => {
        setActiveLiveRun(liveRun);
    }, [liveRun]);

    const { data: patreons, isLoading } = usePatreons();

    useEffect(() => {
        if (!isLoading && patreons && patreons[liveRun.user]) {
            const { preferences } = patreons[liveRun.user];
            let borderColor = "";
            let gradient = "";

            if (preferences && !preferences.hide) {
                const colors = patreonStyles();
                const { colorPreference = 0 } = preferences;
                let style =
                    colors.find((val) => val.id == colorPreference) ||
                    colors[0];
                style = dark ? style.style[0] : style.style[1];

                if (style.color != "transparent") {
                    borderColor = style.color;
                } else {
                    gradient = style.background;
                }
            } else if (!preferences) {
                borderColor = "var(--color-link)";
            }
            setRecommendedStyles({
                borderColor,
                gradient,
            });
        }
    }, [patreons, isLoading, liveRun.user]);

    if (!activeLiveRun || !activeLiveRun.splits || !liveRun || isLoading) {
        return <></>;
    }

    const currentSplitSplitStatus = getSplitStatus(
        liveRun,
        liveRun.currentSplitIndex
    );

    return (
        <div className={styles.recommendedRunContainer}>
            <Row className={styles.recommendedRunRow}>
                <Col xl={3} lg={5} md={12} className={styles.splitsContainer}>
                    <SplitsViewer
                        activeLiveRun={activeLiveRun}
                        currentSplitSplitStatus={currentSplitSplitStatus}
                        dark={dark}
                        setSelectedSplit={(e) => {
                            setSelectedSplit(e);

                            setManuallyChangedSplit(
                                e !== activeLiveRun.currentSplitIndex
                            );
                        }}
                    />
                </Col>
                <Col xl={5} lg={7} md={12} className={styles.twitchStream}>
                    <TwitchEmbed
                        channel={stream ? stream : activeLiveRun.user}
                        width={"100%"}
                        height={"100%"}
                        muted
                        withChat={false}
                    />
                </Col>
                <Col
                    xl={4}
                    className={styles.splitsStatsContainer}
                    style={
                        recommendedStyles.gradient
                            ? {
                                  borderImageSource: recommendedStyles.gradient,
                                  borderImageSlice: 1,
                                  borderWidth: "2px",
                              }
                            : {
                                  borderColor: recommendedStyles.borderColor,
                                  borderWidth:
                                      recommendedStyles.gradient ||
                                      recommendedStyles.borderColor
                                          ? "2px"
                                          : "1px",
                              }
                    }
                >
                    <div style={{ width: "100%" }}>
                        <LiverunStatsPanel
                            liveRun={liveRun}
                            selectedSplit={selectedSplit}
                        />
                    </div>
                </Col>
            </Row>
        </div>
    );
};

type Status = "future" | "current" | "skipped" | "completed";

export const getSplitStatus = (liveRun: LiveRun, k: number) => {
    if (k < 0 || !liveRun.splits || !liveRun.splits[k]) return null;

    const split = liveRun.splits[k];
    const time = split.splitTime;

    let singleTime = null;
    if (k == 0) {
        singleTime = time;
    } else if (liveRun.splits[k - 1].splitTime) {
        singleTime = time - liveRun.splits[k - 1].splitTime;
    }

    const status: Status =
        liveRun.currentSplitIndex < k
            ? "future"
            : liveRun.currentSplitIndex == k
            ? "current"
            : time
            ? "completed"
            : "skipped";
    const name = split.name.toString();
    const isSubSplit = name ? name.startsWith("-") : false;
    const isActive = status == "current";

    const newComparisons = {};

    Object.entries(split.comparisons).forEach(([splitName, value]) => {
        let splitSingleTime = null;

        if (k == 0) {
            splitSingleTime = value;
        } else if (liveRun.splits[k - 1].comparisons[splitName]) {
            splitSingleTime =
                value - liveRun.splits[k - 1].comparisons[splitName];
        }

        const totalTime = value;

        newComparisons[splitName] = {
            splitName,
            splitSingleTime,
            totalTime,
        };
    });

    const isGold =
        status == "completed" &&
        newComparisons["Best Segments"] &&
        (k == 0 || liveRun.splits[k - 1].splitTime) &&
        newComparisons["Best Segments"].singleTime &&
        singleTime < newComparisons["Best Segments"].singleTime;

    let possibleTimeSave = null;

    if (
        newComparisons["Personal Best"] &&
        newComparisons["Personal Best"].singleTime &&
        newComparisons["Best Segments"] &&
        newComparisons["Best Segments"].singleTime
    ) {
        possibleTimeSave =
            newComparisons["Personal Best"].singleTime -
            newComparisons["Best Segments"].singleTime;
    }

    return {
        time,
        singleTime,
        status,
        name,
        isSubSplit,
        isActive,
        isGold,
        possibleTimeSave,
        comparisons: newComparisons,
    };
};
