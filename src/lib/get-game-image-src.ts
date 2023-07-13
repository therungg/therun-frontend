interface GameImageSrcProps {
    imageSrc: string;
    qualityString?: string;
}

export function GetGameImageSrc(Props: GameImageSrcProps): string {
    const { imageSrc, qualityString = "t_logo_med" } = Props;
    return `https://images.igdb.com/igdb/image/upload/${qualityString}${imageSrc.slice(
        imageSrc.lastIndexOf("/")
    )}`.toString();
}
