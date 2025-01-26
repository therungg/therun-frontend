"use client";
import React from "react";
import ContentLoader from "react-content-loader";
// TODO: Remove all of the PropsFrom uses for the native React.ComponentProps
import { PropsFrom } from "../../../../types/utility.types";
import styles from "./skeleton.module.scss";

export const SkeletonGamesList = (props: PropsFrom<typeof ContentLoader>) => {
    const totalHeight = 157;
    const itemHeight = 142;
    const width = "48%";
    const widthRight = "52%";

    return (
        <ContentLoader
            uniqueKey="skeleton-games-list"
            id="skeleton-games-list"
            className={styles.personalBests}
            speed={2}
            title="Loading games list"
            backgroundColor="var(--bs-secondary-bg)"
            foregroundColor="var(--bs-body-bg)"
            {...props}
        >
            <rect x="0" y={totalHeight * 0} width={width} height={itemHeight} />
            <rect x="0" y={totalHeight * 1} width={width} height={itemHeight} />
            <rect x="0" y={totalHeight * 2} width={width} height={itemHeight} />
            <rect x="0" y={totalHeight * 3} width={width} height={itemHeight} />
            <rect x="0" y={totalHeight * 4} width={width} height={itemHeight} />
            <rect
                x={widthRight}
                y={totalHeight * 0}
                width={width}
                height={itemHeight}
            />
            <rect
                x={widthRight}
                y={totalHeight * 1}
                width={width}
                height={itemHeight}
            />
            <rect
                x={widthRight}
                y={totalHeight * 2}
                width={width}
                height={itemHeight}
            />
            <rect
                x={widthRight}
                y={totalHeight * 3}
                width={width}
                height={itemHeight}
            />
            <rect
                x={widthRight}
                y={totalHeight * 4}
                width={width}
                height={itemHeight}
            />
        </ContentLoader>
    );
};
