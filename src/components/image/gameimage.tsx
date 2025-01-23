import React, { useMemo } from "react";
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
    sizes?: string;
    autosize?: boolean;
}

export const GameImage = (props: GameImageProps) => {
    const {
        src,
        alt = "Game Image",
        quality = "medium",
        fill = false,
        width,
        height,
        style,
        sizes,
        autosize,
    } = props;

    const className = `img-fluid ${props.className || ""}`;
    const autosizeProps = useMemo(
        () =>
            autosize
                ? {
                      sizes: "100vw",
                      width: 0,
                      height: 0,
                      style: {
                          ...style,
                          width: "100%",
                          height: "auto",
                      },
                  }
                : {},
        [autosize, style],
    );

    if (!src || src === "noimage")
        return (
            <Image
                unoptimized
                width={width}
                height={height}
                loading="lazy"
                className={className}
                src="/logo_dark_theme_no_text_transparent.png"
                alt="The Run logo. Game image missing placeholder."
                {...autosizeProps}
            ></Image>
        );

    const file = src.slice(src.lastIndexOf("/"));

    return (
        <Image
            unoptimized
            className={className}
            src={`https://images.igdb.com/igdb/image/upload/t_${qualityMap[quality]}${file}`}
            alt={alt}
            loading="lazy"
            width={width}
            height={height}
            style={style}
            fill={fill}
            sizes={sizes}
            {...autosizeProps}
        />
    );
};
