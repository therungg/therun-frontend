import React, { memo, useRef } from "react";
import { WrappedWithData } from "../wrapped-types";
import { SectionBody } from "./section-body";
import { SectionTitle } from "./section-title";
import { SectionWrapper } from "./section-wrapper";
// import { useHeartsAnimation } from "../use-hearts-animation.hook";
import styles from "../hearts.module.scss";
import {
    PatreonBunnySvg,
    PatreonBunnySvgWithoutLink,
} from "~app/patron/patreon-info";
import Link from "next/link";
import { Button } from "react-bootstrap";

interface WrappedOutroThanksProps {
    wrapped: WrappedWithData;
}

export const WrappedOutroThanks = memo<WrappedOutroThanksProps>(
    ({ wrapped }) => {
        const containerRef = useRef<HTMLDivElement>(null);
        const heartRef = useRef<HTMLDivElement>(null);
        // useHeartsAnimation({
        //     containerRef,
        //     heartRef,
        //     shouldShowHearts: true,
        // });
        return (
            <SectionWrapper>
                <SectionTitle title={`That's a wrap on ${wrapped.year}!`} />
                <SectionBody ref={heartRef}>
                    <div
                        ref={containerRef}
                        className={`w-75 align-items-center mb-5 p-8 rounded-lg shadow-md ${styles.heartbeatContainer}`}
                    >
                        <p className="display-2 fw-semibold">THANK YOU</p>
                        <p className="fs-2">
                            I'd like to give some special thanks to:
                        </p>

                        <ul className="list-style-inside fs-5">
                            <li>
                                <b>Chiken</b>, <b>Flo</b> and <b>Rowan</b> for
                                enormous efforts in helping me build this cool
                                little website
                            </li>
                            <li>
                                <span className="me-1">
                                    All the amazing people supporting the site.
                                    Without you, I couldn't pay for this thing!
                                </span>
                                <PatreonBunnySvg />
                            </li>
                            <li>
                                And to you, <b>{wrapped.user}</b>, for being an
                                awesome runner!
                            </li>
                        </ul>
                    </div>
                    <div className="mb-3 rounded-3 w-75 game-border overflow-hidden">
                        <p className="display-2 fw-semibold mb-4">
                            Lastly.. One more thing!
                        </p>
                        <p className="fs-2">
                            All of{" "}
                            <span style={{ color: "var(--bs-link-color)" }}>
                                therun.gg
                            </span>{" "}
                            is open-source, 100% free and without ads.
                        </p>
                        <p className="fs-3 p-3">
                            You can do <b>races</b>, <b>tournaments</b>,{" "}
                            <b>view live runs</b>, get <b>advanced stats</b>{" "}
                            about your runs and splits, a cool{" "}
                            <b>user profile</b>, and much, much more. All for
                            free! This is only possible because the amazing
                            people supporting us on Patreon.
                        </p>
                        <p className="fs-3 p-3">
                            If you want to make sure our cool little site will
                            continue existing, and to also have a recap for
                            2025, please consider supporting us. You will gain
                            some cool perks!
                        </p>
                        <p className="fs-3 p-3">
                            Please click this button to check out what you can
                            do to support!
                        </p>
                        <p>
                            <Link href="/patron">
                                <Button
                                    variant="secondary"
                                    className="btn-lg me-sm-3 px-3 w-160p h-3r fw-medium"
                                >
                                    Support us! <PatreonBunnySvgWithoutLink />
                                </Button>
                            </Link>
                        </p>
                    </div>
                </SectionBody>
            </SectionWrapper>
        );
    },
);
WrappedOutroThanks.displayName = "WrappedOutroThanks";
