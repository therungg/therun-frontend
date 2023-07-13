import Image from "next/image";

declare const VALID_LOADING_VALUES: readonly ["lazy", "eager", undefined];
declare type LoadingValue = (typeof VALID_LOADING_VALUES)[number];
declare type PlaceholderValue = "blur" | "empty";
declare type SafeNumber = number | `${number}`;

export const QUALITIES = {
    small: "cover_small",
    medium: "logo_med",
    large: "cover_big",
    sd: "720p",
    hd: "1080p",
} as const;

type Quality = (typeof QUALITIES)[keyof typeof QUALITIES];
interface GameImageProps {
    src: string;
    alt: string;
    width?: SafeNumber;
    height?: SafeNumber;
    quality?: Quality;
    loading?: LoadingValue;
    placeholder?: PlaceholderValue;
}

export const GameImage = (Props: GameImageProps) => {
    const {
        src,
        alt = "Game Image",
        quality = "logo_med",
        width,
        height,
    } = Props;

    const file = src.slice(src.lastIndexOf("/"));

    return (
        <Image
            src={`https://images.igdb.com/igdb/image/upload/t_${quality}${file}`}
            alt={alt}
            loading={"lazy"}
            width={width}
            height={height}
        />
    );
};
