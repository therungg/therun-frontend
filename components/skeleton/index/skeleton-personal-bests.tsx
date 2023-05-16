import React from "react";
import ContentLoader from "react-content-loader";

export const SkeletonPersonalBests = (props) => (
    <ContentLoader
        width={100}
        height={100}
        style={{ width: "100%", height: "657" }}
        speed={2}
        backgroundColor="var(--color-secondary)"
        foregroundColor="var(--color-bg)"
        {...props}
    >
        <rect x="0" y="0" width="1" height="641" />
        <rect x="calc(100% - 1px)" y="0" width="1" height="641" />
        <rect x="0" y="0" width="100%" height="1" />
        <rect x="0" y="calc(100% - 18px)" width="100%" height="1" />
        <rect x="0" y="0" rx="0" ry="0" width="100%" height="63" />
        <rect x="0" y="128" rx="0" ry="0" width="100%" height="63" />
        <rect x="0" y="256" rx="0" ry="0" width="100%" height="63" />
        <rect x="0" y="384" rx="0" ry="0" width="100%" height="63" />
        <rect x="0" y="512" rx="0" ry="0" width="100%" height="63" />
    </ContentLoader>
);
