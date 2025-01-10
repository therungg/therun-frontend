import {
    ReactElement,
    RefObject,
    memo,
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import { WrappedWithData } from "~app/[username]/wrapped/wrapped-types";
import html2canvas from "html2canvas";
import { getUserProfilePhoto } from "~src/utils/metadata";
import { SectionWrapper } from "./section-wrapper";
import { SectionTitle } from "./section-title";
import { SectionBody } from "./section-body";
import { Button } from "react-bootstrap";
import { safeDecodeURI } from "~src/utils/uri";
import { usePatreons } from "~src/components/patreon/use-patreons";
import {
    PatreonBunnySvgMarioPipe,
    PatreonBunnySvgWithoutLink,
} from "~app/patron/patreon-info";

interface HiddenDataSummaryProps {
    gameImageUrl: string | undefined;
    // eslint-disable-next-line
    bangers: any;
    wrapped: WrappedWithData;
    cardRef: RefObject<HTMLDivElement>;
    profilePhoto: string | undefined;
    isPatron: boolean;
    top3Games: {
        total: number;
        image?: string | undefined;
        display?: string | undefined;
    }[];
}
const HiddenDataSummary = memo<HiddenDataSummaryProps>(
    ({
        gameImageUrl,
        wrapped,
        cardRef,
        isPatron,
        profilePhoto,
        top3Games,
        bangers,
    }) => {
        return (
            <div
                style={{
                    position: "fixed",
                    left: "-9999px",
                    top: "-9999px",
                    width: "1080px",
                    height: "1920px",
                    overflow: "hidden",
                    opacity: 0,
                    pointerEvents: "none",
                }}
            >
                <div
                    ref={cardRef}
                    style={{
                        width: "1080px",
                        height: "1920px",
                        display: "flex",
                        flexDirection: "column",
                        backgroundColor: "#000",
                        paddingLeft: "25px",
                        paddingRight: "25px",
                        paddingTop: "10px",
                        paddingBottom: "10px",
                        position: "relative",
                    }}
                >
                    {/* eslint-disable-next-line */}
                    <img
                        src={gameImageUrl}
                        style={{
                            position: "absolute",
                            top: 0,
                            left: 0,
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                            opacity: 0.15,
                            zIndex: 1,
                        }}
                        crossOrigin="anonymous"
                        alt=""
                    />
                    <div
                        style={{
                            display: "flex",
                            flexDirection: "column",
                            height: "100%",
                            position: "relative",
                            zIndex: 2,
                        }}
                    >
                        <div
                            style={{
                                height: "150px",
                                width: "100%",
                                display: "flex",
                                flexDirection: "row",
                                fontSize: "48px",
                                alignItems: "center",
                                paddingTop: "64px",
                                justifyContent: "center",
                            }}
                        >
                            {profilePhoto ? (
                                <div
                                    style={{
                                        position: "relative",
                                        width: "fit-content",
                                    }}
                                >
                                    {/* eslint-disable-next-line */}
                                    <img
                                        src="/bow-2024279_1920.png"
                                        style={{
                                            position: "absolute",
                                            top: "0",
                                            left: "-25px",
                                            transform: "rotate(-25deg)",
                                            zIndex: 1.5,
                                            width: "150px",
                                            height: "38px",
                                        }}
                                    />
                                    {/* eslint-disable-next-line */}
                                    <img
                                        src={profilePhoto}
                                        width={150}
                                        height={150}
                                        crossOrigin="anonymous"
                                        style={{
                                            borderRadius: "50%",
                                            border: "5px solid #27a11b",
                                        }}
                                    />
                                </div>
                            ) : (
                                <PatreonBunnySvgMarioPipe size={150} />
                            )}
                            <p style={{ marginLeft: "25px", fontSize: "48px" }}>
                                <span
                                    className="text-white"
                                    style={{
                                        textShadow:
                                            getEnhancedTextShadow("#27a11b"),
                                    }}
                                >
                                    therun.gg/
                                </span>
                                <span
                                    className={bangers.className}
                                    style={{
                                        fontSize:
                                            wrapped.user.length > 16
                                                ? "48px"
                                                : "64px",
                                        letterSpacing: "0.02em",
                                        color: "#27a11b",
                                        textShadow:
                                            getEnhancedTextShadow("#27a11b"),
                                    }}
                                >
                                    {safeDecodeURI(wrapped.user)}{" "}
                                    {isPatron && (
                                        <PatreonBunnySvgWithoutLink
                                            size={
                                                wrapped.user.length > 16
                                                    ? 48
                                                    : 64
                                            }
                                        />
                                    )}
                                </span>
                            </p>
                        </div>
                        <div
                            style={{
                                width: "100%",
                                display: "flex",
                                flexDirection: "row",
                                alignItems: "center",
                                paddingTop: "48px",
                                justifyContent: "center",
                            }}
                        >
                            <LayeredStats wrapped={wrapped} bangers={bangers} />
                        </div>

                        <div
                            className={bangers.className}
                            style={{
                                width: "100%",
                                display: "flex",
                                flexDirection: "column",
                                fontSize: "64px",
                                alignItems: "center",
                                color: "#fff",
                                paddingTop: "48px",
                                justifyContent: "center",
                            }}
                        >
                            <h2
                                style={{
                                    fontSize: "72px",
                                    letterSpacing: "0.02em",
                                }}
                            >
                                I...
                            </h2>
                            <p>
                                ...reset{" "}
                                <span
                                    style={{
                                        letterSpacing: "0.02em",
                                        color: "#df1349",
                                        textShadow:
                                            getEnhancedTextShadow("#df1349"),
                                    }}
                                >
                                    {wrapped.countResetFirstSplit.toLocaleString()}
                                </span>{" "}
                                {pluralise(
                                    wrapped.countResetFirstSplit,
                                    "time",
                                )}{" "}
                                on the first split
                            </p>
                            {wrapped.raceData?.globalStats?.totalRaces > 0 && (
                                <p>
                                    ...participated in{" "}
                                    <span
                                        style={{
                                            letterSpacing: "0.02em",
                                            color: "#27a11b",
                                            textShadow:
                                                getEnhancedTextShadow(
                                                    "#27a11b",
                                                ),
                                        }}
                                    >
                                        {
                                            wrapped.raceData.globalStats
                                                .totalRaces
                                        }
                                    </span>{" "}
                                    {pluralise(
                                        wrapped.raceData.globalStats.totalRaces,
                                        "race",
                                    )}
                                    , finishing{" "}
                                    <span
                                        style={{
                                            letterSpacing: "0.02em",
                                            color: "#27a11b",
                                            textShadow:
                                                getEnhancedTextShadow(
                                                    "#27a11b",
                                                ),
                                        }}
                                    >
                                        {
                                            wrapped.raceData.globalStats
                                                .totalFinishedRaces
                                        }
                                    </span>
                                </p>
                            )}
                            {wrapped.newGames.length > 0 && (
                                <p>
                                    ...played{" "}
                                    <span
                                        style={{
                                            letterSpacing: "0.02em",
                                            color: "#27a11b",
                                            textShadow:
                                                getEnhancedTextShadow(
                                                    "#27a11b",
                                                ),
                                        }}
                                    >
                                        {wrapped.newGames.length}
                                    </span>{" "}
                                    new{" "}
                                    {pluralise(wrapped.newGames.length, "game")}
                                </p>
                            )}

                            <h2 style={{ fontSize: "64px", marginTop: "48px" }}>
                                My favorite{" "}
                                {pluralise(top3Games.length, "game")}{" "}
                                {pluralise(top3Games.length, "was", "were")}
                            </h2>
                            {top3Games.map((game, index) => (
                                <p
                                    style={{
                                        fontSize: "48px",
                                        letterSpacing: "0.02em",
                                        color: "#27a11b",
                                        textShadow:
                                            getEnhancedTextShadow("#27a11b"),
                                    }}
                                    key={index}
                                >
                                    {game.display}
                                </p>
                            ))}
                        </div>
                        <div
                            className={bangers.className}
                            style={{
                                marginTop: "auto",
                                display: "flex",
                                flexDirection: "row",
                                alignItems: "center",
                                padding: "20px",
                            }}
                        >
                            {/* eslint-disable-next-line */}
                            <img
                                src="https://therun.gg/_next/image?url=%2Flogo_dark_theme_no_text_transparent.png&w=48&q=75"
                                width="100px"
                                height="100px"
                                crossOrigin="anonymous"
                            />
                            <h1
                                style={{
                                    fontSize: "48px",
                                    color: "#fff",
                                    marginLeft: "25px",
                                }}
                            >
                                RECAP{" "}
                                <span
                                    style={{
                                        letterSpacing: "0.02em",
                                        color: "#27a11b",
                                        textShadow:
                                            getEnhancedTextShadow("#27a11b"),
                                    }}
                                >
                                    {wrapped.year}
                                </span>
                            </h1>
                        </div>
                    </div>
                </div>
            </div>
        );
    },
);
HiddenDataSummary.displayName = "HiddenDataSummary";

interface WrappedSocialCardProps {
    wrapped: WrappedWithData;
    // eslint-disable-next-line
    bangers: any;
    onImageGenerated?: (imageData: {
        previewUrl: string;
        blob: Blob | undefined;
        canvas: HTMLCanvasElement | undefined;
    }) => void;
    onLoadingStateChange?: (state: {
        isLoading: boolean;
        isError: boolean;
        error?: Error;
    }) => void;
}

export function WrappedSocialCard({
    wrapped,
    bangers,
    onImageGenerated,
    onLoadingStateChange,
}: WrappedSocialCardProps): ReactElement {
    const cardRef = useRef<HTMLDivElement>(null);
    const [profilePhoto, setProfilePhoto] = useState<string | undefined>(
        undefined,
    );
    const [isPatron, setIsPatron] = useState<boolean>(false);
    const [canvas, setCanvas] = useState<HTMLCanvasElement>();
    const [blob, setBlob] = useState<Blob>();
    const [copied, setCopied] = useState(false);
    const topGames = useMemo(() => {
        return wrapped.playtimeData.playtimePerYearMap[wrapped.year].perGame;
    }, [wrapped.playtimeData.playtimePerYearMap, wrapped.year]);
    const gameMap = useMemo(() => {
        return new Map(wrapped.gamesData.map((game) => [game.display, game]));
    }, [wrapped.gamesData]);

    const gameEntries = useMemo(() => {
        return Object.entries(topGames)
            .map(([key, value]) => {
                return { game: key, total: value.total };
            })
            .sort((a, b) => b.total - a.total);
    }, [topGames]);

    const top3Games = useMemo(
        () =>
            gameEntries.slice(0, 3).map((entry) => ({
                ...gameMap.get(entry.game),
                total: entry.total,
            })),
        [gameEntries, gameMap],
    );

    const getBelovedGameImageUrl = () => {
        for (let i = 0; i < top3Games.length; i++) {
            const topGame = top3Games[i];

            if (topGame.image) {
                return `https://images.igdb.com/igdb/image/upload/t_1080p${topGame.image.slice(
                    topGame.image.lastIndexOf("/"),
                )}`;
            }
        }
        return undefined;
    };

    const belovedGameImageUrl: string | undefined = getBelovedGameImageUrl();

    const { data: patreons, isLoading } = usePatreons();

    const generateImage = useCallback(async () => {
        if (!cardRef.current) return;

        if (onLoadingStateChange) {
            onLoadingStateChange({
                isLoading: true,
                isError: false,
            });
        }

        const photo = await getUserProfilePhoto(wrapped.user);

        if (photo) {
            setProfilePhoto(photo[0].url as string);
        }

        try {
            // Wait for images to load
            const images = Array.from(cardRef.current.querySelectorAll("img"));

            await Promise.all(
                images.map(
                    (img, index) =>
                        new Promise((resolve, reject) => {
                            if (img.complete) {
                                resolve(null);
                            } else {
                                img.onload = () => {
                                    resolve(null);
                                };
                                img.onerror = () => {
                                    reject(`Image ${index} failed to load`);
                                };
                            }
                        }),
                ),
            );

            // Add a small delay to ensure everything is rendered
            await new Promise((resolve) => setTimeout(resolve, 100));

            const canvas = await html2canvas(cardRef.current, {
                useCORS: true,
                scale: 1,
                allowTaint: false,
                backgroundColor: "#000",
                height: 1920,
                width: 1080,
            });

            const targetWidth = 1080;
            const targetHeight = 1920;
            const resizedCanvas = document.createElement("canvas");
            resizedCanvas.width = targetWidth;
            resizedCanvas.height = targetHeight;

            // Get the context and draw the scaled image
            const ctx = resizedCanvas.getContext("2d");
            if (!ctx) return;

            // Use better quality scaling
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = "high";

            // Draw the original canvas scaled down
            ctx.drawImage(canvas, 0, 0, targetWidth, targetHeight);
            setCanvas(resizedCanvas);

            if (onLoadingStateChange) {
                onLoadingStateChange({
                    isLoading: false,
                    isError: false,
                });
            }
        } catch (error) {
            console.error("Error generating image:", error);
            if (onLoadingStateChange) {
                onLoadingStateChange({
                    isLoading: false,
                    isError: true,
                    error:
                        error instanceof Error
                            ? error
                            : new Error("Unknown error occurred"),
                });
            }
        }
    }, [wrapped.user]);

    const previewUrl = useMemo(() => {
        if (!canvas) {
            return "";
        }
        // Convert to JPEG
        return canvas.toDataURL("image/jpeg", 0.85);
    }, [canvas]);

    useEffect(() => {
        if (!canvas) return;
        const getCanvasBlob = (canvas: HTMLCanvasElement) =>
            new Promise<Blob>((resolve, reject) => {
                canvas.toBlob((blob) => {
                    if (blob) {
                        resolve(blob);
                    } else {
                        reject(new Error("Canvas toBlob failed."));
                    }
                });
            });

        getCanvasBlob(canvas)
            .then((blobData) => {
                setBlob(blobData);
                if (onImageGenerated) {
                    onImageGenerated({
                        previewUrl,
                        blob: blobData,
                        canvas,
                    });
                }
            })
            .catch((error) => console.error(error));
    }, [canvas]);

    const copyToClipboard = () => {
        try {
            navigator.clipboard.write([
                new ClipboardItem({
                    "image/png": blob!,
                }),
            ]);

            setCopied(true);
            setTimeout(() => {
                setCopied(false);
            }, 3000);
        } catch (error) {
            console.error(error);
        }
    };

    const handleDownload = () => {
        if (!previewUrl) return;
        const link = document.createElement("a");
        link.href = previewUrl;
        link.download = `TheRun-Recap-${wrapped.year}-${safeDecodeURI(
            wrapped.user,
        )}.jpg`;
        link.click();
    };

    useEffect(() => {
        const patronExists = patreons?.[wrapped.user];

        if (patronExists) setIsPatron(true);

        generateImage();
    }, [generateImage, isLoading, isPatron, patreons, wrapped.user]);

    return (
        <div className="position-relative w-100 h-100">
            <SectionWrapper>
                <SectionTitle
                    title="Here's your image to share with others"
                    subtitle="But please don't leave until we properly thank you below!"
                />
                <SectionBody>
                    {previewUrl && (
                        <div className="d-flex flex-column align-items-center gap-4">
                            <img
                                src={previewUrl}
                                alt={`${safeDecodeURI(
                                    wrapped.user,
                                )}'s 2024 The Run Recap summary image`}
                                style={{ maxHeight: "640px" }}
                            />
                            <div className="d-flex flex-row align-items-center gap-4">
                                <Button
                                    onClick={copyToClipboard}
                                    variant="secondary"
                                    className="px-4 py-2"
                                    disabled={copied}
                                >
                                    {copied ? "Copied!" : "Copy"}
                                </Button>
                                <Button
                                    onClick={handleDownload}
                                    className="px-4 py-2"
                                    variant="secondary"
                                >
                                    Download
                                </Button>
                            </div>
                        </div>
                    )}
                    {!previewUrl && (
                        <div className="d-flex flex-column align-items-center gap-4">
                            Loading your image... Hang in there, and get ready
                            to share it!
                        </div>
                    )}
                    <HiddenDataSummary
                        gameImageUrl={belovedGameImageUrl}
                        bangers={bangers}
                        wrapped={wrapped}
                        cardRef={cardRef}
                        isPatron={isPatron}
                        profilePhoto={profilePhoto}
                        top3Games={top3Games}
                    />
                </SectionBody>
            </SectionWrapper>
        </div>
    );
}

const LayeredStats = ({
    wrapped,
    bangers,
}: {
    wrapped: WrappedWithData;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    bangers: any;
}) => {
    const stats = [
        { value: wrapped.totalRuns, label: "RUN", color: "#4f46e5" },
        {
            value: wrapped.totalFinishedRuns,
            label: "FINISHED RUN",
            color: "#f97316",
        },
        { value: wrapped.totalPlaytime, label: "HOUR", color: "#06b6d4" },
        {
            value: wrapped.streak.length,
            label: "DAY STREAK",
            plural: "DAY STREAK",
            color: "#d73600",
        },
        { value: wrapped.totalPbs, label: "PB", color: "#22c55e" },
        { value: wrapped.totalGolds, label: "GOLD", color: "#eab308" },
        { value: wrapped.totalGames, label: "GAME", color: "#8b5cf6" },
        {
            value: wrapped.totalCategories,
            label: "CATEGORY",
            plural: "CATEGORIES",
            color: "#c154c1",
        },
        { value: wrapped.totalResets, label: "RESET", color: "#df1349" },
        { value: wrapped.totalSplits, label: "SPLIT", color: "#27A11B" },
    ];

    return (
        <div
            className={bangers.className}
            style={{
                width: "auto",
                display: "grid",
                gridTemplateColumns: "repeat(2, 1fr)",
                gap: "20px",
                padding: "20px 40px",
            }}
        >
            {stats.map((stat) => (
                <div
                    key={stat.label}
                    style={{
                        color: stat.color,
                        fontSize: `100px`,
                        lineHeight: "1",
                        textShadow: getEnhancedTextShadow(stat.color),
                        letterSpacing: "0.02em",
                        textAlign: "left",
                        display: "flex",
                        alignItems: "start",
                        justifyContent: "center",
                        flexDirection: "column",
                    }}
                >
                    <div>
                        {stat.value.toLocaleString()}
                        <span
                            style={{
                                fontSize: "50%",
                                marginLeft: "8px",
                                opacity: 0.95,
                                color: "#fff",
                                textShadow: "0 0 4px rgba(0,0,0,0.8)",
                                fontWeight: "400",
                                letterSpacing: "0.05em",
                                textTransform: "uppercase",
                            }}
                        >
                            {stat.plural
                                ? pluralise(stat.value, stat.label, stat.plural)
                                : pluralise(stat.value, stat.label)}
                        </span>
                    </div>
                </div>
            ))}
        </div>
    );
};

const getEnhancedTextShadow = (color: string) => {
    const shadowColor = color.replace(")", ", 0.3)").replace("rgb", "rgba");
    return `
      0 0 1px ${color},
      0 0 2px ${color},
      2px 2px 3px rgba(0,0,0,0.5),
      -1px -1px 0 rgba(0,0,0,0.7),
      1px -1px 0 rgba(0,0,0,0.7),
      -1px 1px 0 rgba(0,0,0,0.7),
      1px 1px 0 rgba(0,0,0,0.7),
      0 4px 8px ${shadowColor}
    `;
};

const pluralise = (value: number, singular: string, plural?: string) =>
    value === 1 ? singular : plural || `${singular}s`;
