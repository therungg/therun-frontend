"use client";

import { useStory } from "~app/live/stories/use-story";
import React from "react";
import { LiveRun, Split } from "~app/live/live.types";
import { Col, Row } from "react-bootstrap";
import { SplitStory } from "~app/live/story.types";
import { Difference, DurationToFormatted } from "~src/components/util/datetime";
import { Twitch as TwitchIcon } from "react-bootstrap-icons";

export const RunStoryView = ({ liveRun }: { liveRun: LiveRun }) => {
    const { story, isLoaded } = useStory(liveRun.user);

    if (!isLoaded) return <>Loading story...</>;

    if (!story)
        return (
            <>
                No story currently available. Stories only get generated when
                you have finished at least 3 runs, and started at least 20.
                Otherwise there is not enough data to generate stories from.{" "}
            </>
        );

    const reversedStories = [...story.stories].reverse();

    // This is a concept to show that it works and monitor the stories
    return (
        <Row>
            <Col className="mb m-0">
                <Row
                    className="bg-body-secondary ps-3 h-100 m-0"
                    style={{ minHeight: "15rem", maxHeight: "15rem" }}
                >
                    <Col xl={4} className="border-end border-tertiary p-0">
                        <div className="mt-2 me-2">
                            <h3>The Run Story Mode</h3>
                            <p>
                                Story Mode is a new feature that is currently in
                                Beta. For all your runs, it creates a
                                &quot;story&quot;. A series of flair texts to
                                accompany your run after every split.
                            </p>
                            <p>
                                The stories come with a Twitch Bot that sends
                                the stories directly to your chat for them to
                                interact with.
                            </p>
                            <p>
                                You can enable and customize these stories in
                                your{" "}
                                <a href="/stories/manage">Stories Dashboard</a>
                            </p>
                        </div>
                    </Col>
                    <Col
                        xl={8}
                        className="h-100 py-1"
                        style={{ minHeight: "15rem", maxHeight: "15rem" }}
                    >
                        <div className="h-100 overflow-auto">
                            {reversedStories.map((storyElement) => {
                                return (
                                    <RenderSplitsStory
                                        key={
                                            "story-render-" +
                                            storyElement["startedAt#index"]
                                        }
                                        storyElement={storyElement}
                                        split={
                                            liveRun.splits[
                                                storyElement.splitIndex
                                            ]
                                        }
                                    />
                                );
                            })}
                        </div>
                    </Col>
                </Row>
            </Col>
        </Row>
    );
};

const RenderSplitsStory = ({
    storyElement,
    split,
}: {
    storyElement: SplitStory;
    split?: Split;
}) => {
    const showStories = storyElement.storyElements.filter((el) => el.selected);

    return (
        <div key={"story-" + storyElement.splitIndex}>
            <Row className="overflow-x-hidden">
                <Col xl={4}>
                    <div className="w-100 d-flex">
                        <span className="fs-large fw-bold ">
                            {" "}
                            {storyElement.splitName}
                        </span>
                        {split && split.splitTime && (
                            <div className="d-flex ms-2">
                                <span>
                                    <DurationToFormatted
                                        duration={split.splitTime}
                                    />
                                </span>
                                <span className="ms-2">
                                    <Difference
                                        one={split.splitTime.toString()}
                                        two={
                                            split.pbSplitTime?.toString() || ""
                                        }
                                    />
                                </span>
                            </div>
                        )}
                    </div>
                </Col>
                <Col xl={8}>
                    {showStories.map((showStory) => {
                        return (
                            <div
                                className="overflow-x-hidden"
                                key={showStory.id + storyElement.splitIndex}
                            >
                                {showStory.text}{" "}
                                {showStory.wasSentToTwitch && (
                                    <span className="ms-1">
                                        <TwitchIcon
                                            height={22}
                                            color="#6441a5"
                                        />
                                    </span>
                                )}
                            </div>
                        );
                    })}
                </Col>
            </Row>
            <hr />
        </div>
    );
};
