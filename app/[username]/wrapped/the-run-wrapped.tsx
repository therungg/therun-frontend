import {
    lazy,
    PropsWithChildren,
    Suspense,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import { WrappedWithData } from "~app/[username]/wrapped/wrapped-types";
import { WrappedTitle } from "~app/[username]/wrapped/wrapped-title";
import { ScrollDown } from "~src/components/scroll-down";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ScrollToPlugin } from "gsap/ScrollToPlugin";
import { Button, Spinner } from "react-bootstrap";
import { ArrowDownCircleFill, ArrowUpCircleFill } from "react-bootstrap-icons";
import { isDefined } from "~src/utils/isDefined";
import styles from "./mesh-background.module.scss";
import wrappedStyles from "./wrapped.module.scss";
import socialStyles from "./social-icons.module.scss";
import { useResizeObserver } from "usehooks-ts";
import { SocialShareSpeedDial } from "./social-share-dial";
import { PatreonBunnySvg } from "~app/patron/patreon-info";

gsap.registerPlugin(useGSAP);
gsap.registerPlugin(ScrollTrigger);
gsap.registerPlugin(ScrollToPlugin);

const WrappedStreak = lazy(() =>
    import("./sections/wrapped-streak").then((module) => ({
        default: module.WrappedStreak,
    })),
);
const WrappedTopGames = lazy(() =>
    import("./sections/wrapped-top-games").then((module) => ({
        default: module.WrappedTopGames,
    })),
);
const WrappedOutroThanks = lazy(() =>
    import("./sections/wrapped-outro-thanks").then((module) => ({
        default: module.WrappedOutroThanks,
    })),
);

const WrappedSocialCard = lazy(() =>
    import("./sections/wrapped-social-card").then((module) => ({
        default: module.WrappedSocialCard,
    })),
);

const WrappedStatsOverview = lazy(() =>
    import("./sections/wrapped-stats-overview").then((module) => ({
        default: module.WrappedStatsOverview,
    })),
);

const WrappedActivityGraphs = lazy(() =>
    import("~app/[username]/wrapped/sections/wrapped-activity-graphs").then(
        (module) => ({ default: module.WrappedActivityGraphs }),
    ),
);

const WrappedRaceStats = lazy(() =>
    import("./sections/wrapped-race-stats").then((module) => ({
        default: module.WrappedRaceStats,
    })),
);

const WrappedRunsAndPbs = lazy(() =>
    import("~app/[username]/wrapped/sections/wrapped-runs-and-pbs").then(
        (module) => ({
            default: module.WrappedRunsAndPbs,
        }),
    ),
);

interface TheRunWrappedProps {
    user: string;
    wrapped: WrappedWithData;
}

const FOOTER_HEIGHT = 25;

const hasRaceData = (wrapped: WrappedWithData) => {
    return (
        wrapped.raceData?.categoryStats?.length > 0 &&
        wrapped.raceData?.globalStats?.totalRaces > 0
    );
};

const MOBILE_BREAKPOINT = 768;

interface WrappedSectionProps {
    id?: string;
    ready?: boolean;
}

const WrappedSection: React.FC<PropsWithChildren<WrappedSectionProps>> = ({
    children,
    id = "",
    ready,
}) => {
    return (
        <section
            id={id}
            className="animated-section text-center flex-center align-items-center min-vh-100"
        >
            {ready ? (
                <Suspense fallback={<Spinner />}>{children}</Suspense>
            ) : (
                <Spinner />
            )}
        </section>
    );
};

export const TheRunWrapped = ({ wrapped, user }: TheRunWrappedProps) => {
    const [sectionIndex, setSectionIndex] = useState(-1);
    const containerRef = useRef<HTMLDivElement>(null);
    const { height } = useResizeObserver({ ref: containerRef });
    const [readySections, setReadySections] = useState<Record<number, boolean>>(
        { 0: true },
    );
    useEffect(() => {
        if (readySections) {
            // When the readySections updates this means a new lazy-loaded Section is ready
            // This also means the content height isn't properly known and gsap
            // believes before this point that the height is 100vh.
            // This recomputes the start + end markers
            ScrollTrigger.refresh();
        }
    }, [readySections]);
    const sections = useMemo(() => {
        const hasEnoughData = hasRaceData(wrapped);
        return [
            <WrappedSection
                key="wrapped-total-stats-compliment"
                id="wrapped-total-stats-compliment"
                ready
            >
                <WrappedStatsOverview wrapped={wrapped} />
            </WrappedSection>,

            <WrappedSection
                key="wrapped-activity-graphs"
                id="wrapped-activity-graphs"
                ready={readySections[1]}
            >
                <WrappedActivityGraphs wrapped={wrapped} />
            </WrappedSection>,

            <WrappedSection
                key="wrapped-top-games"
                id="wrapped-top-games"
                ready={readySections[2]}
            >
                <WrappedTopGames wrapped={wrapped} />
            </WrappedSection>,

            <WrappedSection
                key="wrapped-pbs-and-golds"
                id="wrapped-pbs-and-golds"
                ready={readySections[3]}
            >
                <WrappedRunsAndPbs wrapped={wrapped} />
            </WrappedSection>,

            <WrappedSection
                key="wrapped-streak"
                id="wrapped-streak"
                ready={readySections[4]}
            >
                <WrappedStreak wrapped={wrapped} />
            </WrappedSection>,

            hasEnoughData ? (
                <WrappedSection
                    key="wrapped-race-stats"
                    id="wrapped-race-stats"
                    ready={readySections[5]}
                >
                    <WrappedRaceStats wrapped={wrapped} />
                </WrappedSection>
            ) : null,
            <WrappedSection
                key="wrapped-social-share"
                id="wrapped-social-share"
                ready={readySections[hasEnoughData ? 6 : 5]}
            >
                <WrappedSocialCard wrapped={wrapped} />
            </WrappedSection>,
            <WrappedSection
                key="wrapped-outro"
                id="wrapped-outro"
                ready={readySections[hasEnoughData ? 7 : 6]}
            >
                <WrappedOutroThanks wrapped={wrapped} />
            </WrappedSection>,
        ].filter(isDefined);
    }, [wrapped, readySections]);

    // https://gsap.com/resources/React/
    useGSAP(
        () => {
            if (!wrapped.hasEnoughRuns) return;

            const sections: gsap.DOMTarget[] =
                gsap.utils.toArray(".animated-section");

            const matchMedia = gsap.matchMedia();
            matchMedia.add(`(min-width: ${MOBILE_BREAKPOINT}px)`, () => {
                ScrollTrigger.defaults({
                    pin: true,
                    scrub: 0.5,
                });

                sections.forEach((section, index) => {
                    ScrollTrigger.create({
                        trigger: section,
                        onEnter: () => {
                            setSectionIndex(index);
                            setReadySections((prevSections) => ({
                                ...prevSections,
                                [index + 1]: true,
                            }));
                        },
                        onLeaveBack: () => setSectionIndex(index - 1),
                    });
                });
            });
        },
        {
            dependencies: [wrapped.hasEnoughRuns],
            scope: containerRef,
            revertOnUpdate: true,
        },
    );
    const { contextSafe } = useGSAP({ scope: containerRef });

    const scrollToSection = contextSafe((index: number) => {
        const animatedSections: gsap.DOMTarget[] =
            gsap.utils.toArray(".animated-section");
        let targetSection = animatedSections[index];
        // TODO: There's a bug where it won't scroll back to the intro
        if (!targetSection && index === -1) targetSection = "#wrapped-intro";
        gsap.to(window, {
            scrollTo: (targetSection || animatedSections[0]) as Element,
            onComplete: () => {
                setSectionIndex(index);
            },
        });
    });

    const onClickNext = contextSafe(() => {
        const nextIndex = Math.min(sectionIndex + 1, sections.length - 1);
        scrollToSection(nextIndex);
        setSectionIndex(nextIndex);
    });

    const onClickPrevious = contextSafe(() => {
        let prevIndex = sectionIndex - 1;
        if (prevIndex < -1) prevIndex = -1;
        scrollToSection(prevIndex);
    });
    return (
        <div ref={containerRef}>
            <div className={styles.meshBg} style={{ height }}></div>
            <section
                id="wrapped-intro"
                className="d-flex flex-column min-vh-100-no-header text-center"
            >
                <div className="flex-grow-1 d-flex flex-column justify-content-end">
                    <p className="display-5 mb-0">You had a great 2024!</p>
                    <WrappedTitle user={user} />
                    <p className="h3 mt-1 opacity-50">
                        Brought to you by{" "}
                        <span
                            className="me-1"
                            style={{ color: "var(--bs-link-color)" }}
                        >
                            therun.gg
                        </span>
                        <PatreonBunnySvg />
                    </p>
                </div>
                <div className="flex-grow-1 d-flex flex-column justify-content-end">
                    <p className="fs-5 mb-4">
                        Let's see your stats for this year. Start scrolling!
                    </p>
                    <p className="d-lg-none d-md-block text-sm text-muted mb-5">
                        (For an optimal experience, we recommend viewing your
                        Recap on a computer)
                    </p>
                    <ScrollDown />
                </div>
            </section>
            {sections.map((section, index) => {
                return (
                    <>
                        <div className="py-md-6">
                            <div
                                className={`d-sm-flex d-md-none ${wrappedStyles.separator}`}
                            >
                                <h2>
                                    {index + 1} / {sections.length}
                                </h2>
                            </div>
                        </div>
                        {section}
                    </>
                );
            })}
            <div
                className={`sticky-bottom text-center end-0 me-4 position-fixed d-md-flex ${socialStyles.socialContainer}`}
            >
                <SocialShareSpeedDial
                    title="Check out my 2024 The Run speedrunning recap!"
                    text="Here's something you might love!"
                    url={`https://therun.gg/${user}/wrapped`}
                />
            </div>
            {sectionIndex + 1 === 0 ||
            sectionIndex + 1 === sections.length ? null : (
                <h2
                    style={{
                        bottom: FOOTER_HEIGHT,
                        opacity: 0.66,
                        marginRight: "-8rem",
                    }}
                    className="sticky-bottom text-end end-0 me-4 position-fixed d-none d-md-flex"
                >
                    {sectionIndex + 1} / {sections.length - 1}
                </h2>
            )}
            <div
                style={{ bottom: FOOTER_HEIGHT }}
                className="sticky-bottom start-0 ms-4 position-fixed d-none d-md-flex"
            >
                <Button
                    disabled={sectionIndex + 1 === 0}
                    variant="outline-secondary mx-2"
                    aria-description="previous"
                    onClick={onClickPrevious}
                >
                    <ArrowUpCircleFill />
                </Button>
                <Button
                    disabled={sectionIndex + 1 === sections.length}
                    variant="outline-secondary"
                    aria-description="next"
                    onClick={onClickNext}
                >
                    <ArrowDownCircleFill />
                </Button>
            </div>
        </div>
    );
};
