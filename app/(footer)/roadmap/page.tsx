"use client";

import moment from "moment";
import React from "react";
import { useEffect, useRef, useState } from "react";

const onePxSolidGrey = "1px solid #333";

const styles = {
    container: {
        backgroundColor: "#000000",
        color: "white",
        maxWidth: "400px",
        border: onePxSolidGrey,
    },
    header: {
        backgroundColor: "#222",
        borderBottom: onePxSolidGrey,
        padding: "8px 12px",
        fontSize: "0.9rem",
    },
    gameIcon: {
        width: "28px",
        height: "28px",
        objectFit: "cover",
        borderRadius: "2px",
        paddingRight: "6px",
    },
    splitRow: {
        borderBottom: onePxSolidGrey,
        padding: "4px 12px",
        fontSize: "0.9rem",
        transition: "background-color 0.2s",
    },
    splitRowActive: {
        backgroundColor: "#1a3561",
        borderBottom: onePxSolidGrey,
        padding: "4px 12px",
        fontSize: "0.9rem",
    },
    splitTime: {
        color: "#fff",
        fontWeight: "bold",
    },
    currentTime: {
        backgroundColor: "#111",
        padding: "15px 25px",
        fontSize: "2.5rem",
        fontWeight: "bold",
        color: "#00ff00",
        fontFamily: '"Consolas", "Liberation Mono", Menlo, Courier, monospace',
        letterSpacing: "0.05em",
        textAlign: "right",
    },
    previousSegment: {
        backgroundColor: "#222",
        borderTop: onePxSolidGrey,
        padding: "8px 12px",
        fontSize: "0.9rem",
    },
    delta: {
        color: "#00ff00",
        fontFamily: '"Consolas", "Liberation Mono", Menlo, Courier, monospace',
    },
    completedSplit: {
        color: "#888",
    },
    upcomingSplit: {
        color: "#fff",
    },
};

const SplitRow = React.forwardRef(({ name, time, isActive }, ref) => (
    <div
        ref={ref}
        className="d-flex justify-content-between align-items-center"
        style={isActive ? styles.splitRowActive : styles.splitRow}
        onMouseEnter={(e) =>
            !isActive && (e.currentTarget.style.backgroundColor = "#222")
        }
        onMouseLeave={(e) =>
            !isActive && (e.currentTarget.style.backgroundColor = "transparent")
        }
    >
        <div className="d-flex align-items-center">
            <span style={styles.upcomingSplit}>{name}</span>
        </div>
        <span style={styles.splitTime}>{time}</span>
    </div>
));

SplitRow.displayName = "SplitRow";

// TODO: Link to the Github Issues or other project planning in the future
export default function Roadmap() {
    const august = "August 2022"; // fuck you eslint

    const splits = [
        { name: "The Run Goes Live", time: "June 2022" },
        { name: "Game Art!", time: "July 2022" },
        { name: "Twitch Extension", time: august },
        { name: "VIEW GLODS!", time: august },
        { name: "Timesave Analysis", time: august },
        { name: "The Run Live", time: "October 2022" },
        { name: "Patreon Launch", time: "December 2022" },
        { name: "Record History Graphs", time: "January 2023" },
        { name: "Activity Tab", time: "March 2023" },
        { name: "Open Source", time: "May 2023" },
        { name: "The Run Races Beta", time: "January 2024" },
        { name: "The Run Races", time: "March 2024" },
        { name: "The Run Enters LiveSplit", time: "March 2024" },
        { name: "Story Mode", time: "November 2024" },
        { name: "The Run Recap", time: "January 2025" },
        { name: "The Run Events", time: "Coming Q1 2025", currentSplit: true },
        { name: "Speedbun: The In Scope Video Game!", time: "Coming Never" },
        { name: "THERUN Treadmill Integration", time: "LOL" },
    ];

    const [startTime] = useState(moment.utc("2022-07-17T16:57:35Z"));
    const [currentTime, setCurrentTime] = useState(moment.utc());
    const activeSplitRef = useRef(null);
    const containerRef = useRef(null);

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(moment.utc());
        }, 10); // Update every 10ms for smooth millisecond display

        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        // Scroll to active split with a small delay to ensure rendering is complete
        const timeoutId = setTimeout(() => {
            if (activeSplitRef.current && containerRef.current) {
                const container = containerRef.current;
                const activeElement = activeSplitRef.current;

                // Calculate the scroll position to center the active split
                const containerHeight = container.clientHeight;
                const activeElementOffset = activeElement.offsetTop;
                const activeElementHeight = activeElement.clientHeight;

                // Center the active split in the container
                const scrollPosition =
                    activeElementOffset -
                    containerHeight / 2 +
                    activeElementHeight / 2;

                // Set the scroll position
                container.scrollTop = scrollPosition;
            }
        }, 100);

        return () => clearTimeout(timeoutId);
    }, []);

    const formatElapsedTime = () => {
        const duration = moment.duration(currentTime.diff(startTime));

        const hours = Math.floor(duration.asHours()).toString();
        const minutes = duration.minutes().toString().padStart(2, "0");
        const seconds = duration.seconds().toString().padStart(2, "0");
        const milliseconds = Math.floor(duration.milliseconds() / 10)
            .toString()
            .padStart(2, "0");

        return `${hours}:${minutes}:${seconds}.${milliseconds}`;
    };

    return (
        <div className="container mt-4">
            <div className="text-center">
                <h1>Roadmap</h1>
                <p>
                    We're hard at work building new features. Here's our roadmap
                    and the site's history...put more imaginative and
                    descriptive text here.
                </p>
            </div>

            <div className="mx-auto" style={styles.container}>
                {/* Game Header */}
                <div style={styles.header}>
                    <img
                        src="/logo_dark_theme_no_text_transparent.png"
                        alt="The Run Logo"
                        style={styles.gameIcon}
                    />
                    TheRun.gg Any% (No Sleep)
                </div>

                {/* Splits List */}
                <div
                    ref={containerRef}
                    style={{ maxHeight: "400px", overflowY: "auto" }}
                >
                    {splits.map((split, i) => (
                        <SplitRow
                            key={i}
                            ref={split.currentSplit ? activeSplitRef : null}
                            name={split.name}
                            time={split.time}
                            icon={split.icon}
                            isActive={split.currentSplit}
                        />
                    ))}
                </div>

                {/* Current Time */}
                <div style={styles.currentTime}>{formatElapsedTime()}</div>

                {/* Previous Segment */}
                <div
                    className="d-flex justify-content-between"
                    style={styles.previousSegment}
                >
                    <span>Previous Segment</span>
                    <span style={styles.delta}>-4.7</span>
                </div>
            </div>
        </div>
    );
}
