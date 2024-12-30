import { useMemo, useRef, useState } from "react";
import { WrappedWithData } from "~app/[username]/wrapped/wrapped-types";
import { WrappedTitle } from "~app/[username]/wrapped/wrapped-title";
import { ScrollDown } from "~src/components/scroll-down";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { WrappedStreak } from "./sections/wrapped-streak";
import { WrappedSocialImages } from "./sections/wrapped-social-images";
import { WrappedTopGames } from "./sections/wrapped-top-games";
import { WrappedTotalStatsCompliment } from "./sections/wrapped-total-stats-compliment";
import { WrappedActivityGraphs } from "~app/[username]/wrapped/sections/wrapped-activity-graphs";

gsap.registerPlugin(useGSAP);
gsap.registerPlugin(ScrollTrigger);

interface TheRunWrappedProps {
    user: string;
    wrapped: WrappedWithData;
}

export const TheRunWrapped = ({ wrapped, user }: TheRunWrappedProps) => {
    const [sectionIndex, setSectionIndex] = useState(-1);
    const containerRef = useRef(null);
    // https://gsap.com/resources/React/
    useGSAP(
        () => {
            if (!wrapped.hasEnoughRuns) return;

            const sections: gsap.DOMTarget[] =
                gsap.utils.toArray(".animated-section");

            ScrollTrigger.defaults({
                pin: true,
                scrub: 0.5,
            });

            sections.forEach((section, index) => {
                console.log({ section, index });
                ScrollTrigger.create({
                    trigger: section,
                    onEnter: () => setSectionIndex(index),
                    onLeaveBack: () => setSectionIndex(index - 1),
                });
            });
        },
        {
            dependencies: [wrapped.hasEnoughRuns],
            scope: containerRef,
            revertOnUpdate: true,
        },
    );
    const sections = useMemo(() => {
        return [
            <section
                key="wrapped-total-stats-compliment"
                className="animated-section text-center flex-center align-items-center min-vh-100"
            >
                <WrappedTotalStatsCompliment wrapped={wrapped} />
            </section>,

            <section
                key="wrapped-activity-graphs"
                className="animated-section text-center flex-center align-items-center min-vh-100"
            >
                <WrappedActivityGraphs wrapped={wrapped} />
            </section>,

            <section
                key="wrapped-streak"
                className="animated-section flex-center flex-column align-items-center min-vh-100"
            >
                <WrappedStreak wrapped={wrapped} />
            </section>,

            <section
                key="wrapped-top-games"
                className="animated-section text-center min-vh-100"
            >
                <WrappedTopGames wrapped={wrapped} />
            </section>,

            <section
                key="wrapped-outro"
                className="animated-section flex-center flex-column align-items-center min-vh-100"
            >
                <p className="text-center flex-center align-items-center display-2 mb-4">
                    That's a wrap on 2024!
                </p>
                <p className="text-center display-6 mb-5">
                    Thanks for spending it with The Run. We can't wait to see
                    what you do in 2025!
                </p>
                <WrappedSocialImages wrapped={wrapped} />
            </section>,
        ];
    }, [wrapped]);

    return (
        <div ref={containerRef}>
            <section
                key="wrapped-intro"
                className="flex-center flex-column min-vh-100-no-header mesh-bg text-center"
            >
                <p className="display-2 mb-0">You had a great 2024!</p>
                <WrappedTitle user={user} />
                <p className="display-6 mb-5">
                    Let's see your stats for this year!
                </p>
                <ScrollDown />
            </section>
            {sections}
            {sectionIndex + 1 === 0 ||
            sectionIndex + 1 === sections.length ? null : (
                <h2
                    style={{ bottom: 25, opacity: 0.66 }}
                    className="sticky-bottom text-end"
                >
                    {sectionIndex + 1} / {sections.length - 1}
                </h2>
            )}
        </div>
    );
};
