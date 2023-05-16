import React from "react";
import ContentLoader from "react-content-loader";

export const SkeletonPersonalBests = (props) => (
    <ContentLoader
        width={100}
        height={100}
        style={{ width: "100%", height: "657px" }}
        speed={2}
        backgroundColor="var(--color-secondary)"
        foregroundColor="var(--color-bg)"
        {...props}
    >
        <rect x="0" y="0" rx="0" ry="0" width="100%" height="63" />
        <rect x="0" y="128" rx="0" ry="0" width="100%" height="63" />
        <rect x="0" y="256" rx="0" ry="0" width="100%" height="63" />
        <rect x="0" y="384" rx="0" ry="0" width="100%" height="63" />
        <rect x="0" y="512" rx="0" ry="0" width="100%" height="63" />
    </ContentLoader>
);
