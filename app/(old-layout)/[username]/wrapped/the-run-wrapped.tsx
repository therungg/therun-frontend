import { useGSAP } from '@gsap/react';
import { gsap } from 'gsap';
import { ScrollToPlugin } from 'gsap/ScrollToPlugin';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import {
    lazy,
    PropsWithChildren,
    Suspense,
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import { Button, Spinner } from 'react-bootstrap';
import { ArrowDownCircleFill, ArrowUpCircleFill } from 'react-bootstrap-icons';
import { useDebounceCallback, useResizeObserver } from 'usehooks-ts';
import { WrappedTitle } from '~app/(old-layout)/[username]/wrapped/wrapped-title';
import { WrappedWithData } from '~app/(old-layout)/[username]/wrapped/wrapped-types';
import { PatreonBunnySvg } from '~app/(old-layout)/patron/patreon-info';
import { ScrollDown } from '~src/components/scroll-down';
import { isDefined } from '~src/utils/isDefined';
import { safeDecodeURI } from '~src/utils/uri';
import styles from './mesh-background.module.scss';
import { WrappedSocialCard } from './sections/wrapped-social-card';
import socialStyles from './social-icons.module.scss';
import { SocialShareSpeedDial } from './social-share-dial';
import wrappedStyles from './wrapped.module.scss';

gsap.registerPlugin(useGSAP);
gsap.registerPlugin(ScrollTrigger);
gsap.registerPlugin(ScrollToPlugin);

const WrappedStreak = lazy(() =>
    import('./sections/wrapped-streak').then((module) => ({
        default: module.WrappedStreak,
    })),
);
const WrappedTopGames = lazy(() =>
    import('./sections/wrapped-top-games').then((module) => ({
        default: module.WrappedTopGames,
    })),
);
const WrappedOutroThanks = lazy(() =>
    import('./sections/wrapped-outro-thanks').then((module) => ({
        default: module.WrappedOutroThanks,
    })),
);

const WrappedStatsOverview = lazy(() =>
    import('./sections/wrapped-stats-overview').then((module) => ({
        default: module.WrappedStatsOverview,
    })),
);

const WrappedActivityGraphs = lazy(() =>
    import(
        '~app/(old-layout)/[username]/wrapped/sections/wrapped-activity-graphs'
    ).then((module) => ({ default: module.WrappedActivityGraphs })),
);

const WrappedRaceStats = lazy(() =>
    import('./sections/wrapped-race-stats').then((module) => ({
        default: module.WrappedRaceStats,
    })),
);

const WrappedRunsAndPbs = lazy(() =>
    import(
        '~app/(old-layout)/[username]/wrapped/sections/wrapped-runs-and-pbs'
    ).then((module) => ({
        default: module.WrappedRunsAndPbs,
    })),
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
    ignoreReady?: boolean;
}

const WrappedSection: React.FC<PropsWithChildren<WrappedSectionProps>> = ({
    children,
    id = '',
    ready,
    ignoreReady = false,
}) => {
    return (
        <section
            id={id}
            className="animated-section text-center flex-center align-items-center min-vh-100"
        >
            {ignoreReady && children}
            {!ignoreReady && ready && (
                <Suspense fallback={<Spinner />}>{children}</Suspense>
            )}
            {!ignoreReady && !ready && <Spinner />}
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
    const [socialImageLoadingState, setSocialImageLoadingState] = useState({
        isLoading: true,
        isError: false,
    });
    const [socialImageUrl, setSocialImageUrl] = useState<string | null>(null);

    const handleSocialImageLoadingStateChange = useCallback(
        (state: { isLoading: boolean; isError: boolean; error?: Error }) => {
            setSocialImageLoadingState(state);
        },
        [],
    );

    const handleSocialImageGenerated = useCallback(
        (state: {
            previewUrl: string;
            blob: Blob | undefined;
            canvas: HTMLCanvasElement | undefined;
        }) => {
            if (!socialImageLoadingState.isError)
                setSocialImageUrl(state.previewUrl);
        },
        [],
    );

    const downloadSocialImage = () => {
        if (!socialImageUrl) return;
        const link = document.createElement('a');
        link.href = socialImageUrl;
        link.download = `TheRun-Recap-${wrapped.year}-${safeDecodeURI(
            wrapped.user,
        )}.jpg`;
        link.click();
    };

    const debouncedRefresh = useDebounceCallback(() => {
        if (readySections) {
            ScrollTrigger.refresh();
        }
    }, 100);
    useEffect(() => {
        debouncedRefresh();
        return () => debouncedRefresh.cancel();
    }, [readySections, useDebounceCallback]);
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
                ignoreReady
            >
                <WrappedSocialCard
                    wrapped={wrapped}
                    onImageGenerated={handleSocialImageGenerated}
                    onLoadingStateChange={handleSocialImageLoadingStateChange}
                />
            </WrappedSection>,
            <WrappedSection
                key="wrapped-outro"
                id="wrapped-outro"
                ready={readySections[hasEnoughData ? 6 : 5]}
            >
                <WrappedOutroThanks wrapped={wrapped} />
            </WrappedSection>,
        ].filter(isDefined);
    }, [wrapped, readySections]);

    const updateReadySections = useCallback(
        (
            updater: (prev: Record<number, boolean>) => Record<number, boolean>,
        ) => {
            setReadySections((prevSections) => {
                const nextSections = updater(prevSections);
                // Check if state has actually changed before updating it
                const hasChanged = Object.keys(nextSections).some(
                    (key) =>
                        nextSections[Number(key)] !== prevSections[Number(key)],
                );
                return hasChanged ? nextSections : prevSections;
            });
        },
        [],
    );

    // https://gsap.com/resources/React/
    useGSAP(
        () => {
            if (!wrapped.hasEnoughRuns) return;

            const sections: gsap.DOMTarget[] =
                gsap.utils.toArray('.animated-section');

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
                            updateReadySections((prevSections) => ({
                                ...prevSections,
                                [index + 1]: true,
                            }));
                        },
                        onLeaveBack: () => {
                            setSectionIndex(index - 1);
                            updateReadySections((prevSections) => ({
                                ...prevSections,
                                [index]: true,
                            }));
                        },
                    });
                });
            });

            // Mobile lazy loading logic
            matchMedia.add(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`, () => {
                const observer = new IntersectionObserver(
                    (entries) => {
                        entries.forEach((entry) => {
                            const section = entry.target;
                            const sectionIndex = sections.indexOf(section);
                            const fromTop = entry.intersectionRect.top;
                            const fromBottom =
                                (entry.rootBounds?.height ?? 0) -
                                entry.intersectionRect.bottom;

                            // Scrolling Down
                            if (fromTop > fromBottom && entry.isIntersecting) {
                                updateReadySections((prevSections) => {
                                    return {
                                        ...prevSections,
                                        // intersection observer is kind of funky so just going
                                        // so making sure we grab the current and next section just in case
                                        [sectionIndex]: true,
                                        [sectionIndex + 1]: true,
                                    };
                                });
                            }
                            // Scrolling Up
                            if (fromBottom > fromTop && entry.isIntersecting) {
                                updateReadySections((prevSections) => {
                                    return {
                                        ...prevSections,
                                        // intersection observer is kind of funky so just going
                                        // so making sure we grab the current and next section just in case
                                        [sectionIndex]: true,
                                        [sectionIndex - 1]: true,
                                    };
                                });
                            }
                        });
                    },
                    {
                        threshold: 0.2, // Trigger when 20% of the section is in view
                    },
                );

                sections.forEach((section) =>
                    observer.observe(section as Element),
                );

                return () => observer.disconnect();
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
            gsap.utils.toArray('.animated-section');
        let targetSection = animatedSections[index];
        // TODO: There's a bug where it won't scroll back to the intro
        if (!targetSection && index === -1) targetSection = '#wrapped-intro';
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
        <>
            <script
                dangerouslySetInnerHTML={{
                    __html: `
            (function () {
              // Override the existing theme
              window.localStorage.setItem("theme", "dark");
              document.documentElement.dataset.bsTheme = "dark";
              
              // Override any future attempts to change the theme
              Object.defineProperty(window.localStorage, "theme", {
                get: () => "dark",
                set: () => "dark"
              });
            })();
          `,
                }}
            />
            <div ref={containerRef}>
                <div className={styles.meshBg} style={{ height }}></div>
                <section
                    id="wrapped-intro"
                    className="d-flex flex-column min-vh-100-no-header text-center"
                >
                    <div className="flex-grow-1 d-flex flex-column justify-content-end">
                        <p className="display-5 mb-0">You had a great 2025!</p>
                        <WrappedTitle user={user} />
                        <p className="h3 mt-1 opacity-50">
                            Brought to you by{' '}
                            <span
                                className="me-1"
                                style={{ color: 'var(--bs-link-color)' }}
                            >
                                therun.gg
                            </span>
                            <PatreonBunnySvg />
                        </p>
                    </div>
                    <div className="flex-grow-1 d-flex flex-column justify-content-end">
                        <p className="fs-4 mb-4">
                            Let's see your stats for this year. Start scrolling!
                        </p>
                        <p className="fs-5 mb-3">
                            If you are impatient, you can download your recap as
                            a cool little image here.{' '}
                            <span className="opacity-25">
                                Promise you'll share on socials?
                            </span>
                        </p>
                        <div className="mb-5">
                            {socialImageLoadingState.isLoading && (
                                <p className="fs-6">
                                    Hold on for a sec - it's generating!
                                </p>
                            )}
                            {socialImageLoadingState.isError && (
                                <p className="fs-6 text-danger">
                                    There was an error generating your image. If
                                    this keeps happening, contact us on Discord.
                                </p>
                            )}
                            {!socialImageLoadingState.isLoading &&
                                socialImageUrl && (
                                    <div className="d-inline-block">
                                        <Button
                                            size="lg"
                                            className="w-auto"
                                            onClick={downloadSocialImage}
                                        >
                                            Download Recap Image
                                        </Button>
                                    </div>
                                )}
                        </div>
                        <p className="d-lg-none d-md-block text-sm text-muted mb-5">
                            (For an optimal experience, we recommend viewing
                            your Recap on a computer)
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
                        title="Check out my 2025 The Run speedrunning recap!"
                        url={`https://therun.gg/${user}/wrapped`}
                    />
                </div>
                {sectionIndex + 1 === 0 ||
                sectionIndex + 1 === sections.length ? null : (
                    <h2
                        style={{
                            bottom: FOOTER_HEIGHT,
                            opacity: 0.66,
                            marginRight: '-8rem',
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
        </>
    );
};
