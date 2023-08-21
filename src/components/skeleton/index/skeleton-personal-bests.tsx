"use client";
import React from "react";
import ContentLoader from "react-content-loader";
import { PropsFrom } from "../../../../types/utility.types";
import styles from "./skeleton.module.scss";

export const SkeletonPersonalBests = (
    props: PropsFrom<typeof ContentLoader>
) => (
    <ContentLoader
        uniqueKey="skeleton-personal-bests"
        id="skeleton-personal-bests"
        className={styles.personalBests}
        height={100}
        speed={2}
        title="Loading personal bests"
        backgroundColor="var(--bs-secondary-bg)"
        foregroundColor="var(--bs-body-bg)"
        {...props}
    >
        <rect x="0" y="0" rx="0" ry="0" width="100%" height="63" />
        <rect x="0" y="128" rx="0" ry="0" width="100%" height="63" />
        <rect x="0" y="256" rx="0" ry="0" width="100%" height="63" />
        <rect x="0" y="384" rx="0" ry="0" width="100%" height="63" />
        <rect x="0" y="512" rx="0" ry="0" width="100%" height="63" />
    </ContentLoader>
);
