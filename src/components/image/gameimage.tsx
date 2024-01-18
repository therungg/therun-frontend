import React from "react";
import Image from "next/image";

declare const VALID_LOADING_VALUES: readonly ["lazy", "eager", undefined];
declare type LoadingValue = (typeof VALID_LOADING_VALUES)[number];
declare type PlaceholderValue = "blur" | "empty";
declare type SafeNumber = number | `${number}`;

type Quality = "small" | "medium" | "large" | "sd" | "hd";

type IgdbQualityString =
    | "cover_small"
    | "logo_med"
    | "cover_big"
    | "720p"
    | "1080p";

const qualityMap: Record<Quality, IgdbQualityString> = {
    small: "cover_small",
    medium: "logo_med",
    large: "cover_big",
    sd: "720p",
    hd: "1080p",
};

interface GameImageProps {
    className?: string;
    src: string;
    alt?: string;
    width?: SafeNumber;
    height?: SafeNumber;
    quality?: Quality;
    loading?: LoadingValue;
    placeholder?: PlaceholderValue;
    style?: React.CSSProperties;
    fill?: boolean;
}

export const GameImage = (Props: GameImageProps) => {
    const {
        className = "img-fluid",
        src,
        alt = "Game Image",
        quality = "medium",
        fill = false,
        width,
        height,
        style,
    } = Props;

    const file = src.slice(src.lastIndexOf("/"));

    return (
        <Image
            className={className}
            src={`https://images.igdb.com/igdb/image/upload/t_${qualityMap[quality]}${file}`}
            alt={alt}
            loading={"lazy"}
            width={width}
            height={height}
            style={style}
            fill={fill}
        />
    );
};
