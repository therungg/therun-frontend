import { memo, useRef } from "react";
import { WrappedWithData } from "../wrapped-types";
import { SectionBody } from "./section-body";
import { SectionTitle } from "./section-title";
import { SectionWrapper } from "./section-wrapper";
import { PatreonBunnySvgWithoutLink } from "~app/patron/patreon-info";
import { useSparksAnimation } from "../use-sparks-animation.hook";

interface WrappedOutroThanksProps {
    wrapped: WrappedWithData;
}
export const WrappedOutroThanks = memo<WrappedOutroThanksProps>(
    ({ wrapped }) => {
        const containerRef = useRef<HTMLDivElement>(null);
        const sparkRef = useRef<HTMLDivElement>(null);
        useSparksAnimation({
            containerRef,
            sparkRef,
            shouldShowSparks: true,
        });
        return (
            <SectionWrapper>
                <SectionTitle
                    title="That's a wrap on 2024!"
                    subtitle="Thanks for spending it with The Run. We can't wait to see what you do in 2025!"
                />
                <SectionBody ref={sparkRef}>
                    <div
                        ref={containerRef}
                        className="w-75 mx-auto p-8 rounded-lg shadow-md"
                    >
                        <div className="text-center">
                            <h2 className="text-3xl font-semibold">
                                Thank You
                            </h2>
                        </div>

                        <p className="text-lg leading-relaxed">
                            To you,{" "}
                            <span className="font-semibold">
                                {wrapped.user}
                            </span>
                            , and our incredible speedrunning community,
                        </p>

                        <p className="text-lg leading-relaxed">
                            Thank you for making 2024 another amazing year at
                            The Run. Every submission, every record, and every
                            moment shared has helped build this hub of
                            speedrunning statistics that we're all proud of.
                            Your dedication to pushing the boundaries of what's
                            possible in gaming continues to inspire us.
                        </p>

                        <p className="text-lg leading-relaxed">
                            We pour our hearts into maintaining and improving
                            the site with updated visuals and new features
                            because we believe in preserving the incredible
                            achievements of this community. 2024 brought us some
                            great new features and improvements such as Races
                            and Story Mode.
                        </p>

                        <p className="text-lg leading-relaxed">
                            If you'd like to help us keep building and expanding
                            The Run in 2025 and beyond, consider supporting us
                            on Patreon. Your support directly helps us deliver
                            existing features like this annual wrap-up, while
                            also developing new ones for the community and
                            ensures we can keep documenting the evolving history
                            of speedrunning.
                        </p>

                        <p className="text-lg leading-relaxed font-semibold">
                            Here's to another year of breaking records together!
                        </p>

                        <div className="text-center mt-8">
                            <a
                                href="/patron"
                                className="inline-flex items-center gap-2 px-6 py-3 text-lg font-medium text-white bg-indigo-600 rounded-full hover:bg-indigo-700 transition-colors"
                            >
                                Support us on Patreon&nbsp;
                                <PatreonBunnySvgWithoutLink />
                            </a>
                        </div>
                    </div>
                </SectionBody>
            </SectionWrapper>
        );
    },
);
WrappedOutroThanks.displayName = "WrappedOutroThanks";
