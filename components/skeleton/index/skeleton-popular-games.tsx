import React from "react";
import ContentLoader from "react-content-loader";

export const SkeletonPopularGames = (props) => (
    <ContentLoader
        width={100}
        height={100}
        style={{ width: "100%", height: "657px" }}
        speed={2}
        backgroundColor="var(--color-secondary)"
        foregroundColor="var(--color-bg)"
        {...props}
    >
        <rect x="100%" y="0" width="1" height="641" />
        <rect x="0" y="64" rx="0" ry="0" width="48" height="63" />
        <rect x="0" y="192" rx="0" ry="0" width="48" height="63" />
        <rect x="0" y="320" rx="0" ry="0" width="48" height="63" />
        <rect x="0" y="448" rx="0" ry="0" width="48" height="63" />
        <rect x="0" y="576" rx="0" ry="0" width="48" height="63" />
        <rect x="49" y="0" rx="0" ry="0" width="100%" height="63" />
        <rect x="49" y="128" rx="0" ry="0" width="100%" height="63" />
        <rect x="49" y="256" rx="0" ry="0" width="100%" height="63" />
        <rect x="49" y="384" rx="0" ry="0" width="100%" height="63" />
        <rect x="49" y="512" rx="0" ry="0" width="100%" height="63" />
    </ContentLoader>
);
