import { WrappedWithData } from "~app/[username]/wrapped/wrapped-types";
import { WrappedTitle } from "~app/[username]/wrapped/wrapped-title";
import { ScrollDown } from "~src/components/scroll-down";
import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { WrappedStreak } from "./sections/wrapped-streak";
import { WrappedSocialImages } from "./sections/wrapped-social-images";
import { WrappedTopGames } from "./sections/wrapped-top-games";
import { WrappedTotalStatsCompliment } from "./sections/wrapped-total-stats-compliment";
import { WrappedActivityGraphs } from "~app/[username]/wrapped/sections/wrapped-activity-graphs";

gsap.registerPlugin(ScrollTrigger);

interface TheRunWrappedProps {
    user: string;
    wrapped: WrappedWithData;
}

export const TheRunWrapped = ({ wrapped, user }: TheRunWrappedProps) => {
    const containerRef = useRef(null);

    useEffect(() => {
        if (!wrapped.hasEnoughRuns) return;

        const sections: gsap.DOMTarget[] =
            gsap.utils.toArray(".animated-section");

        ScrollTrigger.defaults({
            //markers: true,
            pin: true,
            scrub: 0.5,
        });

        sections.forEach((section, _) => {
            ScrollTrigger.create({
                trigger: section,
            });
        });

        return () => {
            ScrollTrigger.getAll().forEach((st) => st.kill());
        };
    }, [wrapped.hasEnoughRuns]);

    return (
        <div ref={containerRef}>
            <section className="flex-center flex-column min-vh-100-no-header mesh-bg text-center">
                <p className="display-2 mb-0">You had a great 2024!</p>
                <WrappedTitle user={user} />
                <p className="display-6 mb-5">
                    Let's see your stats for this year!
                </p>
                <ScrollDown />
            </section>

            <section className="animated-section text-center flex-center align-items-center min-vh-100">
                <WrappedTotalStatsCompliment wrapped={wrapped} />
            </section>

            <section className="animated-section text-center flex-center align-items-center min-vh-100">
                <WrappedActivityGraphs wrapped={wrapped} />
            </section>

            <section className="animated-section flex-center flex-column align-items-center min-vh-100">
                <WrappedStreak wrapped={wrapped} />
            </section>

            <section className="animated-section text-center min-vh-100">
                <WrappedTopGames wrapped={wrapped} />
            </section>

            <section className="animated-section flex-center flex-column align-items-center min-vh-100">
                <p className="text-center flex-center align-items-center display-2 mb-4">
                    That's a wrap on 2024!
                </p>
                <p className="text-center display-6 mb-5">
                    Thanks for spending it with The Run. We can't wait to see
                    what you do in 2025!
                </p>
                <WrappedSocialImages wrapped={wrapped} />
            </section>
        </div>
    );
};
