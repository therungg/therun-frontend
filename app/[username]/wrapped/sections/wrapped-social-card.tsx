import { ReactElement, useMemo, useRef, useState } from "react";
import { WrappedWithData } from "~app/[username]/wrapped/wrapped-types";
import html2canvas from "html2canvas";
import { getUserProfilePhoto } from "~src/utils/metadata";
import { Bangers } from "next/font/google";

const bangers = Bangers({
    weight: "400",
    subsets: ["latin"],
    display: "swap",
});

export function WrappedSocialCard({
    wrapped,
}: {
    wrapped: WrappedWithData;
}): ReactElement {
    const cardRef = useRef<HTMLDivElement>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [profilePhoto, setProfilePhoto] = useState<string | undefined>(
        undefined,
    );

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

    const generateImage = async () => {
        if (!cardRef.current) return;
        setIsGenerating(true);

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

            // Convert to JPEG
            const url = resizedCanvas.toDataURL("image/jpeg", 0.85);
            setPreviewUrl(url);
        } catch (error) {
            console.error("Error generating image:", error);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleDownload = () => {
        if (!previewUrl) return;
        const link = document.createElement("a");
        link.href = previewUrl;
        link.download = `wrapped-${wrapped.year}.jpg`;
        link.click();
    };

    return (
        <div style={{ position: "relative", width: "100%", height: "100%" }}>
            <div
                style={{
                    position: "absolute",
                    left: 0,
                    top: 0,
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
                    <img
                        src={belovedGameImageUrl}
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
                            {profilePhoto && (
                                <div
                                    style={{
                                        position: "relative",
                                        width: "fit-content",
                                    }}
                                >
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
                            )}
                            <p style={{ marginLeft: "25px", fontSize: "48px" }}>
                                therun.gg/
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
                                    {wrapped.user}
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
                            <LayeredStats wrapped={wrapped} />
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
                            <h2 style={{ fontSize: "72px" }}>I...</h2>
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
                                times on the first split
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
                                    races, finishing{" "}
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
                                    new games
                                </p>
                            )}

                            <h2 style={{ fontSize: "64px", marginTop: "48px" }}>
                                My favorite games were
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

            {/* Controls and Preview */}
            <div className="flex flex-col items-center gap-4">
                <button
                    onClick={generateImage}
                    disabled={isGenerating}
                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors disabled:bg-blue-300"
                >
                    {isGenerating ? "Generating..." : "Generate Image"}
                </button>

                {previewUrl && (
                    <div className="flex flex-col items-center gap-4">
                        <img
                            src={previewUrl}
                            alt="Preview"
                            className="max-w-full h-auto"
                            style={{ maxHeight: "80vh" }}
                        />
                        <button
                            onClick={handleDownload}
                            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
                        >
                            Download Image
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

const LayeredStats = ({ wrapped }: { wrapped: WrappedWithData }) => {
    const stats = [
        { value: wrapped.totalRuns, label: "RUNS", color: "#4f46e5" },
        {
            value: wrapped.totalFinishedRuns,
            label: "FINISHED RUNS",
            color: "#f97316",
        },
        { value: wrapped.totalPlaytime, label: "HOURS", color: "#06b6d4" },
        { value: wrapped.streak.length, label: "DAY STREAK", color: "#d73600" },
        { value: wrapped.totalPbs, label: "PBs", color: "#22c55e" },
        { value: wrapped.totalGolds, label: "GOLDS", color: "#eab308" },
        { value: wrapped.totalGames, label: "GAMES", color: "#8b5cf6" },
        {
            value: wrapped.totalCategories,
            label: "CATEGORIES",
            color: "#c154c1",
        },
        { value: wrapped.totalResets, label: "RESETS", color: "#df1349" },
        { value: wrapped.totalSplits, label: "SPLITS", color: "#27A11B" },
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
                            {stat.label}
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
