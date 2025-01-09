import React, {
    PropsWithChildren,
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import { WrappedWithData } from "~app/[username]/wrapped/wrapped-types";
import { WrappedTitle } from "~app/[username]/wrapped/wrapped-title";
import { ScrollDown } from "~src/components/scroll-down";
import { WrappedStreak } from "./sections/wrapped-streak";
import { WrappedTopGames } from "./sections/wrapped-top-games";
import { WrappedStatsOverview } from "./sections/wrapped-stats-overview";
import { WrappedActivityGraphs } from "~app/[username]/wrapped/sections/wrapped-activity-graphs";
import { WrappedRaceStats } from "./sections/wrapped-race-stats";
import { WrappedRunsAndPbs } from "~app/[username]/wrapped/sections/wrapped-runs-and-pbs";
import { isDefined } from "~src/utils/isDefined";
import styles from "./mesh-background.module.scss";
import wrappedStyles from "./wrapped.module.scss";
import { WrappedOutroThanks } from "./sections/wrapped-outro-thanks";
import { WrappedSocialCard } from "./sections/wrapped-social-card";

interface TheRunWrappedProps {
    user: string;
    wrapped: WrappedWithData;
}

const hasRaceData = (wrapped: WrappedWithData) => {
    return (
        wrapped.raceData?.categoryStats?.length > 0 &&
        wrapped.raceData?.globalStats?.totalRaces > 0
    );
};

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
    const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!containerRef.current) return;
        const observer = new ResizeObserver((entries) => {
            for (const entry of entries) {
                setContainerSize({
                    width: entry.contentRect.width,
                    height: entry.contentRect.height,
                });
            }
        });

        observer.observe(containerRef.current);

        return () => {
            observer.disconnect();
        };
    }, []);

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

    const getPager = useCallback(
        ({ index, total }: { index: number; total: number }) => (
            <h2>
                {index} / {total}
            </h2>
        ),
        [],
    );

    return (
        <div ref={containerRef}>
            <div
                className={styles.meshBg}
                style={{ height: containerSize.height }}
            ></div>
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
                        <div className={wrappedStyles.separator}>
                            {getPager({
                                index: index + 1,
                                total: sections.length,
                            })}
                        </div>
                        {section}
                    </>
                );
            })}
        </div>
    );
};
