"use client";
import React from "react";
import ContentLoader from "react-content-loader";
import { PropsFrom } from "../../../../types/utility.types";
import styles from "./skeleton.module.scss";

export const SkeletonLiveRun = (props: PropsFrom<typeof ContentLoader>) => {
    const itemHeight = "100%";

    return (
        <ContentLoader
            uniqueKey="skeleton-games-list"
            id="skeleton-games-list"
            className={styles.liveRun}
            speed={2}
            title="Loading live run"
            backgroundColor="var(--bs-secondary-bg)"
            foregroundColor="var(--bs-body-bg)"
            {...props}
        >
            <rect x="0" y="0" width="25%" height={itemHeight} />
            <rect x="26%" y="0" width="40%" height={itemHeight} />
            <rect x="67%" y="0" width="33%" height={itemHeight} />
        </ContentLoader>
    );
};
