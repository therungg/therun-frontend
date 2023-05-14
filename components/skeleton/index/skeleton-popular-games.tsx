import React from "react";
import ContentLoader from "react-content-loader";

export const SkeletonPopularGames = (props) => (
    <ContentLoader
        width={100}
        height={100}
        viewBox="0 0 100% 657"
        style={{ width: "100%", height: "657" }}
        speed={1.5}
        backgroundColor="#e0e0e0"
        foregroundColor="#eee"
        {...props}
    >
        <rect x="0" y="0" width="1" height="641" />
        <rect x="calc(100% - 1px)" y="0" width="1" height="641" />
        <rect x="0" y="0" width="100%" height="1" />
        <rect x="0" y="calc(100% - 18px)" width="100%" height="1" />
        <rect x="0" y="0" rx="0" ry="0" width="48" height="63" />
        <rect x="0" y="64" rx="0" ry="0" width="48" height="63" />
        <rect x="0" y="128" rx="0" ry="0" width="48" height="63" />
        <rect x="0" y="192" rx="0" ry="0" width="48" height="63" />
        <rect x="0" y="256" rx="0" ry="0" width="48" height="63" />
        <rect x="0" y="320" rx="0" ry="0" width="48" height="63" />
        <rect x="0" y="384" rx="0" ry="0" width="48" height="63" />
        <rect x="0" y="448" rx="0" ry="0" width="48" height="63" />
        <rect x="0" y="512" rx="0" ry="0" width="48" height="63" />
        <rect x="0" y="576" rx="0" ry="0" width="48" height="63" />
        <rect x="49" y="0" rx="0" ry="0" width="100%" height="63" />
        <rect x="49" y="128" rx="0" ry="0" width="100%" height="63" />
        <rect x="49" y="256" rx="0" ry="0" width="100%" height="63" />
        <rect x="49" y="384" rx="0" ry="0" width="100%" height="63" />
        <rect x="49" y="512" rx="0" ry="0" width="100%" height="63" />
    </ContentLoader>
);
