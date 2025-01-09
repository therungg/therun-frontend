import { PropsWithChildren, useMemo, useRef, useState } from "react";
import { WrappedWithData } from "~app/[username]/wrapped/wrapped-types";
import { WrappedTitle } from "~app/[username]/wrapped/wrapped-title";
import { ScrollDown } from "~src/components/scroll-down";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ScrollToPlugin } from "gsap/ScrollToPlugin";
import { WrappedStreak } from "./sections/wrapped-streak";
import { WrappedTopGames } from "./sections/wrapped-top-games";
import { WrappedStatsOverview } from "./sections/wrapped-stats-overview";
import { WrappedActivityGraphs } from "~app/[username]/wrapped/sections/wrapped-activity-graphs";
import { Button } from "react-bootstrap";
import { ArrowDownCircleFill, ArrowUpCircleFill } from "react-bootstrap-icons";
import { WrappedRaceStats } from "./sections/wrapped-race-stats";
import { WrappedRunsAndPbs } from "~app/[username]/wrapped/sections/wrapped-runs-and-pbs";
import { isDefined } from "~src/utils/isDefined";
import styles from "./mesh-background.module.scss";
import wrappedStyles from "./wrapped.module.scss";
import { WrappedOutroThanks } from "./sections/wrapped-outro-thanks";
import { WrappedSocialCard } from "./sections/wrapped-social-card";
import { useResizeObserver } from "~src/common/use-resize-observer.hook";

gsap.registerPlugin(useGSAP);
gsap.registerPlugin(ScrollTrigger);
gsap.registerPlugin(ScrollToPlugin);

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
}

const WrappedSection: React.FC<PropsWithChildren<WrappedSectionProps>> = ({
    children,
    id = "",
}) => {
    return (
        <section
            id={id}
            className="animated-section text-center flex-center align-items-center min-vh-100"
        >
            {children}
        </section>
    );
};

export const TheRunWrapped = ({ wrapped, user }: TheRunWrappedProps) => {
    const [sectionIndex, setSectionIndex] = useState(-1);
    const containerRef = useRef<HTMLDivElement>(null);
    const { height } = useResizeObserver(containerRef.current);
    const { width: pageWidth } = useResizeObserver(document.body);

    const sections = useMemo(() => {
        return [
            <WrappedSection key="wrapped-total-stats-compliment">
                <WrappedStatsOverview wrapped={wrapped} />
            </WrappedSection>,

            <WrappedSection key="wrapped-activity-graphs">
                <WrappedActivityGraphs wrapped={wrapped} />
            </WrappedSection>,

            <WrappedSection key="wrapped-top-games">
                <WrappedTopGames wrapped={wrapped} />
            </WrappedSection>,

            <WrappedSection key="wrapped-pbs-and-golds">
                <WrappedRunsAndPbs wrapped={wrapped} />
            </WrappedSection>,

            <WrappedSection key="wrapped-streak">
                <WrappedStreak wrapped={wrapped} />
            </WrappedSection>,

            hasRaceData(wrapped) ? (
                <WrappedSection key="wrapped-race-stats">
                    <WrappedRaceStats wrapped={wrapped} />
                </WrappedSection>
            ) : null,
            <WrappedSection
                key="wrapped-social-share"
                id="wrapped-social-share"
            >
                <WrappedSocialCard wrapped={wrapped} />
            </WrappedSection>,
            <WrappedSection key="wrapped-outro" id="wrapped-outro">
                <WrappedOutroThanks wrapped={wrapped} />
            </WrappedSection>,
        ].filter(isDefined);
    }, [wrapped]);

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
                        onEnter: () => setSectionIndex(index),
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
                className="flex-center flex-column min-vh-100-no-header text-center"
            >
                <p className="display-2 mb-0">You had a great 2024!</p>
                <WrappedTitle user={user} />
                <p className="display-6 mb-5">
                    Let's see your stats for this year. Start scrolling!
                </p>
                <p className="d-lg-none d-md-block text-sm text-muted mb-5">
                    (For an optimal experience, we recommend viewing your Recap
                    on a computer)
                </p>
                <ScrollDown />
            </section>
            {sections.map((section, index) => {
                return (
                    <>
                        {pageWidth >= MOBILE_BREAKPOINT ? null : (
                            <div className={wrappedStyles.separator}>
                                <h2>
                                    {index + 1} / {sections.length}
                                </h2>
                            </div>
                        )}
                        {section}
                    </>
                );
            })}
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
